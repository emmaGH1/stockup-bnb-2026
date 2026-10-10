import { getAddress, parseAbi } from 'viem';
import { client } from './bsc';
import { readV2Price } from './price';
import { WBNB } from './swap';

const FACTORY = getAddress('0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73');
const USDT = '0x55d398326f99059fF775485246999027B3197955';
/** Live WBNB/USDT spot from PancakeSwap V2 reserves (a deep pool). Spot only, not a TWAP. */
export async function bnbUsd(c = client()): Promise<number> {
  const pair = await c.readContract({ address: FACTORY, abi: parseAbi(['function getPair(address,address) view returns (address)']), functionName: 'getPair', args: [WBNB, getAddress(USDT)] });
  const p = await readV2Price(pair, WBNB, USDT, 18, 18, c);
  if (!p || p.quoteLiquidity < 100_000) throw new Error('BNB price source too thin');
  return p.priceQuotePerBase;
}
