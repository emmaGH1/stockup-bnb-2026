import { getAddress, formatUnits, parseAbi, type Address } from 'viem';
import { client } from './bsc';

const pairAbi = parseAbi([
  'function getReserves() view returns (uint112,uint112,uint32)',
  'function token0() view returns (address)',
]);

export interface PoolPrice {
  pair: Address; base: Address; quote: Address;
  priceQuotePerBase: number; baseReserve: number; quoteReserve: number;
  quoteLiquidity: number; // total quote-side value of the pool (2x quote reserve), a depth indicator
  blockTimestampLast: number;
}

/** Pure math so it is testable without network. */
export function priceFromReserves(r0: bigint, r1: bigint, d0: number, d1: number, baseIsToken0: boolean) {
  const a = Number(formatUnits(r0, d0)), b = Number(formatUnits(r1, d1));
  const baseReserve = baseIsToken0 ? a : b, quoteReserve = baseIsToken0 ? b : a;
  if (baseReserve <= 0 || quoteReserve <= 0) return null;
  return { priceQuotePerBase: quoteReserve / baseReserve, baseReserve, quoteReserve, quoteLiquidity: quoteReserve * 2 };
}

/** Spot price from a PancakeSwap V2 pair. Spot reserves ratio only: not a TWAP, manipulable, no fees/slippage. */
export async function readV2Price(pair: string, base: string, quote: string, baseDec = 18, quoteDec = 18, c = client()): Promise<PoolPrice | null> {
  const p = getAddress(pair), b = getAddress(base), q = getAddress(quote);
  const [[r0, r1, ts], token0] = await Promise.all([
    c.readContract({ address: p, abi: pairAbi, functionName: 'getReserves' }),
    c.readContract({ address: p, abi: pairAbi, functionName: 'token0' }),
  ]);
  const baseIs0 = token0 === b;
  const m = priceFromReserves(r0, r1, baseIs0 ? baseDec : quoteDec, baseIs0 ? quoteDec : baseDec, baseIs0);
  return m && { pair: p, base: b, quote: q, ...m, blockTimestampLast: ts };
}
