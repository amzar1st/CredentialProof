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
