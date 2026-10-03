# CredentialProof

Evidence-backed professional credentials verified through GenLayer AI consensus.

## Deployment

- Network: GenLayer Studionet, chain **61999**
- Contract: `0x95c18899305c705eF39d9ca2bF49405D4fbd6bD6`
- [Contract explorer](https://explorer-studio.genlayer.com/address/0x95c18899305c705eF39d9ca2bF49405D4fbd6bD6)
- [Finalized deployment](https://explorer-studio.genlayer.com/tx/0x29bc698b41cd260f6af6e126271fa3eb79ea5cf96db22650705d633143b82c50)
- RPC: `https://studio.genlayer.com/api`
- Deployed through Studio's built-in wallet; faucet funded with 10 test GEN. Full consensus, not leader-only.
- Demo challenge window: **120 seconds**. Constructor defaults to one day for other deployments. Review timeout: one day.
- Stored contract source matches `contracts/credential_proof.py` byte for byte.

- [Deployed app](https://credentialproof.amzar1st96.chatgpt.site) — currently owner-private.
- [Live verification evidence](docs/live-verification.md): finalized VERIFIED credential and all seven transaction receipts.

## What it does

Create an owner-bound profile, submit up to three specific contribution statements, attach public evidence, request validator review, challenge the provisional verdict, and finalize an immutable credential record. Partial credentials certify only supported statements. Rejected, cancelled, provisional and revoked records contribute no active reputation. Credentials are registry records, not transferable NFTs.

`create_profile → submit_claim → attach_evidence → request_verification → validator_review → challenge_claim (optional) → review_challenges (if challenged) → finalize → issue / reject`

Five verdicts: VERIFIED, PARTIALLY_VERIFIED, NOT_VERIFIED, EVIDENCE_CONFLICT, INSUFFICIENT_EVIDENCE.

## Identity and evidence rules

- Profiles freeze the GitHub login and public identity proof URL. Publish the exact token returned by `get_profile` as a separate line in a raw file in that login's namespace: `CredentialProof:<lowercase-contract>:<lowercase-wallet>:<lowercase-login>`.
- The attestation proves account control, not personal legal identity, employment status, accreditation, or authorship of all repository content.
- Claimant evidence locks on request. Six owner slots and four distinct challenger slots are separate; one slot per challenger. Identity/Sybil resistance beyond distinct wallets is not claimed.
- Exact approved HTTPS hosts only; query strings, fragments, ports, percent escapes, credentials and lookalike hosts are rejected. V1 supports GitHub, raw GitHub, GitHub API, GenLayer documentation, Credly and Coursera. Redirect destinations are not independently authenticated by this version; use canonical source URLs.
- Optional lowercase SHA-256 commitments cover fetched response bytes. A bad claimant commitment or unavailable claimant source prevents issuance. Invalid counter-evidence is recorded as unusable and cannot alone force rejection.
- Each validator independently fetches sources and reruns the LLM. Identity, statement support/contradiction decisions, verdict and fetched-byte hashes must agree. Leader reasoning is explanatory text, not a separate consensus-guaranteed field.
- Cited indices must belong to usable fetched pages. Positive and conflicting decisions need citations. Invalid model output fails closed.
- The contract enforces challenge deadlines from transaction time. Any wallet can perform review/finalize/timeout. Owner-only methods cannot be used by another address.
- Challenges freeze when their deadline closes, must be reviewed before issuance, and have a one-day deterministic timeout to rejection. An unreviewed initial request also times out to rejection.
- Claim owners may revoke their own credential; active reputation updates from finalized registry records.

## App

Public reads use **LATEST_FINAL**, never seeded fallbacks. Select a claim to inspect its exact scope, evidence hashes, validator reasoning and challenge deadlines. All write methods are available through a Studio preparation panel; no wallet connection is required for that route. Optional browser-wallet writes use `genlayer-js` 1.1.8, wait for FINALIZED, check GenVM SUCCESS, and then reread finalized state. No private key is included in the app or repository.

## Run and test

Requires Node.js 22+ and Python 3.12+.

```sh
npm ci
python3 -m pip install -r requirements-test.txt
npm test
npm run test:frontend
npm run dev
npm run build
```

Contract tests use **gltest's actual pinned GenLayer Python SDK v0.2.16**, calldata and storage implementations, with mocked external web/LLM inputs. They are behavioral tests, not live model quality benchmarks. The suite covers issuance, partial scope, malicious hashes, fetch failures, authority checks, deadline boundaries, reserved capacities, independent validator disagreement, unfetched citations, timeouts, duplicate prevention and revocation.

Studionet is a development environment and can reset. This project is a contribution-evidence registry and does not replace a professional licensing authority. The live demonstration issued `cp-credentialproof-demo-001` with a VERIFIED verdict. See [live verification](docs/live-verification.md). Challenges, rejection and partial issuance are covered by mocked behavioral tests; this live claim was unchallenged.
