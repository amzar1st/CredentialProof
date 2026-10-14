# CredentialProof v2.0.2 finalized verification

The previously outstanding deployment, live recovery/rejection/revocation evidence, and complete browser-originated workflow are now verified. This records implementation and transaction evidence; steward acceptance remains the steward's decision.

## Public application and exact deployment

- Public app: https://credentialproof.tinymule33.chatgpt.site/
- Studio built-in wallet route: https://studio.genlayer.com/?import-contract=0xB79e97C260C54d44d8D074Dc888AFC9d13BC87a5
- Current registry: `0xB79e97C260C54d44d8D074Dc888AFC9d13BC87a5`, Studionet chain 61999.
- Version: **2.0.2**. Full consensus, finalized successful deployment: [receipt](https://explorer-studio.genlayer.com/tx/0x838209bde6d02677d8fc409cf7f6442d40e0734436f90d58374e649c2169a862).
- Exact source SHA-256: `bb5de3457d8a7d2b3d644b7cbb38f7ed4d8946877ef75e03317d852f5edd6138`. The on-chain deployment bytes match `contracts/credential_proof.py`.
- Demonstration challenge and claimant-response windows: 300 seconds each; default constructor deployments use one day each. Review timeout is one day.

## Finalized cases on the current registry

| Requirement | Claim | Confirmed outcome | Evidence |
| --- | --- | --- | --- |
| Failed-source recovery | `cp-v202-live-recovery-001` | Initial INSUFFICIENT_EVIDENCE and rejection; replacement evidence, retry, retained failed source, claimant response, fresh review, then ISSUED / VERIFIED | [Full history and receipts](v202-recovery-live-proof.json) |
| Genuine partial credential | `cp-v202-live-partial-001` | ISSUED / PARTIALLY_VERIFIED; logo commit statement included, unsupported protocol-leadership statement excluded | [Scope and receipts](v202-partial-live-proof.json) |
| Unsupported personal authorship | `cp-browser-v202-authorship-001` | REJECTED / EVIDENCE_CONFLICT; no credential issued | [Browser rejection receipts](v202-authorship-rejection-proof.json) |
| Browser challenge + claimant rebuttal + revocation | `cp-browser-v202-002` | Full browser-wallet lifecycle; VERIFIED credential issued with one supported statement, then revoked by the same owner; owner verified reputation changed from 1 to 0 | [Full browser proof](v202-browser-resumed-proof.json) |

## Complete browser-originated lifecycle

The public frontend prepares the action with the exact contract, method and arguments and opens that registry directly in Studio. All transactions below were signed and submitted through GenLayer Studio's built-in browser wallets, using Normal (Full Consensus), with Simulation Mode disabled. Two browser wallets supplied the challenge and claimant rebuttal. RPC/SDK collection below is **read-only receipt verification**, not a substitute for browser signing.

Owner: `0xAb7a330C08E77933e9C86Bf6b4bB3fC5e496C0Cf`.

Challenger: `0xdb3FeC171067318C0B6a161471FEfD31c4Ce0D3f`.

| Browser operation | Evidence |
| --- | --- |
| `create_profile` | [Finalized successful transaction](https://explorer-studio.genlayer.com/tx/0x0c4a363a0f728b8d742fce843fd6b649884076e7907d96b04f0be560096e26d6) |
| `submit_claim` | [Finalized successful transaction](https://explorer-studio.genlayer.com/tx/0x0464a5660dbd8e9d80631caba3d85757b90c5c6552c55230752ef759043f0139) |
| `attach_evidence` | [Finalized successful transaction](https://explorer-studio.genlayer.com/tx/0x933cdd62db83f278e91821773064c25e176f46d21df3ac223ee0d6dcbc564943) |
| `request_verification` | [Finalized successful transaction](https://explorer-studio.genlayer.com/tx/0x11b45fd9cffca76e3c0a68d2d374e565770307f4f6ffa118e413855aef7e0d03) |
| `validator_review` | [Finalized successful transaction](https://explorer-studio.genlayer.com/tx/0x208d74dd0e817302a6a6f781a30cb6e2947284fff93a32715e918f0460806905) |
| `challenge_claim` | [Finalized successful transaction](https://explorer-studio.genlayer.com/tx/0xba86c6471bd7d1d1ce8e464744ae04d200c588d00084823329c801e057b77353) |
| `respond_to_challenge` | [Finalized successful transaction](https://explorer-studio.genlayer.com/tx/0x04d08490c01451e92895042221e99e4be8ab474b62510459db3968295c1f824b) |
| `review_challenges` | [Finalized successful transaction](https://explorer-studio.genlayer.com/tx/0xd87d2b833af2be68fdcb7a05f10926d2827f1bbf45935d519c158367113a982e) |
| `finalize` | [Finalized successful transaction](https://explorer-studio.genlayer.com/tx/0x9d50384bce9d705e55dc567e126d1d746aed920f1af172bbaf72eda78facd77b) |
| `revoke_credential` | [Finalized successful transaction](https://explorer-studio.genlayer.com/tx/0xc10c4600f738c870772e793c53dd859a480d15de663381329de8b9458c88fbe7) |

[Public interface snapshot](browser/completed-public-registry.md) and [revoked credential screenshot](browser/completed-revocation.jpg) show finalized registry state and the retained evidence, quotations and adjudication history. The app's public reads were tested without an account sign-in. Studio's built-in wallet is the browser route authorized for this demonstration; extension-wallet behavior has eight automated frontend tests.

## Validation

- 48 pinned-SDK contract behavioral tests pass.
- Eight frontend wallet/receipt tests pass.
- Production Vite build passes.
- Current source bytes match the browser-deployed contract bytes.
- All ten browser workflow operations have finalized successful execution receipts.
- Active repository reputation excludes the revoked credential; history and exact credential scope remain visible.

## Archived attempts and limits

The first v2.0.1 inconclusive review, the earlier duplicate-registration failure, and the v2.0.2 60-second challenge-window failure remain in their respective proof files. The 60-second deployment was unsuitable for variable consensus delays; the current registry uses 300-second demonstration windows. A session interruption expired earlier temporary keys: the first browser claim was finalized through public methods but remains unrevoked. The fresh, completely recorded owner-wallet case above proves actual revocation.

This is an account-attributed contribution registry. It does not authenticate professional accreditation, personal legal identity, sole human authorship or leadership. Literal quotations and full-source independent grounding strengthen evidence assessment, while semantic entailment remains a validator AI judgment. Oversized sources fail closed rather than being evaluated from a prefix. The open challenge queue removes the four-wallet admission cap, but distinct Sybil allegations can still create a backlog. Reputation counts unique attributed repositories within a profile, conservatively collapsing multiple achievements in one repository.
