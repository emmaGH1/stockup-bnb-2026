// Step 8: verify settlement of a submitted swap from BSC receipts. Read-only: never sends anything.
// "settled" requires: tx mined + status success + sent to our router + decoded calldata matches the quote
// + the token's Transfer logs credit the user at least minOut. Anything else is pending / reverted / mismatch.
import { decodeFunctionData, parseAbi, parseEventLogs, erc20Abi, getAddress, formatUnits, type Hex, type PublicClient } from 'viem';
import { client } from './bsc';
import { ROUTER_V2, WBNB } from './swap';

const swapAbi = parseAbi(['function swapExactETHForTokens(uint256 amountOutMin,address[] path,address to,uint256 deadline) payable returns (uint256[])']);

export interface SettleExpected { token: string; recipient: string; valueWei: bigint; minOutWei: bigint; quotedOutWei?: bigint }
export type Settlement =
  | { state: 'not_found'; detail: string }
  | { state: 'pending'; detail: string }
  | { state: 'reverted'; txHash: string; blockNumber: string; detail: string }
  | { state: 'mismatch'; txHash: string; problems: string[] }
  | { state: 'settled'; txHash: string; blockNumber: string; confirmations: number; receivedTokens: string; minTokens: string; vsQuotedBps: number | null;
      gasUsed: string; gasCostBnb: string; from: string; recipient: string };

export const MIN_CONFIRMATIONS = 3;

export async function verifySettlement(hash: string, exp: SettleExpected, c: PublicClient = client() as PublicClient): Promise<Settlement> {
  if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) return { state: 'not_found', detail: 'Not a valid transaction hash.' };
  const h = hash as Hex;
  const [tx, receipt] = await Promise.all([c.getTransaction({ hash: h }).catch(() => null), c.getTransactionReceipt({ hash: h }).catch(() => null)]);
  if (!tx) return { state: 'not_found', detail: 'The network does not know this transaction (yet). It may not have propagated, or the hash is wrong.' };
  if (!receipt) return { state: 'pending', detail: 'Submitted but not mined yet.' };
  if (receipt.status !== 'success') return { state: 'reverted', txHash: hash, blockNumber: receipt.blockNumber.toString(), detail: 'Mined but reverted on-chain. No tokens were received; only gas was spent.' };

  const problems: string[] = [];
  if (!tx.to || getAddress(tx.to) !== ROUTER_V2) problems.push('transaction was not sent to the PancakeSwap V2 router');
  // The app only authorizes from the connected account equal to the recipient (own-flow sign path). Anything else is not this user's swap.
  if (getAddress(tx.from) !== getAddress(exp.recipient)) problems.push('transaction was not sent from the recipient\'s own wallet');
  if (tx.value !== exp.valueWei) problems.push(`value ${formatUnits(tx.value, 18)} BNB differs from the authorized ${formatUnits(exp.valueWei, 18)} BNB`);
  try {
    const d = decodeFunctionData({ abi: swapAbi, data: tx.input });
    const [minOut, path, to] = d.args;
    if (minOut !== exp.minOutWei) problems.push('on-chain minimum output differs from the authorized quote');
    if (path.length !== 2 || getAddress(path[0]) !== WBNB || getAddress(path[1]) !== getAddress(exp.token)) problems.push('on-chain path is not WBNB -> the selected token');
    if (getAddress(to) !== getAddress(exp.recipient)) problems.push('tokens were routed to a different address');
  } catch { problems.push('calldata is not swapExactETHForTokens'); }

  // Credited amount = sum of ERC-20 Transfer logs emitted BY the token contract with `to` == recipient.
  let received = 0n;
  const logs = parseEventLogs({ abi: erc20Abi, eventName: 'Transfer', logs: receipt.logs.filter(l => getAddress(l.address) === getAddress(exp.token)) });
  for (const l of logs) if (getAddress(l.args.to) === getAddress(exp.recipient)) received += l.args.value;
  if (received === 0n) problems.push('no token Transfer to the recipient found in the receipt');
  else if (received < exp.minOutWei) problems.push('received less than the authorized minimum');
  if (problems.length) return { state: 'mismatch', txHash: hash, problems };

  const latest = await c.getBlockNumber();
  const confirmations = Number(latest - receipt.blockNumber) + 1;
  return { state: 'settled', txHash: hash, blockNumber: receipt.blockNumber.toString(), confirmations,
    receivedTokens: formatUnits(received, 18), minTokens: formatUnits(exp.minOutWei, 18),
    vsQuotedBps: exp.quotedOutWei && exp.quotedOutWei > 0n ? Number(((exp.quotedOutWei - received) * 10_000n) / exp.quotedOutWei) : null,
    gasUsed: receipt.gasUsed.toString(), gasCostBnb: formatUnits(receipt.gasUsed * receipt.effectiveGasPrice, 18), from: tx.from, recipient: getAddress(exp.recipient) };
}

/** A settled swap is only final enough to report once enough blocks have built on it. */
export const isFinal = (s: Settlement) => s.state === 'settled' && s.confirmations >= MIN_CONFIRMATIONS;
