# CredentialProof remaining verification

Public app: https://credentialproof.tinymule33.chatgpt.site

## Ready source

`contracts/credential_proof.py` v2.0.2 passes 48 behavioral tests. Eight frontend tests and the production build also pass. It adds mandatory prior-source carryover across retries and controlled resubmission. The public app and `src/config.js` still point to the finalized v2.0.1 contract; do not claim the new carryover behavior is live.

## Actions awaiting explicit deployment/test-write authorization

1. Deploy v2.0.2 with a fresh checkpoint, leaving all v2.0.1 files intact:

```sh
CP_DEPLOYMENT_PATH=docs/v202-deployment.json node scripts/deploy-v2.mjs
```

The generated test account remains in `/tmp/credentialproof-v2-test-key.json`; do not copy its private key into source, proof, or frontend files. It is funded through Studionet's simulation faucet.

2. After successful deployment finality, create and commit `docs/v202-wallet-attestation.txt` with `CredentialProof:<new-contract-lowercase>:<test-owner-lowercase>:amzar1st` on its own line. This publishes only the public identity token. Do not overwrite the older v21 attestation used by issued credentials.

3. Run all fresh SDK scenarios with separate checkpoint and case IDs:

```sh
CP_DEPLOYMENT_PATH=docs/v202-deployment.json CP_PROOF_PATH=docs/v202-live-proof.json CP_CASE_PREFIX=cp-v202 CP_IDENTITY_URL=https://raw.githubusercontent.com/amzar1st/CredentialProof/main/docs/v202-wallet-attestation.txt node scripts/live-v2.mjs
```

The script covers partial scope, adversarial rebuttal, unavailable-source recovery with preserved evidence, unsupported personal-authorship rejection, and revocation. It retains failed receipts and never treats finalized execution errors as success. Inspect each final record and do not claim success from a submitted or merely accepted transaction.

4. Update frontend deployment configuration and README to the finalized new address, retain all superseded proof, run frontend checks/build, push GitHub changes and publish a new version of the same public Site.

## Browser-originated evidence still required

Use a supported browser with an injected wallet and record successful finalized interface transactions for connection, profile/claim registration, evidence submission, review, challenge with a separate wallet, claimant response, challenge adjudication, finalization and revocation. SDK results are not browser evidence. The current managed environment has no supported browser-control skill for this wallet workflow.

## Current confirmed SDK evidence

`cp-v21-partial-001`: issued partial scope, unsupported leadership excluded.

`cp-v21-rebuttal-001`: issued verified scope after adversarial challenge and claimant response. It has not been revoked.

`cp-v21-recovery-001` registration failed due to an active duplicate; the failure receipt is retained. Recovery, unsupported rejection and revocation are unfinished live cases.
