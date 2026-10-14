# CredentialProof v2

GenLayer contribution credentials backed by complete public sources, account attribution, statement-level quotations and independent validator review.

## Current deployment

The public app still uses **v2.0.1**. The current `contracts/credential_proof.py` is **v2.0.2 source awaiting deployment**; its additional retained-dispute safeguards are not yet live. The exact deployed source is preserved in [deployed-contract-v201.py](docs/deployed-contract-v201.py), matching the SHA-256 in `v2-deployment.json`.

- Public review app: https://credentialproof.tinymule33.chatgpt.site
- GenLayer Studionet, chain ID **61999**, RPC `https://studio.genlayer.com/api`.
- V2 contract: `0x7E812995198e8C4715EBb96D3F09dF8372f05d66`.
- [Explorer](https://explorer-studio.genlayer.com/address/0x7E812995198e8C4715EBb96D3F09dF8372f05d66).
- [Finalized v2 deployment](https://explorer-studio.genlayer.com/tx/0xceabf8e9227ae47962fc8126f49c5bb1247bc74ebb810628da004f3db6e3749a).
- Demo challenge window: 60 seconds, followed by a separate 60-second claimant response window. Default deployments use one day for each; review timeout is one day.
- Deployment receipt, source hash and finalized configuration: [v2-deployment.json](docs/v2-deployment.json).

This is a **new contract and a new public Site**, not an in-place upgrade of the old registry. V1 records remain in the original contract; they are not migrated or counted in v2. Original October 3 proof is retained in `docs/live-verification.*` and explicitly concerns v1.

## Fair challenge procedure

1. Owner creates profile, submits 1–3 immutable statements, attaches up to six sources, and requests verification.
2. Initial review creates a provisional decision and starts a fixed challenge deadline.
3. Anyone except the claimant may submit a distinct allegation and source during that window. One challenge per wallet per attempt; repeated source URLs or identical normalized allegations are rejected. **There is no shared four-wallet admission cap.**
4. Every batch of up to four challenges has six claimant-only rebuttal source slots. Original evidence remains immutable. Rebuttals can be submitted before the separate response deadline, including after challenge submission has closed.
5. Challenge review is prohibited before that deadline. Review processes at most four challenges, appends the complete inputs and result to adjudication history, and opens a fresh response period for the next batch.
6. Finalization is blocked until all admitted challenges are reviewed. A later batch cannot undo a prior disqualification or restore a statement rejected by an earlier batch.
7. Unresolved initial or challenge reviews have a deterministic timeout to rejection. No reputation is awarded while disputed, provisional, rejected, cancelled or revoked.

The queue improves access without legal-identity checks. It does **not** establish one-human-one-wallet: Sybil wallets with distinct allegations can create a backlog. Each review is bounded, but storage and total work scale with the queue. A stalled review may time out to rejection and then use recovery. Do not interpret this design as complete resistance to denial of service.

## Recovery without erasing history

`retry_claim(claim_id, evidence_json)` allows the owner of a rejected or cancelled claim to supply 1–6 replacement sources and return to draft. Prior evidence, rebuttals, results and timing are archived on chain; review history is append-only. Statements and claim identity do not change. Maximum three attempts per claim. In the pending v2.0.2 source, removed originals and rebuttals become mandatory queued context, and prior challenge commitments remain mandatory even if their URL is supplied in the replacement set. Every inherited batch must be reviewed before issuance; a controlled new-ID resubmission links its predecessor and carries that context too.

An identical statement fingerprint is reserved only by an active claim or issued credential. A terminal unsuccessful claim may instead be resubmitted under a new ID; the old record remains visible. A newer resubmission prevents reopening the older claim. The profile has a 100-record limit. Issued and revoked credentials cannot reset themselves through retries.

Replacement format:

```json
[{"url":"https://api.github.com/repos/OWNER/REPO/commits/FULL_40_CHARACTER_SHA","sha256":"","note":"Complete recovered attribution record"}]
```

## Evidence grounding and attribution

- Exact approved HTTPS hosts only, without query strings, fragments, credentials, ports or percent escapes.
- Optional lowercase SHA-256 pins exact fetched bytes. UTF-8 sources must be nonempty, at most 250 KB and **at most 18,000 characters in full**. Oversized sources are unusable; no prefix is evaluated. Use a compact canonical record rather than a truncated excerpt.
- Every supported or contradicted statement needs exact literal quotations, with each citation grounded in its fetched source. Fabricated quotations, unfetched citations and invalid shapes fail closed.
- A positive contribution statement additionally requires a canonical GitHub API commit at a full SHA, with matching `sha` and `author.login`, or a merged PR whose number and `user.login` match the URL and profile. Namespace ownership, raw README assertions and arbitrary issuer logos are insufficient.
- A second, independent grounding assessment checks the complete sources, quotations, qualifiers and attribution against every material part of the statement. Every validator independently refetches sources and performs both assessments. Source metadata/fingerprints, identity-proof hash, verdict, support/contradiction flags and attributed work keys must agree.
- Quotation selection and reasoning may differ across validators; leader passages are checked locally but are not byte-for-byte consensus fields. Semantic entailment still relies on model judgment. An attributed account commit does not establish the personal identity or sole authorship of its operator.
- **V2 verifies contributions, not professional accreditation.** Claims of licensing, employment or issuer certification cannot be justified by account ownership or a commit record. Until a dedicated issuer-and-recipient authentication protocol exists, such claims must not be issued as professional certificates. Credly/Coursera sources may provide context but do not independently authenticate recipient identity in this version.
- Unavailable challenger sources are disclosed and cannot alone force rejection. A broken claimant source or claimant rebuttal commitment prevents positive issuance and can be recovered through an auditable retry.

## Reputation reflects underlying work

Credentials retain their exact supported scope. Profile reputation counts **unique attributed GitHub repositories**, not the number of credentials or submitted skills. Paraphrases, different skills and repeated commit/PR claims in the same repository do not add achievements; a verified repository takes precedence over partial records for that repository. Revocation removes a repository only when no other active credential supports it.

This is intentionally conservative: multiple distinct achievements in one repository still count once. Repository renames/forks and work copied into different repositories are not perfectly deduplicated; the count is a transparent repository metric, not an assertion of distinct lifetime professional achievements.

## Frontend and wallet

Public reads use `LATEST_FINAL` with visible RPC failures and no seeded records. Connect MetaMask or another injected EIP-1193 wallet on Studionet; the app switches/adds the network, checks the selected account and chain again before submitting, waits for `FINALIZED`, validates execution success and refreshes finalized state. All challenge, rebuttal, recovery, finalization and revocation methods are exposed. Claim inspection shows evidence, response deadlines, quotes and adjudication history.

Studio preparation remains available without browser-wallet signing. Publish the exact identity token in a raw file in your GitHub namespace:

`CredentialProof:<lowercase-contract>:<lowercase-wallet>:<lowercase-github-login>`

Private keys never ship in the app or repository. Automated demos use separately generated, faucet-funded test accounts outside the repository, not the user's wallet.

## Verification

```sh
npm ci
python3 -m venv .venv
.venv/bin/pip install -r requirements-test.txt
.venv/bin/pytest tests -q
npm run test:frontend
npm run build
```

The expanded suite has 48 behavioral cases against gltest's real pinned Python SDK v0.2.16, mocking only external sources/model answers, and eight frontend receipt/wallet tests. These checks are distinct from live consensus and browser verification.

- `scripts/deploy-v2.mjs`: resumable full-consensus deployment with source-hash check and finalized configuration.
- `scripts/live-v2.mjs`: resumable SDK demonstrations of partial issuance, adversarial challenge with claimant response, unavailable-source recovery, unsupported authorship rejection and revocation. Public checkpoints: `docs/v2-live-proof.json`. Only partial issuance and adversarial challenge/rebuttal are confirmed on the current deployment. Recovery claim registration failed execution because it duplicated an active fingerprint; recovery, unsupported-authorship rejection and revocation are not yet established live.
- [Steward response and verification limits](docs/steward-response-v2.md).

Scripts use fixed case IDs and checkpoint receipts. Keep local test-key files until a run completes; do not reuse the same deployment checkpoint for altered source or erase checkpoints to force duplicate transactions. Normal network finality may outlast a 60-second demo window; production review periods must be much longer.

This Studionet prototype has no independent security audit and does not provide legal professional accreditation. Development-chain state can reset. Public evidence can contain personal data: use appropriately redacted sources. Browser-originated end-to-end verification must be recorded separately from SDK tests; the existing v1 Studio demonstration does not prove the new browser flow.

The next deployment and SDK writes were blocked by automatic approval review in the resumed session. See [resume checklist](docs/resume-checklist.md) for the exact remaining actions and checkpoint configuration.
