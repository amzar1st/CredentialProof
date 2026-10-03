import json
from pathlib import Path
import pytest
from gltest.direct import VMContext, deploy_contract, create_address

def warp(vm, timestamp):
    vm.warp(timestamp)
    import sys
    if 'genlayer.gl' in sys.modules:
        sys.modules['genlayer.gl'].message_raw['datetime'] = timestamp

PROOF = 'https://raw.githubusercontent.com/alice/proofs/main/wallet.txt'
SOURCE = 'https://raw.githubusercontent.com/alice/project/main/README.md'
OTHER = 'https://api.github.com/repos/alice/project/commits/abc123'

@pytest.fixture
def registry():
    vm = VMContext()
    vm.sender = create_address('alice')
    warp(vm, '2026-10-03T00:00:00Z')
    with vm.activate():
        c = deploy_contract(Path('contracts/credential_proof.py'), vm, 120, sdk_version='v0.2.16')
        c.create_profile('Alice', 'alice', PROOF)
        p = json.loads(c.get_profile('0x' + bytes(vm.sender).hex()))
        vm.mock_web(PROOF, {'status': 200, 'body': p['identity_token'] + '\n'})
        vm.mock_web(SOURCE, {'status': 200, 'body': 'Alice authored the wallet integration commit.'})
        vm.mock_web(OTHER, {'status': 200, 'body': 'This commit belongs to Alice.'})
        yield c, vm

def claim(c, claim_id='one', parts=None):
    c.submit_claim(claim_id, 'Wallet integration', 'Python', json.dumps(parts or ['Alice authored the wallet integration.']))
    c.attach_evidence(claim_id, SOURCE, '', 'Public source')
    c.request_verification(claim_id)

def model(vm, supported=None, contradicted=None, citations=None):
    supported = supported or [True]
    vm.mock_llm('You verify professional', json.dumps({'supported': supported,
        'contradicted': contradicted or [False] * len(supported),
        'citations': citations or [[0] for _ in supported], 'reasoning': 'The fetched source supports this attribution.'}))

def result(c):
    return json.loads(c.get_claim('one'))

def test_full_issuance_and_reputation(registry):
    c, vm = registry
    claim(c); model(vm); c.validator_review('one')
    assert result(c)['status'] == 'PROVISIONAL'
    assert json.loads(c.get_profile('0x' + bytes(vm.sender).hex()))['reputation']['verified'] == 0
    warp(vm, '2026-10-03T00:02:00Z'); c.finalize('one')
    assert result(c)['credential']['scope'] == ['Alice authored the wallet integration.']
    assert json.loads(c.get_profile('0x' + bytes(vm.sender).hex()))['reputation']['verified'] == 1
    with vm.expect_revert('not finalizable'): c.finalize('one')

def test_partial_scope_never_certifies_unsupported_statement(registry):
    c, vm = registry
    claim(c, parts=['Alice authored the wallet integration.', 'Alice was the lead developer of the entire project.'])
    model(vm, [True, False], citations=[[0], []]); c.validator_review('one')
    warp(vm, '2026-10-03T00:02:00Z'); c.finalize('one')
    assert result(c)['credential']['verdict'] == 'PARTIALLY_VERIFIED'
    assert len(result(c)['credential']['scope']) == 1
    assert json.loads(c.get_profile('0x' + bytes(vm.sender).hex()))['reputation'] == {'verified': 0, 'partial': 1}

@pytest.mark.parametrize('kind', ['missing_proof', 'wrong_proof', 'missing_source', 'wrong_hash'])
def test_bad_evidence_never_issues(registry, kind):
    c, vm = registry
    c.submit_claim('one', 'Wallet integration', 'Python', '["Alice authored the wallet integration."]')
    c.attach_evidence('one', SOURCE, '0' * 64 if kind == 'wrong_hash' else '', 'Public source')
    c.request_verification('one')
    if kind in ('missing_proof', 'wrong_proof'):
        vm.clear_mocks()
        vm.mock_web(PROOF, {'status': 404 if kind == 'missing_proof' else 200, 'body': 'another wallet'})
        vm.mock_web(SOURCE, {'status': 200, 'body': 'Alice authored the wallet integration.'})
    elif kind == 'missing_source':
        p = json.loads(c.get_profile('0x' + bytes(vm.sender).hex()))
        vm.clear_mocks(); vm.mock_web(PROOF, {'status': 200, 'body': p['identity_token']})
        vm.mock_web(SOURCE, {'status': 404, 'body': 'not found'})
    model(vm); c.validator_review('one')
    assert result(c)['result']['verdict'] == 'INSUFFICIENT_EVIDENCE'
    warp(vm, '2026-10-03T00:02:00Z'); c.finalize('one')
    assert result(c)['status'] == 'REJECTED' and result(c)['credential'] is None

def test_owner_authorization_and_locked_evidence(registry):
    c, vm = registry
    claim(c)
    with vm.prank(create_address('bob')):
        with vm.expect_revert('owner only'): c.cancel_claim('one')
        with vm.expect_revert('owner only'): c.attach_evidence('one', OTHER, '', '')
    with vm.expect_revert('locked'): c.attach_evidence('one', OTHER, '', '')

@pytest.mark.parametrize('url', ['http://github.com/a', 'https://github.com.evil.test/a',
    'https://github.com@evil.test/a', 'https://github.com:443/a', 'https://github.com/a?redirect=x',
    'https://github.com/a#x', 'https://127.0.0.1/a', 'https://github.com/%2e%2e/a'])
def test_source_url_hardening(registry, url):
    c, vm = registry
    c.submit_claim('one', 'Title', 'Python', '["A precise contribution claim."]')
    with vm.expect_revert(): c.attach_evidence('one', url, '', '')

def test_challenge_deadline_and_no_premature_finalization(registry):
    c, vm = registry
    claim(c); model(vm); c.validator_review('one')
    with vm.expect_revert('still open'): c.finalize('one')
    with vm.expect_revert('own claim'): c.challenge_claim('one', OTHER, '', 'This is contradictory evidence.')
    with vm.prank(create_address('bob')): c.challenge_claim('one', OTHER, '', 'This is contradictory evidence.')
    with vm.expect_revert('window closes'): c.review_challenges('one')
    warp(vm, '2026-10-03T00:02:00Z')
    with vm.prank(create_address('carol')):
        with vm.expect_revert('closed'): c.challenge_claim('one', OTHER, '', 'This is contradictory evidence.')
    with vm.expect_revert('Review challenges'): c.finalize('one')
    c.review_challenges('one'); c.finalize('one')
    assert result(c)['status'] == 'ISSUED' and result(c)['reviews'] == 2

def test_capacity_is_reserved_and_one_slot_per_challenger(registry):
    c, vm = registry
    c.submit_claim('one', 'Title', 'Python', '["A precise contribution claim."]')
    for i in range(6): c.attach_evidence('one', SOURCE + str(i), '', '')
    with vm.expect_revert('capacity'): c.attach_evidence('one', OTHER, '', '')
    c.request_verification('one')
    for i in range(6): vm.mock_web(SOURCE + str(i), {'status': 200, 'body': 'Source'})
    model(vm); c.validator_review('one')
    with vm.prank(create_address('bob')):
        c.challenge_claim('one', OTHER, '', 'Contradictory public attribution.')
        with vm.expect_revert('One slot'): c.challenge_claim('one', OTHER + '2', '', 'Contradictory public attribution.')
    assert len(result(c)['evidence']) == 6 and len(result(c)['challenges']) == 1

def test_invalid_counter_evidence_cannot_force_rejection(registry):
    c, vm = registry
    claim(c); model(vm); c.validator_review('one')
    with vm.prank(create_address('bob')): c.challenge_claim('one', OTHER, '0' * 64, 'Malicious commitment to block credential.')
    warp(vm, '2026-10-03T00:02:00Z'); c.review_challenges('one'); c.finalize('one')
    assert result(c)['status'] == 'ISSUED'
    assert result(c)['result']['sources'][1]['usable'] is False

def test_validator_independently_rejects_different_decision(registry):
    c, vm = registry
    claim(c); model(vm); c.validator_review('one')
    assert vm.run_validator() is True
    p = json.loads(c.get_profile('0x' + bytes(vm.sender).hex()))
    vm.clear_mocks(); vm.mock_web(PROOF, {'status': 200, 'body': p['identity_token']})
    vm.mock_web(SOURCE, {'status': 200, 'body': 'Alice authored the wallet integration commit.'})
    model(vm, [False], citations=[[]])
    assert vm.run_validator() is False

def test_unfetched_citation_is_fail_closed(registry):
    c, vm = registry
    claim(c); model(vm, citations=[[99]]); c.validator_review('one')
    assert result(c)['result']['verdict'] == 'INSUFFICIENT_EVIDENCE'

@pytest.mark.parametrize('challenged', [False, True])
def test_review_timeout_escape(registry, challenged):
    c, vm = registry
    claim(c)
    if challenged:
        model(vm); c.validator_review('one')
        with vm.prank(create_address('bob')): c.challenge_claim('one', OTHER, '', 'Contradictory public attribution.')
    with vm.expect_revert('No unresolved'): c.resolve_timeout('one')
    warp(vm, '2026-10-05T00:00:00Z'); c.resolve_timeout('one')
    assert result(c)['status'] == 'REJECTED' and result(c)['credential'] is None

def test_revocation_removes_reputation_and_owner_only(registry):
    c, vm = registry
    claim(c); model(vm); c.validator_review('one')
    warp(vm, '2026-10-03T00:02:00Z'); c.finalize('one')
    with vm.prank(create_address('bob')):
        with vm.expect_revert('owner only'): c.revoke_credential('one')
    c.revoke_credential('one')
    assert json.loads(c.get_profile('0x' + bytes(vm.sender).hex()))['reputation']['verified'] == 0

def test_duplicate_claim_and_profile_identity_lock(registry):
    c, vm = registry
    claim(c)
    with vm.expect_revert('Identical'): c.submit_claim('two', 'Different title', 'Python', '["Alice authored the wallet integration."]')
    with vm.expect_revert('immutable'): c.create_profile('Other', 'bob', PROOF)

def test_conflict_rejects_and_page_is_bounded(registry):
    c, vm = registry
    claim(c); model(vm, [False], [True]); c.validator_review('one')
    warp(vm, '2026-10-03T00:02:00Z'); c.finalize('one')
    assert result(c)['status'] == 'REJECTED' and result(c)['result']['verdict'] == 'EVIDENCE_CONFLICT'
    assert json.loads(c.list_claims(0, 25))['total'] == 1
    with vm.expect_revert('Invalid page'): c.list_claims(0, 100)
