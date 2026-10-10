// Minimal EIP-1193 wallet adapter for BSC (chain 56). Never holds a key; delegates every signature to the user's wallet.
export interface Eip1193 { request(a: { method: string; params?: unknown[] }): Promise<unknown> }
export const BSC_CHAIN_ID_HEX = '0x38';

export type WalletState =
  | { status: 'no_wallet' }
  | { status: 'disconnected' }
  | { status: 'wrong_chain'; account: string; chainId: string }
  | { status: 'connected'; account: string; chainId: string };

/** Pure. Turns raw provider answers into a state the UI can act on. */
export function walletState(accounts: string[] | null, chainIdHex: string | null, hasProvider: boolean): WalletState {
  if (!hasProvider) return { status: 'no_wallet' };
  if (!accounts || accounts.length === 0) return { status: 'disconnected' };
  const account = accounts[0];
  if (chainIdHex !== BSC_CHAIN_ID_HEX) return { status: 'wrong_chain', account, chainId: chainIdHex ?? 'unknown' };
  return { status: 'connected', account, chainId: chainIdHex };
}

/** Read-only: accounts and chain. No signature is requested here. */
export async function readWallet(p: Eip1193 | undefined): Promise<WalletState> {
  if (!p) return walletState(null, null, false);
  const accounts = (await p.request({ method: 'eth_accounts' }).catch(() => [])) as string[];
  const chainId = (await p.request({ method: 'eth_chainId' }).catch(() => null)) as string | null;
  return walletState(accounts, chainId, true);
}

/** Explicit user action only. Requests account access; this is not a transaction. */
export async function connectWallet(p: Eip1193 | undefined): Promise<WalletState> {
  if (!p) return walletState(null, null, false);
  const accounts = (await p.request({ method: 'eth_requestAccounts' }).catch(() => [])) as string[];
  return readWallet({ request: async ({ method }) => (method === 'eth_accounts' ? accounts : await p.request({ method: 'eth_chainId' })) });
}

/** Explicit user action only. Asks the wallet to switch to BSC. */
export async function switchToBsc(p: Eip1193): Promise<boolean> {
  try { await p.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: BSC_CHAIN_ID_HEX }] }); return true; }
  catch { return false; }
}
