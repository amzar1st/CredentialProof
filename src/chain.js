import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { custom } from 'viem';
import { deployment } from './config.js';

export const publicClient = createClient({ chain: studionet, endpoint: deployment.rpc });
export async function read(functionName, args = []) {
  if (!deployment.address) throw new Error('Contract deployment is being verified.');
  const value = await publicClient.readContract({ address: deployment.address, functionName, args, transactionHashVariant: 'LATEST_FINAL' });
  return typeof value === 'string' ? JSON.parse(value) : value;
}
export async function connectWallet() {
  if (!window.ethereum) throw new Error('No browser wallet found. You can use Studio with its built-in wallet instead.');
  const [address] = await window.ethereum.request({ method: 'eth_requestAccounts' });
  const chainId = await window.ethereum.request({ method: 'eth_chainId' });
  if (Number(chainId) !== deployment.chainId) {
    try { await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0xf22f' }] }); }
    catch (error) {
      if (error.code !== 4902) throw error;
      await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [{ chainId: '0xf22f', chainName: 'GenLayer Studionet', nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 }, rpcUrls: [deployment.rpc], blockExplorerUrls: [deployment.explorer] }] });
      await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0xf22f' }] });
    }
  }
  return { address, client: createClient({ chain: studionet, account: address, transport: custom(window.ethereum), endpoint: deployment.rpc }) };
}
export function assertSuccessfulReceipt(receipt) {
  const finalized = receipt.status === 'FINALIZED' || receipt.status === 7 || receipt.status === '7';
  const leader = receipt.consensus_data?.leader_receipt;
  const executions = Array.isArray(leader) ? leader : leader ? [leader] : [];
  const primary = executions.find(r => r.mode === 'leader') || executions[0];
  const quorumCancelled = r => r.mode === 'validator' && r.vote === 'idle'
    && r.genvm_result?.error_code === 'CONSENSUS_VALIDATOR_QUORUM_REACHED';
  const success = primary?.execution_result === 'SUCCESS'
    && executions.every(r => r.execution_result === 'SUCCESS' || quorumCancelled(r));
  if (!finalized || !success) throw new Error(`Transaction ${receipt.status}: execution was not finalized successfully`);
}
export async function write(client, functionName, args, report) {
  const submitted = await client.writeContract({ address: deployment.address, functionName, args, value: 0n });
  const hash = typeof submitted === 'string' ? submitted : submitted.txId || submitted.hash;
  if (!/^0x[0-9a-f]{64}$/i.test(hash || '')) throw new Error('No valid transaction hash returned.');
  report({ hash, status: 'Submitted — waiting for GenLayer finality' });
  const receipt = await client.waitForTransactionReceipt({ hash, status: 'FINALIZED', interval: 3000, retries: 100 });
  assertSuccessfulReceipt(receipt);
  report({ hash, status: 'Finalized successfully' });
  return receipt;
}
