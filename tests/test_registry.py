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
SHA = 'a' * 40
SOURCE = 'https://api.github.com/repos/alice/project/commits/' + SHA
COMMIT = json.dumps({'sha': SHA, 'author': {'login': 'alice'}, 'commit': {'message': 'Alice authored the wallet integration commit.'}})
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
        vm.mock_web(SOURCE, {'status': 200, 'body': COMMIT})
        vm.mock_web(OTHER, {'status': 200, 'body': 'This commit belongs to Alice.'})
        yield c, vm

def reset_sources(c, vm, body=COMMIT, status=200):
    profile = json.loads(c.get_profile('0x' + bytes(vm.sender).hex()))
    vm.clear_mocks()
    vm.mock_web(PROOF, {'status': 200, 'body': profile['identity_token']})
    vm.mock_web(SOURCE, {'status': status, 'body': body})
    vm.mock_web(OTHER, {'status': 200, 'body': 'This commit belongs to Alice.'})

def claim(c, claim_id='one', parts=None):
    c.submit_claim(claim_id, 'Wallet integration', 'Python', json.dumps(parts or ['Alice authored the wallet integration.']))
    c.attach_evidence(claim_id, SOURCE, '', 'Public source')
    c.request_verification(claim_id)

def model(vm, supported=None, contradicted=None, citations=None, groundings=None, valid=None):
    supported = [True] if supported is None else supported
    citations = [[0] for _ in supported] if citations is None else citations
    vm.mock_llm('You verify professional', json.dumps({'supported': supported,
        'contradicted': contradicted or [False] * len(supported),
        'citations': citations, 'groundings': groundings if groundings is not None else [[{'source': x, 'quote': 'Alice authored the wallet integration commit.'} for x in ids] for ids in citations], 'reasoning': 'The fetched source supports this attribution.'}))
    vm.mock_llm('Check statement evidence', json.dumps({'valid': [True] * len(supported) if valid is None else valid}))

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
        vm.mock_web(SOURCE, {'status': 200, 'body': COMMIT})
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
    with vm.expect_revert('response window'): c.review_challenges('one')
    warp(vm, '2026-10-03T00:04:00Z')
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
        with vm.expect_revert('One challenge'): c.challenge_claim('one', OTHER + '2', '', 'Contradictory public attribution.')
    assert len(result(c)['evidence']) == 6 and len(result(c)['challenges']) == 1

def test_invalid_counter_evidence_cannot_force_rejection(registry):
    c, vm = registry
    claim(c); model(vm); c.validator_review('one')
    with vm.prank(create_address('bob')): c.challenge_claim('one', OTHER, '0' * 64, 'Malicious commitment to block credential.')
    warp(vm, '2026-10-03T00:04:00Z'); c.review_challenges('one'); c.finalize('one')
    assert result(c)['status'] == 'ISSUED'
    assert result(c)['result']['sources'][1]['usable'] is False

def test_validator_independently_rejects_different_decision(registry):
    c, vm = registry
    claim(c); model(vm); c.validator_review('one')
    assert vm.run_validator() is True
    p = json.loads(c.get_profile('0x' + bytes(vm.sender).hex()))
    vm.clear_mocks(); vm.mock_web(PROOF, {'status': 200, 'body': p['identity_token']})
    vm.mock_web(SOURCE, {'status': 200, 'body': COMMIT})
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
    with vm.expect_revert('Identical active'): c.submit_claim('two', 'Different title', 'Python', '["Alice authored the wallet integration."]')
    with vm.expect_revert('immutable'): c.create_profile('Other', 'bob', PROOF)

def test_conflict_rejects_and_page_is_bounded(registry):
    c, vm = registry
    claim(c); model(vm, [False], [True]); c.validator_review('one')
    warp(vm, '2026-10-03T00:02:00Z'); c.finalize('one')
    assert result(c)['status'] == 'REJECTED' and result(c)['result']['verdict'] == 'EVIDENCE_CONFLICT'
    assert json.loads(c.list_claims(0, 25))['total'] == 1
    with vm.expect_revert('Invalid page'): c.list_claims(0, 100)

def test_adversarial_challenge_rebuttal_preserves_record(registry):
    c, vm = registry
    claim(c); model(vm); c.validator_review('one')
    initial = result(c)['result']
    with vm.prank(create_address('bob')): c.challenge_claim('one', OTHER, '', 'A misleading attribution allegation.')
    with vm.prank(create_address('bob')):
        with vm.expect_revert('owner only'): c.respond_to_challenge('one', SOURCE, '', 'The commit record clarifies authorship.')
    warp(vm, '2026-10-03T00:03:00Z')
    c.respond_to_challenge('one', SOURCE, '', 'The original complete commit record clarifies the misleading allegation.')
    with vm.expect_revert('response window'): c.review_challenges('one')
    warp(vm, '2026-10-03T00:04:00Z'); c.review_challenges('one'); c.finalize('one')
    record = result(c)
    assert record['status'] == 'ISSUED'
    assert record['initial_result'] == initial and len(record['review_history']) == 2
    assert len(record['evidence']) == 1 and len(record['responses']) == 1
    assert record['review_history'][1]['responses'][0]['note'].startswith('The original')

@pytest.mark.parametrize('failure', ['fetch', 'model', 'timeout', 'cancel'])
def test_recovery_keeps_failed_attempt_and_prevents_active_duplicates(registry, failure):
    c, vm = registry
    claim(c)
    if failure == 'cancel': c.cancel_claim('one')
    elif failure == 'timeout':
        warp(vm, '2026-10-05T00:00:00Z'); c.resolve_timeout('one')
    else:
        if failure == 'fetch': reset_sources(c, vm, 'temporary outage', 404)
        model(vm, citations=[[99]] if failure == 'model' else None)
        c.validator_review('one')
        warp(vm, '2026-10-03T00:02:00Z'); c.finalize('one')
        assert result(c)['status'] == 'REJECTED'
    old = result(c)
    reset_sources(c, vm)
    c.retry_claim('one', json.dumps([{'url': SOURCE, 'sha256': '', 'note': 'Recovered source'}]))
    assert result(c)['history'][0]['evidence'] == old['evidence']
    assert result(c)['history'][0]['result'] == old['result']
    with vm.expect_revert('Identical active'): c.submit_claim('two', 'Duplicate', 'Python', json.dumps(old['statements']))
    c.request_verification('one'); model(vm); c.validator_review('one')
    warp(vm, '2026-10-05T00:02:00Z'); c.finalize('one')
    assert result(c)['status'] == 'ISSUED' and result(c)['attempt'] == 2
    with vm.expect_revert('unsuccessful'): c.retry_claim('one', '[]')


def test_controlled_resubmission_releases_terminal_fingerprint(registry):
    c, vm = registry
    claim(c); c.cancel_claim('one')
    c.submit_claim('two', 'New attempt', 'Python', '["Alice authored the wallet integration."]')
    with vm.expect_revert('replacement claim'): c.retry_claim('one', json.dumps([{'url': SOURCE, 'sha256': '', 'note': ''}]))
    assert result(c)['status'] == 'CANCELLED'


def test_retries_are_bounded_and_revoked_credentials_cannot_reset(registry):
    c, vm = registry
    claim(c); c.cancel_claim('one')
    payload = json.dumps([{'url': SOURCE, 'sha256': '', 'note': ''}])
    for _ in range(2): c.retry_claim('one', payload); c.cancel_claim('one')
    with vm.expect_revert('Maximum three'): c.retry_claim('one', payload)

@pytest.mark.parametrize('kind', ['invented_quote', 'wrong_author', 'namespace_only', 'unsupported_entailment', 'unmerged_pr'])
def test_unsupported_authorship_cannot_issue_even_with_positive_model(registry, kind):
    c, vm = registry
    claim(c)
    if kind == 'wrong_author': reset_sources(c, vm, COMMIT.replace('"alice"', '"bob"'))
    if kind == 'namespace_only': reset_sources(c, vm, 'Alice owns this repository. Alice authored the wallet integration commit.')
    if kind == 'unmerged_pr':
        # A positive model cannot turn a README or arbitrary API assertion into PR authorship.
        reset_sources(c, vm, json.dumps({'user': {'login': 'alice'}, 'number': 1, 'merged_at': None, 'title': 'Alice authored the wallet integration commit.'}))
    model(vm, groundings=[[{'source': 0, 'quote': 'An entirely fabricated quotation.'}]] if kind == 'invented_quote' else None,
          valid=[False] if kind == 'unsupported_entailment' else None)
    c.validator_review('one')
    assert result(c)['result']['verdict'] == 'INSUFFICIENT_EVIDENCE'


def test_full_source_limit_prevents_prefix_only_positive(registry):
    c, vm = registry
    claim(c)
    reset_sources(c, vm, COMMIT + ' ' * 18000 + 'Bob, not Alice, authored this contribution.')
    model(vm); c.validator_review('one')
    assert result(c)['result']['verdict'] == 'INSUFFICIENT_EVIDENCE'
    assert not result(c)['result']['sources'][0]['usable']


def test_fifth_challenger_is_not_blocked_and_every_batch_has_rebuttal_window(registry):
    c, vm = registry
    claim(c); model(vm); c.validator_review('one')
    for i in range(5):
        url = OTHER + str(i)
        vm.mock_web(url, {'status': 200, 'body': 'Challenge record number ' + str(i)})
        with vm.prank(create_address('challenger' + str(i))): c.challenge_claim('one', url, '', 'Distinct attribution allegation ' + str(i))
    assert len(result(c)['challenges']) == 5
    warp(vm, '2026-10-03T00:04:00Z'); c.review_challenges('one')
    assert result(c)['challenge_cursor'] == 4 and result(c)['status'] == 'PROVISIONAL'
    with vm.expect_revert('Review challenges'): c.finalize('one')
    with vm.expect_revert('response window'): c.review_challenges('one')
    c.respond_to_challenge('one', SOURCE, '', 'The fifth allegation also needs this complete attribution record.')
    warp(vm, '2026-10-03T00:06:00Z'); c.review_challenges('one'); c.finalize('one')
    assert result(c)['challenge_cursor'] == 5 and len(result(c)['review_history']) == 3


def test_duplicate_allegation_cannot_consume_queue_entries(registry):
    c, vm = registry
    claim(c); model(vm); c.validator_review('one')
    with vm.prank(create_address('bob')): c.challenge_claim('one', OTHER, '', 'Same allegation repeated by Sybils.')
    with vm.prank(create_address('carol')):
        with vm.expect_revert('Duplicate allegation'): c.challenge_claim('one', OTHER + '2', '', 'Same allegation repeated by Sybils.')


def test_paraphrases_and_skill_changes_do_not_inflate_reputation(registry):
    c, vm = registry
    claim(c); model(vm); c.validator_review('one')
    warp(vm, '2026-10-03T00:02:00Z'); c.finalize('one')
    c.submit_claim('two', 'Paraphrased contribution', 'JavaScript', '["Alice contributed the wallet integration commit."]')
    c.attach_evidence('two', SOURCE, '', 'Same underlying work'); c.request_verification('two'); model(vm); c.validator_review('two')
    warp(vm, '2026-10-03T00:04:00Z'); c.finalize('two')
    p = json.loads(c.get_profile('0x' + bytes(vm.sender).hex()))
    assert len(p['credentials']) == 2 and p['reputation'] == {'verified': 1, 'partial': 0}
    c.revoke_credential('one')
    assert json.loads(c.get_profile('0x' + bytes(vm.sender).hex()))['reputation']['verified'] == 1
    c.revoke_credential('two')
    assert json.loads(c.get_profile('0x' + bytes(vm.sender).hex()))['reputation']['verified'] == 0

@pytest.mark.parametrize('merged', [True, False])
def test_canonical_pr_requires_merger_and_attributed_account(registry, merged):
    c, vm = registry
    url='https://api.github.com/repos/alice/project/pulls/7'
    c.submit_claim('one','Merged contribution','Python','["Alice authored the wallet integration."]')
    c.attach_evidence('one',url,'','Canonical pull request')
    c.request_verification('one')
    vm.mock_web(url,{'status':200,'body':json.dumps({'number':7,'user':{'login':'alice'},'merged_at':'2026-10-01T00:00:00Z' if merged else None,'title':'Alice authored the wallet integration commit.','body':''})})
    model(vm);c.validator_review('one')
    assert result(c)['result']['verdict']==('VERIFIED' if merged else 'INSUFFICIENT_EVIDENCE')


def test_response_deadline_and_reserved_capacity(registry):
    c,vm=registry
    claim(c);model(vm);c.validator_review('one')
    with vm.prank(create_address('bob')):c.challenge_claim('one',OTHER,'','This attribution requires clarification.')
    for i in range(6):c.respond_to_challenge('one',SOURCE+str(i),'','A distinct rebuttal record for this batch.')
    with vm.expect_revert('Six rebuttal'):c.respond_to_challenge('one',SOURCE+'extra','','Extra source should be blocked.')
    assert len(result(c)['evidence'])==1 and len(result(c)['responses'])==6
    warp(vm,'2026-10-03T00:04:00Z')
    with vm.expect_revert('response window closed'):c.respond_to_challenge('one',SOURCE+'late','','Too late to change the frozen record.')


def test_later_challenge_batch_cannot_erase_prior_disqualification(registry):
    c,vm=registry
    claim(c);model(vm);c.validator_review('one')
    for i in range(5):
        with vm.prank(create_address('counter'+str(i))):c.challenge_claim('one',OTHER+str(i),'','Distinct challenge allegation '+str(i))
    reset_sources(c,vm)
    model(vm,[False],[True])
    warp(vm,'2026-10-03T00:04:00Z');c.review_challenges('one')
    assert result(c)['result']['verdict']=='EVIDENCE_CONFLICT'
    reset_sources(c,vm);model(vm)
    warp(vm,'2026-10-03T00:06:00Z');c.review_challenges('one');c.finalize('one')
    assert result(c)['status']=='REJECTED'
    assert len(result(c)['review_history'])==3


def test_recovery_and_resubmission_cannot_erase_adversarial_sources(registry):
    c,vm=registry
    claim(c);model(vm);c.validator_review('one')
    with vm.prank(create_address('bob')):c.challenge_claim('one',OTHER,'','An important contrary attribution allegation.')
    warp(vm,'2026-10-05T00:00:00Z');c.resolve_timeout('one')
    replacement=json.dumps([{'url':SOURCE,'sha256':'','note':'Recovered source'}])
    c.retry_claim('one',replacement)
    assert result(c)['challenges'][0]['url']==OTHER
    assert result(c)['challenges'][0]['carried'] is True
    c.request_verification('one');model(vm);c.validator_review('one')
    c.respond_to_challenge('one',SOURCE,'','Recovered attribution addresses the retained allegation.')
    warp(vm,'2026-10-05T00:04:00Z')
    with vm.expect_revert('Review challenges'):c.finalize('one')
    c.review_challenges('one');c.finalize('one')
    assert result(c)['status']=='ISSUED'


def test_new_claim_id_keeps_mandatory_prior_context(registry):
    c,vm=registry
    claim(c);c.cancel_claim('one')
    c.submit_claim('two','Controlled replacement','Python','["Alice authored the wallet integration."]')
    new=json.loads(c.get_claim('two'))
    assert new['previous_claim']=='one'
    assert new['challenges'][0]['url']==SOURCE and new['challenges'][0]['carried']


def test_replacement_cannot_remove_challenge_commitment(registry):
    c,vm=registry
    claim(c);model(vm);c.validator_review('one')
    with vm.prank(create_address('bob')):
        c.challenge_claim('one',OTHER,'a'*64,'A pinned source contradicts the attribution.')
    warp(vm,'2026-10-05T00:00:00Z');c.resolve_timeout('one')
    c.retry_claim('one',json.dumps([{'url':OTHER,'sha256':'','note':'Unpinned replacement'}]))
    assert any(e['url']==OTHER and e['sha256']=='a'*64 and e['carried'] for e in result(c)['challenges'])
