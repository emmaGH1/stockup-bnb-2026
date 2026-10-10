import { describe, it, expect } from 'vitest';
import { walletState, readWallet, connectWallet, BSC_CHAIN_ID_HEX, type Eip1193 } from '../src/lib/wallet/provider';

const A = '0x1234567890123456789012345678901234567890';
const mock = (accounts: string[], chain: string, log: string[] = []): Eip1193 => ({
  request: async ({ method }) => { log.push(method); if (method === 'eth_accounts' || method === 'eth_requestAccounts') return accounts; if (method === 'eth_chainId') return chain; return null; } });

describe('wallet state', () => {
  it('no provider, disconnected, wrong chain, connected on BSC', () => {
    expect(walletState(null, null, false).status).toBe('no_wallet');
    expect(walletState([], BSC_CHAIN_ID_HEX, true).status).toBe('disconnected');
    expect(walletState([A], '0x1', true).status).toBe('wrong_chain');
    expect(walletState([A], BSC_CHAIN_ID_HEX, true)).toEqual({ status: 'connected', account: A, chainId: '0x38' });
  });
  it('readWallet only reads (no connect request) and reports the account', async () => {
    const log: string[] = [];
    const s = await readWallet(mock([A], '0x38', log));
    expect(s.status).toBe('connected'); expect(log).not.toContain('eth_requestAccounts');
  });
  it('connectWallet is the only path that requests access, and reports rejection as disconnected', async () => {
    const log: string[] = [];
    expect((await connectWallet(mock([A], '0x38', log))).status).toBe('connected'); expect(log).toContain('eth_requestAccounts');
    const rejecting: Eip1193 = { request: async () => { throw new Error('User rejected'); } };
    expect((await connectWallet(rejecting)).status).toBe('disconnected');
  });
  it('never requests a signature or transaction in any read/connect path', async () => {
    const log: string[] = [];
    await readWallet(mock([A], '0x1', log)); await connectWallet(mock([A], '0x1', log));
    expect(log.some(m => /sign|sendTransaction|personal_/.test(m))).toBe(false);
  });
});
