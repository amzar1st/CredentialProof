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
| Public frontend | New site in this account, public audience, v2 contract configuration and all workflow methods | Sites deployment and final public URL to be confirmed |
| Expanded live evidence | Resumable SDK script covers partial, disputed/rebutted, recovered and unsupported cases plus revocation | `v2-live-proof.json`; only finalized successful scenarios should be claimed |
| Browser-originated transactions | Wallet provider/signing corrections, selected-account/network guards, receipt handling | Eight local frontend tests; actual browser/MetaMask transaction evidence remains unverified in this environment |

## Verification limits

There is no supported managed browser-control skill in this environment. The Sites preview instructions require that skill and prohibit substituting another browser path. No browser-originated MetaMask evidence is therefore claimed. SDK-originated finality is labelled as SDK proof, not interface proof. Reviewer acceptance is not represented as complete until the requested interface-originated journey is independently recorded.

Literal quotation validation and authenticated account metadata strengthen grounding, but the semantic assessment remains an AI consensus judgment. Issuer accreditation is outside the v2 credential scope until issuer/recipient authentication can be implemented. Open challenge queues improve admission but cannot fully prevent Sybil flooding. Reputation is a unique-repository count, conservatively collapsing multiple achievements in one project.
