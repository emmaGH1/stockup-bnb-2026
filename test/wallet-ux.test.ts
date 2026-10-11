import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// Source-level checks for the wallet UX rules (the wallet logic itself is covered in test/wallet.test.ts).
const ui = readFileSync('src/components/own-flow.tsx', 'utf8');

describe('wallet UX: connected status, disconnect, account and network changes', () => {
  it('subscribes to account and network changes from the wallet provider, and unsubscribes on cleanup', () => {
    expect(ui).toMatch(/w\.on\('accountsChanged', onAccounts\)/);
    expect(ui).toMatch(/w\.on\('chainChanged', refresh\)/);
    expect(ui).toMatch(/removeListener/);
  });

  it('an account or network change never rewrites the recipient (the review is bound to it)', () => {
    const start = ui.indexOf("w.on('accountsChanged'");
    const end = ui.indexOf('return () =>', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(ui.slice(start, end)).not.toMatch(/setRecipient/);
  });

  it('disconnect is app-level: it resets Stockup state and never calls the wallet', () => {
    const start = ui.indexOf('function disconnect()');
    expect(start).toBeGreaterThan(-1);
    const end = ui.indexOf('\n  }', start);
    const body = ui.slice(start, end);
    expect(body).toMatch(/setWallet\(\{ status: 'disconnected' \}\)/);
    expect(body).not.toMatch(/request\(|wallet_revokePermissions|eth_sendTransaction/);
  });

  it('a connected wallet shows an explicit panel with the account, the chain, and a disconnect control', () => {
    expect(ui).toMatch(/Wallet connected/);
    expect(ui).toMatch(/Network: BNB Smart Chain \(56\)/);
    expect(ui).toMatch(/Disconnect in Stockup/);
    expect(ui).toMatch(/This only forgets the connection here/);
  });

  it('a connected wallet hides the form connect button; authorize still requires a connection', () => {
    expect(ui).toMatch(/\{!reviewConnectShown && wallet\.status !== 'connected' && <button type="button" onClick=\{connect\}/);
    expect(ui).toMatch(/disabled=\{!ack \|\| !confirm \|\| !!txHash \|\| wallet\.status !== 'connected'\}/);
  });

  it('a connected account that differs from the form recipient is flagged', () => {
    expect(ui).toMatch(/This account is not the recipient on the form/);
  });

  it('an explicit connect clears the ignore flag set by disconnect', () => {
    expect(ui).toMatch(/ignoreWalletEvents\.current = false;/);
  });
});
