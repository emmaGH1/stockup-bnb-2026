import { createPublicClient, http, erc20Abi, formatUnits, isAddress, getAddress, type Address } from 'viem';
import { bsc } from 'viem/chains';

export const BSC_TOKENS = {
  USDT: '0x55d398326f99059fF775485246999027B3197955',
  USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
} as const;

export function client(rpc = process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org') {
  return createPublicClient({ chain: bsc, transport: http(rpc, { timeout: 10_000, retryCount: 0 }) });
}

export interface TokenInfo { address: Address; symbol: string; decimals: number; totalSupply: string }

/** Read-only on-chain metadata for any ERC-20 (e.g. a tokenized stock). */
export async function readToken(addr: string, c = client()): Promise<TokenInfo> {
  if (!isAddress(addr)) throw new Error('invalid address');
  const address = getAddress(addr);
  const [symbol, decimals, supply] = await Promise.all([
    c.readContract({ address, abi: erc20Abi, functionName: 'symbol' }),
    c.readContract({ address, abi: erc20Abi, functionName: 'decimals' }),
    c.readContract({ address, abi: erc20Abi, functionName: 'totalSupply' }),
  ]);
  return { address, symbol, decimals, totalSupply: formatUnits(supply, decimals) };
}

export async function readBalance(token: string, holder: string, c = client()) {
  if (!isAddress(token) || !isAddress(holder)) throw new Error('invalid address');
  const [bal, dec] = await Promise.all([
    c.readContract({ address: getAddress(token), abi: erc20Abi, functionName: 'balanceOf', args: [getAddress(holder)] }),
    c.readContract({ address: getAddress(token), abi: erc20Abi, functionName: 'decimals' }),
  ]);
  return formatUnits(bal, dec);
}
