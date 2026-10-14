// Keep audit fields and execution/consensus outcomes, omitting encoded calldata,
// validator prompts and repeated contract source. Fetch raw receipts by hash.
export function publicReceipt(receipt) {
 const result={};
 for(const k of ['hash','tx_id','status','status_name','result_name','from_address','to_address','sender','recipient','origin_address','created_at','leader_only','execution_mode','num_of_rounds'])if(receipt[k]!==undefined)result[k]=receipt[k];
 const consensus=receipt.consensus_data || {};
 result.consensus_data={votes:consensus.votes,leader_receipt:(consensus.leader_receipt || []).map(r=>({execution_result:r.execution_result,mode:r.mode,vote:r.vote,genvm_result:{error_code:r.genvm_result?.error_code,error_description:r.genvm_result?.error_description}}))};
 return result;
}
