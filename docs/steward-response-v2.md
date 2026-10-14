# CredentialProof response to steward feedback

The remediation source is deployed as v2.0.2, the frontend is public, and the requested disputed and unsuccessful verification cases have finalized transaction evidence. [Complete verification and transaction links](v202-final-verification.md).

| Steward concern | Implemented behavior | Evidence |
| --- | --- | --- |
| Claimant cannot answer challenges | Separate fixed response deadline; six owner rebuttal sources per four-challenge batch; review cannot execute early; immutable original evidence and append-only adjudication history | `respond_to_challenge`, `review_challenges`; browser case `cp-browser-v202-002`, two wallets, successful rebuttal and fresh adjudication |
| Failed reviews permanently lock duplicate identifiers | Owner retry with 1–6 replacement sources, three attempts per claim; preserved original evidence and prior outcomes; controlled terminal resubmission; active fingerprint protection | Live `cp-v202-live-recovery-001` recovered from unavailable-source rejection to VERIFIED issuance |
| Retry can discard contrary evidence | Mandatory carried-source review across retries and new-ID resubmission; old challenge commitments remain mandatory even if supplied as replacement sources | v2.0.2 deployed source; recovery carries original failed source; regression tests preserve adverse sources and hash pins |
| Citation indices do not prove authorship | Literal quotation checks, full-source independent entailment assessment, canonical commit author or merged-PR account attribution; namespace ownership alone is insufficient | Live rejected personal-authorship case; fabricated quotation, wrong-author, unmerged PR and unsupported-entailment tests |
| First 18,000 characters omit qualifications | Reject oversized complete sources; no prefix-only positive evaluation | Full-source-limit behavioral regression; fetched-source audit records |
| Four wallets block challengers | Open admission queue with duplicate allegation/source checks, one distinct allegation per wallet per attempt; bounded batches with fresh response windows | Fifth-challenger and later-batch tests; residual Sybil backlog documented |
| Paraphrases inflate reputation | Count unique attributed repositories, rather than credentials or skills; no active reputation from provisional, rejected, cancelled or revoked records | Same-work paraphrase/skill tests; actual browser revocation changes verified reputation from 1 to 0 |
| Frontend private and untestable | Public audience confirmed; current v2.0.2 registry reads; all workflow methods; direct Studio import route; wallet-specific identity token preparation; animated scroll-responsive illustration | Public app and finalized-state screenshot; eight frontend tests and production build |
| Expanded live and browser evidence | Finalized recovery, partial scope, unsupported rejection, challenge/rebuttal and complete browser issuance/revocation | [Final evidence matrix](v202-final-verification.md), per-operation receipts and browser snapshot |

## Verification boundary

The full browser-originated demonstration uses GenLayer Studio's built-in wallets, as authorized for this workflow. All writes in that complete case were sent through the browser interface with full consensus. Receipt collection is read-only. The public app's action preparation and direct registry link were exercised and its finalized records were inspected. Extension-wallet support is tested automatically, but this report does not claim a separate live MetaMask journey.

Issuer licensing or accreditation claims remain outside this contribution registry's scope and cannot be issued from account ownership or a commit. The contract does not establish a natural person's identity or sole authorship. Validator semantic judgment and residual Sybil backlog remain limitations. Repository-based reputation is conservative and is not a count of distinct lifetime achievements.

The original unsuccessful review and earlier interrupted demonstrations remain available. Only the cases explicitly marked complete in the final verification are claimed as successful evidence. The requested technical remediation is complete; acceptance remains the steward's review decision.
