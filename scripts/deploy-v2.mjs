import {publicReceipt} from './public-receipt.mjs';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createClient} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import {generatePrivateKey, privateKeyToAccount} from 'viem/accounts';
import {assertSuccessfulReceipt} from '../src/chain.js';
const keyPath=process.env.CP_TEST_KEY_PATH || '/tmp/credentialproof-v2-test-key.json';
let secret;
try{secret=JSON.parse(await fs.readFile(keyPath,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;secret={privateKey:generatePrivateKey()};await fs.writeFile(keyPath,JSON.stringify(secret),{mode:0o600});}
const account=privateKeyToAccount(secret.privateKey);
const client=createClient({chain:studionet,account});
console.log('Test deployer',account.address);
const checkpoint=process.env.CP_DEPLOYMENT_PATH || 'docs/v2-deployment.json';
let record;
try{record=JSON.parse(await fs.readFile(checkpoint,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
const code=await fs.readFile('contracts/credential_proof.py','utf8');
const digest=createHash('sha256').update(code).digest('hex');
if(record && record.sourceSha256!==digest)throw Error('Source changed after deployment submission; inspect checkpoint before deploying again.');
if(!record){
 await client.request({method:'sim_fundAccount',params:[account.address,1e20]});
 const hash=await client.deployContract({code,args:[60],leaderOnly:false});
 record={network:'Studionet',chainId:61999,rpc:'https://studio.genlayer.com/api',deploymentTx:hash,sourceSha256:digest,deployer:account.address,challengeSeconds:60,responseSeconds:60,submittedAt:new Date().toISOString()};
 await fs.writeFile(checkpoint,JSON.stringify(record,null,2)+'\n');console.log('Submitted',hash);
}
const receipt=await client.waitForTransactionReceipt({hash:record.deploymentTx,status:'FINALIZED',interval:3000,retries:200});
await fs.writeFile(checkpoint.replace('.json','-receipt.json'),JSON.stringify(publicReceipt(receipt),null,2)+'\n');
assertSuccessfulReceipt(receipt);
record.address=receipt.to_address || receipt.recipient;
if(!/^0x[0-9a-f]{40}$/i.test(record.address||''))throw Error('Deployment receipt missing contract address');
record.config=JSON.parse(await client.readContract({address:record.address,functionName:'get_config',args:[],transactionHashVariant:'LATEST_FINAL'}));
record.finalizedAt=new Date().toISOString();
await fs.writeFile(checkpoint,JSON.stringify(record,null,2)+'\n');
console.log('Finalized',JSON.stringify(record));
