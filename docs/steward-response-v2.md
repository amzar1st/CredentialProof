# CredentialProof v2 response to steward feedback

This file distinguishes implemented behavior, local tests, deployed contract evidence and remaining verification. The old registry and its proof are preserved; v2 has a new deployment and public frontend in this account.

| Request | V2 change | Evidence |
| --- | --- | --- |
| Fair claimant response | Separate response deadline, six reserved owner rebuttal sources per four-challenge batch; no early review; immutable originals and append-only history | `respond_to_challenge`, `review_challenges`; adversarial rebuttal, deadline and batch tests |
| Failed verification recovery | Owner retry with replacement evidence, three attempts per ID, archived failures; controlled terminal resubmission; active fingerprints protected | `retry_claim`, `submit_claim`; unavailable source, invalid model, cancelled and timeout recovery tests |
| Statement-level grounding | Literal quotes, fetched-source checks, canonical author/merged-PR metadata, full-source independent grounding assessment | `_evaluate`; invented quotation, wrong author, namespace-only and unsupported entailment tests |
| Source truncation | Reject oversized complete sources; never assess first 18,000 characters as full evidence | Full-source-limit regression |
| Challenge accessibility | Open queue instead of shared four-wallet cap; duplicate allegations/sources rejected; reviews bounded to four | Fifth challenger and subsequent rebuttal-window test; residual Sybil/backlog limit documented |
| Semantic reputation inflation | Count unique attributed repositories; same-work paraphrases and different skills count once | Paraphrase/skill and revocation tests; conservative repository metric documented |
| Public frontend | New site in this account, public audience, v2 contract configuration and all workflow methods | Published public app: https://credentialproof.tinymule33.chatgpt.site; anonymous HTTP 200, app HTML returned without sign-in |
| Expanded live evidence | Resumable SDK script covers partial, disputed/rebutted, recovered and unsupported cases plus revocation | `v2-live-proof.json`; only finalized successful scenarios should be claimed |
| Browser-originated transactions | Wallet provider/signing corrections, selected-account/network guards, receipt handling | Eight local frontend tests; actual browser/MetaMask transaction evidence remains unverified in this environment |

## Verification limits

There is no supported managed browser-control skill in this environment. The Sites preview instructions require that skill and prohibit substituting another browser path. No browser-originated MetaMask evidence is therefore claimed. SDK-originated finality is labelled as SDK proof, not interface proof. Reviewer acceptance is not represented as complete until the requested interface-originated journey is independently recorded.

Literal quotation validation and authenticated account metadata strengthen grounding, but the semantic assessment remains an AI consensus judgment. Issuer accreditation is outside the v2 credential scope until issuer/recipient authentication can be implemented. Open challenge queues improve admission but cannot fully prevent Sybil flooding. Reputation is a unique-repository count, conservatively collapsing multiple achievements in one project.

## First live-run observation

The first v2 deployment finalized correctly and fetched both the identity attestation and canonical commit. Its partial-credential review returned INSUFFICIENT_EVIDENCE and finalization rejected the claim. The unsuccessful evidence is retained in `v2-initial-live-proof.json`; no partial credential is claimed from that run. V2.0.1 adds explicit JSON response formatting and bounded stage diagnostics while retaining the same fail-closed checks. Final live outcomes are recorded separately.

## Confirmed validation

- 48 pinned-SDK behavioral tests passed for current v2.0.2 source; 45 covered the deployed v2.0.1 source.
- Eight frontend wallet/receipt tests passed.
- Production Vite build passed.
- GitHub Actions validation passed: https://github.com/amzar1st/CredentialProof/actions/runs/38532131175 (commit `29707cd45ea52e56a651f3d459e9aca3ccf46340`).
- V2.0.1 contract deployed with full consensus and finalized successfully.
- Public Site publication succeeded and its access setting is public.
- The live partial-credential case issued only the account-attributed logo-commit statement; the unsupported leadership statement was excluded.

## Resumed verification and pending deployment (2026-10-14)

The public Site remains on v2.0.1 at `0x7E812995198e8C4715EBb96D3F09dF8372f05d66`. Current contract source reports v2.0.2 and is **not deployed**. `deployed-contract-v201.py` preserves the exact deployed bytes with SHA-256 `71bc622cf7244ed9686902d2235de375cbe7ab8d6307cdaf4d620b6f2bb74e93`.

V2.0.2 prevents retry/resubmission from dropping prior adversarial sources: removed original/rebuttal evidence is carried into mandatory challenge batches, prior challenge hash commitments cannot be replaced with unpinned copies, and every batch has a response opportunity before review. Three new behavioral tests cover this carryover, controlled new-ID linking and preserved commitments. A test now exercises the recovery rebuttal explicitly instead of leaving it behind a disabled expression.

The live script now uses separate claim skills for distinct scenarios, supports separate deployment/proof/identity checkpoints, refuses a proof checkpoint for a different contract, retains failed transaction receipts, and resubmits only after a recorded execution failure. It handles inherited recovery challenge batches before finalization.

| SDK case on public v2.0.1 | Verified state | Finalization transaction |
| --- | --- | --- |
| Partial scope | ISSUED / PARTIALLY_VERIFIED, one supported statement | `0x70650daa0af09e3099f314dc3096853215e7d233579afadb5f406652210cdea2` |
| Adversarial challenge + rebuttal | ISSUED / VERIFIED, original and rebuttal sources retained | `0x1eedc8c83375e70259d178aecb9290a59077915ba8b4d6ea80c26942a74524b6` |
| Failed-source recovery | Not completed; submit_claim execution failed on an active duplicate | Failed transaction `0xe4fa96c04b5b4cf104c91c2be4e7b1ac7fbf4370d22e7934604d358d9fe0c8d2` |
| Unsupported personal authorship | Behavioral tests pass; live scenario not reached | None |
| Revocation | Behavioral tests pass; live scenario not reached | None |
| Browser-originated journey | Unverified | None |

Read-only LATEST_FINAL queries reconfirmed the first two issued records. No credentials for the recovery or unsupported-authorship case IDs were readable. Full SDK receipts and the failed execution remain in `v2-live-proof.json`.

Automatic approval review rejected the attempted new StudioNet deployment because it interpreted the continuation request as insufficient authorization for another irreversible contract deployment or possible wallet expenditure. No new deployment checkpoint or receipt was created. Further contract deployment and SDK writes await explicit authorization. The requested run uses the existing separately generated faucet-funded test accounts, not the user's wallet; browser-wallet signing still needs a supported browser/wallet environment.

Reviewer acceptance remains incomplete until the new source is deployed and the remaining SDK and browser cases are recorded. The public audience is confirmed by Sites; no private-to-public change is pending.
