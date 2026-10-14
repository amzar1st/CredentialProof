// Read-only receipt collection for transactions already submitted through Studio UI.
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createClient,abi} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import {publicReceipt} from './public-receipt.mjs';
import {assertSuccessfulReceipt} from '../src/chain.js';
const proofPath=process.env.CP_BROWSER_PROOF_PATH || 'docs/v202-browser-proof.json';
const proof=JSON.parse(await fs.readFile(proofPath,'utf8'));
const client=createClient({chain:studionet});
const browserAccounts=proof.browserAccounts || [proof.owner.toLowerCase(),'0x57c5530f96d8639bfdde047f505ca7248b8c65e5'];
const caseId=proof.caseId || 'cp-browser-v202-001';
const raw=await client.request({method:'sim_getTransactionsForAddress',params:[proof.contract]});
const rows=raw.filter(r=>browserAccounts.includes(r.from_address.toLowerCase())).sort((a,b)=>a.created_at.localeCompare(b.created_at));
proof.transactions=[];
for(const row of rows){
 const decoded=abi.calldata.decode(Buffer.from(row.data.calldata,'base64'));
 const data=decoded instanceof Map?Object.fromEntries(decoded):decoded;
 const receipt=await client.getTransaction({hash:row.hash});
 let success=false;try{assertSuccessfulReceipt(receipt);success=true;}catch{}
 proof.transactions.push({method:row.type===1?'deploy':data.method,args:data.args,hash:row.hash,signer:row.from_address,createdAt:row.created_at,receipt:publicReceipt(receipt),success});
 if(row.type===1){
  const code=Buffer.from(row.data.contract_code,'base64');
  const digest=createHash('sha256').update(code).digest('hex');
  if(digest!==proof.sourceSha256)throw Error('Browser deployment source digest mismatch');
  proof.deploymentTx=row.hash;
 }
}
proof.claim=JSON.parse(await client.readContract({address:proof.contract,functionName:'get_claim',args:[caseId],transactionHashVariant:'LATEST_FINAL'}));
proof.config=JSON.parse(await client.readContract({address:proof.contract,functionName:'get_config',args:[],transactionHashVariant:'LATEST_FINAL'}));
proof.profile=JSON.parse(await client.readContract({address:proof.contract,functionName:'get_profile',args:[proof.owner],transactionHashVariant:'LATEST_FINAL'}));
proof.studioShareUrl='https://studio.genlayer.com/?import-contract=0xB79e97C260C54d44d8D074Dc888AFC9d13BC87a5';
const required=['deploy','create_profile','submit_claim','attach_evidence','request_verification','validator_review','challenge_claim','respond_to_challenge','review_challenges','finalize','revoke_credential'];
proof.remainingMethods=required.filter(m=>!proof.transactions.some(t=>t.method===m&&t.success&&(m==='deploy'||m==='create_profile'&&t.signer.toLowerCase()===proof.owner.toLowerCase()||t.args?.[0]===caseId)));
proof.status=proof.remainingMethods.length===0 && proof.claim.revoked?'COMPLETE':'IN_PROGRESS';
proof.lastVerifiedAt=new Date().toISOString();
await fs.writeFile(proofPath,JSON.stringify(proof,(_,v)=>typeof v==='bigint'?v.toString():v,null,2)+'\n');
const deployment={...proof.config,network:'Studionet',chainId:61999,rpc:'https://studio.genlayer.com/api',address:proof.contract,sourceSha256:proof.sourceSha256,deploymentTx:proof.deploymentTx,deployer:proof.transactions.find(t=>t.method==='deploy')?.signer,origin:proof.origin,submittedAt:proof.transactions.find(t=>t.method==='deploy')?.createdAt,finalizedVerifiedAt:proof.lastVerifiedAt,finalityStatus:'FINALIZED',studioShareUrl:proof.studioShareUrl};
await fs.writeFile('docs/v202-browser-deployment.json',JSON.stringify(deployment,null,2)+'\n');
console.log(JSON.stringify({status:proof.status,remainingMethods:proof.remainingMethods,claimStatus:proof.claim.status,verdict:proof.claim.result?.verdict,responseSecondsRemaining:proof.claim.response_deadline-Math.floor(Date.now()/1000),revoked:proof.claim.revoked}));
