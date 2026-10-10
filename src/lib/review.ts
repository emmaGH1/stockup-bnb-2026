// Step 7: human-readable review of the exact transaction, decoded FROM the calldata itself (not from our own variables),
// then compared to what the user was told. Any mismatch => no review, no sign button.
import { decodeFunctionData, parseAbi, getAddress, keccak256, formatUnits, type Hex } from 'viem';
import { ROUTER_V2, WBNB } from './swap';

const abi = parseAbi(['function swapExactETHForTokens(uint256 amountOutMin,address[] path,address to,uint256 deadline) payable returns (uint256[])']);

export interface Expected { token: string; recipient: string; valueWei: bigint; minOutWei: bigint; nowSec: number; maxTtlSec: number }
export interface Review {
  contract: string; function: 'swapExactETHForTokens'; sendsBnb: string; minTokensOut: string; receivesToken: string; recipient: string;
  path: string[]; deadlineUtc: string; secondsLeft: number; calldataDigest: string; chainId: 56;
}
export type ReviewResult = { ok: true; review: Review } | { ok: false; problems: string[] };

export function verifyAndDescribe(tx: { to: string; data: string; value: string; chainId: number }, exp: Expected): ReviewResult {
  const problems: string[] = [];
  if (tx.chainId !== 56) problems.push('chainId is not 56 (BSC)');
  if (getAddress(tx.to) !== ROUTER_V2) problems.push('target is not the PancakeSwap V2 router');
  let dec;
  try { dec = decodeFunctionData({ abi, data: tx.data as Hex }); } catch { return { ok: false, problems: [...problems, 'calldata is not swapExactETHForTokens'] }; }
  const [minOut, path, to, deadline] = dec.args;
  if (BigInt(tx.value) !== exp.valueWei) problems.push('value differs from the quoted trade amount');
  if (minOut !== exp.minOutWei) problems.push('minimum output differs from the quote');
  if (path.length !== 2 || getAddress(path[0]) !== WBNB || getAddress(path[1]) !== getAddress(exp.token)) problems.push('swap path is not WBNB -> the selected token');
  if (getAddress(to) !== getAddress(exp.recipient)) problems.push('tokens would go to a different address than the user');
  const left = Number(deadline) - exp.nowSec;
  if (left <= 0) problems.push('deadline already passed');
  if (left > exp.maxTtlSec + 5) problems.push('deadline is further out than allowed');
  if (problems.length) return { ok: false, problems };
  return { ok: true, review: {
    contract: ROUTER_V2, function: 'swapExactETHForTokens', sendsBnb: formatUnits(BigInt(tx.value), 18), minTokensOut: formatUnits(minOut, 18),
    receivesToken: getAddress(path[1]), recipient: getAddress(to), path: path.map(getAddress), deadlineUtc: new Date(Number(deadline) * 1000).toISOString(),
    secondsLeft: left, calldataDigest: keccak256(tx.data as Hex).slice(0, 18), chainId: 56 } };
}
