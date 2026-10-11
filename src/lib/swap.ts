// Swap route on PancakeSwap V2 (BSC). BUILD + SIMULATE ONLY. There is deliberately no send/sign code here.
import { encodeFunctionData, parseAbi, getAddress, type Address, type Hex } from 'viem';
import { client } from './bsc';

export const ROUTER_V2 = getAddress('0x10ED43C718714eb63d5aA57B78B54704E256024E');
export const WBNB = getAddress('0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c');
const abi = parseAbi([
  'function getAmountsOut(uint256,address[]) view returns (uint256[])',
  'function swapExactETHForTokens(uint256 amountOutMin,address[] path,address to,uint256 deadline) payable returns (uint256[])',
]);

export interface SwapPlan { to: Address; data: Hex; value: bigint; quotedOut: bigint; minOut: bigint; path: Address[]; slippageBps: number }

/** Pure: min output after slippage, in basis points. */
export function applySlippage(out: bigint, bps: number): bigint {
  if (!Number.isInteger(bps) || bps < 0 || bps > 5000) throw new Error('slippage bps out of range');
  return (out * BigInt(10_000 - bps)) / 10_000n;
}

/** Pure: price impact in bps vs spot, constant product (V2 0.25% fee ignored). Scaled to avoid integer truncation. */
export function impactBps(amountIn: bigint, reserveIn: bigint, reserveOut: bigint): number {
  if (reserveIn <= 0n || reserveOut <= 0n || amountIn <= 0n) return 10_000;
  // impact = amountIn / (reserveIn + amountIn)
  return Number((amountIn * 10_000n) / (reserveIn + amountIn));
}

export async function planBnbBuy(token: string, bnbIn: bigint, recipient: string, slippageBps = 100, ttlSec = 120, c = client()): Promise<SwapPlan> {
  const path = [WBNB, getAddress(token)];
  const [, quotedOut] = await c.readContract({ address: ROUTER_V2, abi, functionName: 'getAmountsOut', args: [bnbIn, path] });
  const minOut = applySlippage(quotedOut, slippageBps);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + ttlSec);
  const data = encodeFunctionData({ abi, functionName: 'swapExactETHForTokens', args: [minOut, path, getAddress(recipient), deadline] });
  return { to: ROUTER_V2, data, value: bnbIn, quotedOut, minOut, path, slippageBps };
}

/** Pure: impact including the 0.25% V2 pool fee, measured against the fee-free spot output. Always >= impactBps. */
export function impactIncludingFeeBps(amountIn: bigint, reserveIn: bigint, reserveOut: bigint, feeBps = 25n): number {
  if (reserveIn <= 0n || reserveOut <= 0n || amountIn <= 0n) return 10_000;
  // spot out = amountIn * reserveOut / reserveIn; actual V2 out = amountInWithFee * reserveOut / (reserveIn*10000 + amountInWithFee)
  const spotOut = (amountIn * reserveOut) / reserveIn;
  const inWithFee = amountIn * (10_000n - feeBps);
  const actualOut = (inWithFee * reserveOut) / (reserveIn * 10_000n + inWithFee);
  if (spotOut <= 0n) return 10_000;
  return Number(((spotOut - actualOut) * 10_000n) / spotOut);
}

/** No-spend simulation via eth_call with a state override that funds `from`. Proves the calldata executes against live state. */
export async function simulate(plan: SwapPlan, from: string, c = client()) {
  const res = await c.call({
    account: getAddress(from), to: plan.to, data: plan.data, value: plan.value,
    stateOverride: [{ address: getAddress(from), balance: plan.value + 10n ** 18n }],
  });
  return { ok: true as const, returnData: res.data };
}
