import { test } from 'node:test';
import assert from 'node:assert/strict';
// Test actual receipt validation without starting the application.
import { assertSuccessfulReceipt } from '../src/chain.js';
test('accepts Studio finalized numeric status only with successful GenVM execution', () => {
  assert.doesNotThrow(() => assertSuccessfulReceipt({status:7, consensus_data:{leader_receipt:[{execution_result:'SUCCESS'}]}}));
});
test('rejects accepted transactions until finality', () => {
  assert.throws(() => assertSuccessfulReceipt({status:5, consensus_data:{leader_receipt:[{execution_result:'SUCCESS'}]}}));
});
test('rejects finalized failed or absent execution', () => {
  for (const receipt of [{status:7},{status:7,consensus_data:{leader_receipt:[{execution_result:'ERROR'}]}},{status:'FINALIZED',result:'SUCCESS'}]) assert.throws(()=>assertSuccessfulReceipt(receipt));
});
test('accepts successful leader with an idle validator cancelled after quorum', () => {
  const cancelled = {mode:'validator',vote:'idle',execution_result:'ERROR',genvm_result:{error_code:'CONSENSUS_VALIDATOR_QUORUM_REACHED'}};
  const receipt = {status:7,consensus_data:{leader_receipt:[{mode:'leader',execution_result:'SUCCESS'},cancelled]}};
  assert.doesNotThrow(()=>assertSuccessfulReceipt(receipt));
  cancelled.genvm_result.error_code = 'CONTRACT_ERROR';
  assert.throws(()=>assertSuccessfulReceipt(receipt));
});

import {connectWallet, write} from '../src/chain.js';
const address='0x'+'1'.repeat(40);
test('wallet connection checks account and network and configures selected signer', async()=>{
 globalThis.window={ethereum:{request:async({method})=>method==='eth_requestAccounts'?[address]:'0xf22f'}};
 try {const wallet=await connectWallet();assert.equal(wallet.address,address);assert.equal(wallet.client.account.address,address);}finally{delete globalThis.window;}
});
test('wallet connection preserves rejection and rejects empty accounts', async()=>{
 globalThis.window={ethereum:{request:async()=>{throw new Error('User rejected connection');}}};
 await assert.rejects(connectWallet(),/User rejected/);
 window.ethereum.request=async({method})=>method==='eth_requestAccounts'?[]:'0xf22f';
 try{await assert.rejects(connectWallet(),/No valid wallet/);}finally{delete globalThis.window;}
});
test('write blocks stale accounts or wrong network before transaction submission',async()=>{
 const client={account:{address},writeContract:()=>{throw Error('Must not submit');}};
 globalThis.window={ethereum:{request:async({method})=>method==='eth_chainId'?'0x1':[address]}};
 try{
  await assert.rejects(write(client,'finalize',['case'],()=>{}),/Reconnect to GenLayer/);
  window.ethereum.request=async({method})=>method==='eth_chainId'?'0xf22f':['0x'+'2'.repeat(40)];
  await assert.rejects(write(client,'finalize',['case'],()=>{}),/Wallet account changed/);
 }finally{delete globalThis.window;}
});
test('write reports success only after finalized execution receipt',async()=>{
 const reports=[],hash='0x'+'a'.repeat(64);
 const client={writeContract:async()=>hash,waitForTransactionReceipt:async()=>({status:7,consensus_data:{leader_receipt:[{execution_result:'SUCCESS'}]}})};
 await write(client,'finalize',['case'],row=>reports.push(row));
 assert.equal(reports.length,2);assert.equal(reports[1].status,'Finalized successfully');
 reports.length=0;client.waitForTransactionReceipt=async()=>({status:7,consensus_data:{leader_receipt:[{execution_result:'ERROR'}]}});
 await assert.rejects(write(client,'finalize',['case'],row=>reports.push(row)),/not finalized successfully/);
 assert.equal(reports.length,1);
});
