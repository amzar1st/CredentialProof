import {publicReceipt} from './public-receipt.mjs';
import fs from 'node:fs/promises';
import {createClient} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import {generatePrivateKey,privateKeyToAccount} from 'viem/accounts';
import {assertSuccessfulReceipt} from '../src/chain.js';
const deployment=JSON.parse(await fs.readFile(process.env.CP_DEPLOYMENT_PATH || 'docs/v2-deployment.json','utf8'));
const secret=JSON.parse(await fs.readFile(process.env.CP_TEST_KEY_PATH||'/tmp/credentialproof-v2-test-key.json','utf8'));
const owner=privateKeyToAccount(secret.privateKey),client=createClient({chain:studionet,account:owner});
const challengerPath='/tmp/credentialproof-v2-challenger.json';
let second;try{second=JSON.parse(await fs.readFile(challengerPath,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;second={privateKey:generatePrivateKey()};await fs.writeFile(challengerPath,JSON.stringify(second),{mode:0o600});}
const challenger=privateKeyToAccount(second.privateKey),counter=createClient({chain:studionet,account:challenger});
const proofPath=process.env.CP_PROOF_PATH || 'docs/v2-live-proof.json';
let proof;try{proof=JSON.parse(await fs.readFile(proofPath,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;proof={contract:deployment.address,network:'Studionet',origin:'Node SDK test accounts, not browser/MetaMask',owner:owner.address,challenger:challenger.address,transactions:[],cases:{},startedAt:new Date().toISOString()};}
if(proof.owner.toLowerCase()!==owner.address.toLowerCase())throw Error('Live-proof checkpoint belongs to a different owner wallet; choose a fresh checkpoint rather than replacing its signer.');
if(proof.contract!==deployment.address)throw Error('Live-proof checkpoint belongs to a different contract; choose a new CP_PROOF_PATH.');
const save=()=>fs.writeFile(proofPath,JSON.stringify(proof,null,2)+'\n');
const SOURCE='https://api.github.com/repos/amzar1st/CredentialProof/commits/76608d0c9b63637a7116154fd551583074a8f9c5';
const DOC='https://raw.githubusercontent.com/amzar1st/CredentialProof/76608d0c9b63637a7116154fd551583074a8f9c5/docs/live-verification.md';
const MISSING='https://raw.githubusercontent.com/amzar1st/CredentialProof/main/docs/does-not-exist-v2.txt';
const IDENTITY=process.env.CP_IDENTITY_URL || 'https://raw.githubusercontent.com/amzar1st/CredentialProof/main/docs/v21-wallet-attestation.txt';
const statement='The amzar1st GitHub account is recorded as the author of commit 76608d0c9b63637a7116154fd551583074a8f9c5, which added the CredentialProof submission logo.';
const read=async(id)=>JSON.parse(await client.readContract({address:deployment.address,functionName:'get_claim',args:[id],transactionHashVariant:'LATEST_FINAL'}));
async function tx(label,method,args,c=client){
 let row=proof.transactions.find(t=>t.label===label);
 let attempt=1;
 while(row && !row.success && row.receipt){
  try{assertSuccessfulReceipt(row.receipt);break;}catch{row.confirmedExecutionFailure=true;await save();}
  const retryLabel=label+':retry-'+(++attempt);
  row=proof.transactions.find(t=>t.label===retryLabel);
 }
 if(row?.success)return;
 if(attempt>1)label=label+':retry-'+attempt;
 if(!row){const hash=await c.writeContract({address:deployment.address,functionName:method,args,leaderOnly:false,value:0n});row={label,method,args,hash,submittedAt:new Date().toISOString(),signer:c.account.address};proof.transactions.push(row);await save();console.log('Submitted',label,hash);}
 const receipt=await c.waitForTransactionReceipt({hash:row.hash,status:'FINALIZED',interval:3000,retries:160});
 row.receipt=publicReceipt(receipt);await save();assertSuccessfulReceipt(receipt);row.success=true;row.finalizedAt=new Date().toISOString();await save();console.log('Finalized',label);
}
async function waitUntil(timestamp){while(Date.now()/1000<timestamp){await new Promise(r=>setTimeout(r,1000));}}
async function setup(id,title,statements,url){
 await tx(id+':claim','submit_claim',[id,title,title,JSON.stringify(statements)]);
 await tx(id+':evidence','attach_evidence',[id,url,'','Complete source, account attribution only']);
 await tx(id+':request','request_verification',[id]);await tx(id+':review','validator_review',[id]);
 const c=await read(id);proof.cases[id]=c;await save();return c;
}
await client.request({method:'sim_fundAccount',params:[challenger.address,1e20]});
await tx('profile','create_profile',['Amzar account attribution demo','amzar1st',IDENTITY]);
const prefix=process.env.CP_CASE_PREFIX || 'cp-v21';
const ids={partial:prefix+'-partial-001',challenge:prefix+'-rebuttal-001',recovery:prefix+'-recovery-001',unsupported:prefix+'-authorship-001'};
const scenarios=new Set((process.env.CP_SCENARIOS || 'partial,challenge,recovery,unsupported').split(','));
if(scenarios.has('partial')){
let partial=await setup(ids.partial,'Narrow account contribution, unsupported leadership',[statement,'The account holder personally led all development of the GenLayer protocol.'],SOURCE);
await waitUntil(partial.challenge_deadline);await tx('partial:finalize','finalize',[ids.partial]);
partial=await read(ids.partial);proof.cases[ids.partial]=partial;await save();
if(partial.result.verdict!=='PARTIALLY_VERIFIED'||partial.credential?.scope.length!==1)throw Error('Partial live review did not match expected evidence; inspect proof without claiming success.');
}
if(scenarios.has('challenge')){
let dispute=await setup(ids.challenge,'Adversarial account-attribution challenge',[statement],SOURCE);
if(dispute.result.verdict!=='VERIFIED')throw Error('Initial attribution verification did not succeed');
await tx('challenge:submit','challenge_claim',[ids.challenge,DOC,'','The earlier documentation disclaims personal authorship. The account contribution claim may therefore be unsupported.'],counter);
await tx('challenge:respond','respond_to_challenge',[ids.challenge,SOURCE,'','This complete canonical commit lists amzar1st as its GitHub author. The claim is limited to that account record, not personal authorship, leadership or accreditation.']);
dispute=await read(ids.challenge);await waitUntil(dispute.response_deadline);await tx('challenge:review','review_challenges',[ids.challenge]);await tx('challenge:finalize','finalize',[ids.challenge]);
dispute=await read(ids.challenge);proof.cases[ids.challenge]=dispute;await save();
if(dispute.status!=='ISSUED'||dispute.responses.length!==1)throw Error('Adversarial live review did not establish the expected supported outcome.');
}
if(scenarios.has('recovery')){
let recovered=await setup(ids.recovery,'Recovery from unavailable source',[statement],MISSING);
await waitUntil(recovered.challenge_deadline);await tx('recovery:reject','finalize',[ids.recovery]);
await tx('recovery:retry','retry_claim',[ids.recovery,JSON.stringify([{url:SOURCE,sha256:'',note:'Recovered complete authoritative commit record'}])]);
await tx('recovery:request','request_verification',[ids.recovery]);await tx('recovery:review','validator_review',[ids.recovery]);
recovered=await read(ids.recovery);
if(recovered.challenges.length){await tx('recovery:respond','respond_to_challenge',[ids.recovery,SOURCE,'','The original unavailable source is preserved. This canonical account-attributed commit supplies the missing contribution record.']);recovered=await read(ids.recovery);await waitUntil(recovered.response_deadline);await tx('recovery:challenges','review_challenges',[ids.recovery]);}
await waitUntil(recovered.challenge_deadline);await tx('recovery:finalize','finalize',[ids.recovery]);
recovered=await read(ids.recovery);proof.cases[ids.recovery]=recovered;await save();
if(recovered.status!=='ISSUED'||recovered.history.length!==1)throw Error('Recovery workflow did not issue credential');
}
if(scenarios.has('unsupported')){
let unsupported=await setup(ids.unsupported,'Unsupported personal authorship',['The amzar1st account holder personally authored every line of the GenLayer protocol implementation and led its engineering team.'],DOC);
await waitUntil(unsupported.challenge_deadline);await tx('unsupported:finalize','finalize',[ids.unsupported]);
unsupported=await read(ids.unsupported);proof.cases[ids.unsupported]=unsupported;await save();
if(unsupported.status!=='REJECTED')throw Error('Unsupported authorship unexpectedly issued; inspect contract');
}
const revokeId=scenarios.has('challenge')?ids.challenge:scenarios.has('recovery')?ids.recovery:null;
if(revokeId){proof.beforeRevocation=await read(revokeId);await save();await tx('credential:revoke','revoke_credential',[revokeId]);proof.cases[revokeId]=await read(revokeId);if(!proof.cases[revokeId].revoked)throw Error('Revocation not reflected in finalized state');}
proof.profile=JSON.parse(await client.readContract({address:deployment.address,functionName:'get_profile',args:[owner.address],transactionHashVariant:'LATEST_FINAL'}));
proof.completedAt=new Date().toISOString();await save();proof.scenarios=[...scenarios];await save();console.log('Selected SDK live scenarios verified:',[...scenarios].join(','),'. Browser-originated verification remains separate.');
