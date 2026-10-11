import { describe, it, expect } from 'vitest';
import { issueReceipt, type PurchaseContext } from '../src/lib/receipt';
import type { Settlement } from '../src/lib/settle';

const TOKEN = '0x4553cfe1c09f37f38b12dc509f676964e392f8fc', ME = '0x1234567890123456789012345678901234567890';
const settled = (conf = 6, txHash = '0x' + 'ab'.repeat(32)): Settlement => ({ state: 'settled', txHash, blockNumber: '100', confirmations: conf, receivedTokens: '0.019', minTokens: '0.0188', vsQuotedBps: 30, gasUsed: '1', gasCostBnb: '0.00001', from: ME, recipient: ME });
const ctx: PurchaseContext = { merchantInput: 'AMAZON.COM*2K4', companyName: 'Amazon.com, Inc.', ticker: 'AMZN', spendUsd: 100, investUsd: 5, sharesPerToken: 1 };
const deps = { listing: async () => ({ ticker: 'AMZN', symbol: 'AMZNon', multiplier: 1 }), token: async () => ({ address: TOKEN as `0x${string}`, symbol: 'AMZNon', decimals: 18, totalSupply: '1' }), balanceOf: async () => '0.019', now: () => new Date('2026-10-10T12:00:00Z') };

describe('issueReceipt', () => {
  it('issues a receipt for a final settlement with links and labeled sections', async () => {
    const r = await issueReceipt(settled(), TOKEN, ctx, deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.receipt.receiptId).toMatch(/^SU-[0-9A-F]{12}$/);
      expect(r.receipt.links.tx).toBe('https://bscscan.com/tx/0x' + 'ab'.repeat(32));
      expect(r.receipt.links.holderOnToken).toContain(`?a=${ME}`);
      expect(r.receipt.onChain.tokenSymbol).toBe('AMZNon'); expect(r.receipt.onChain.holderBalanceNow).toBe('0.019');
      expect(r.receipt.recordedByApp.note).toMatch(/pasted or typed/); expect(r.receipt.recordedByApp.note).toMatch(/no merchant cashback/); expect(JSON.stringify(r.receipt)).not.toMatch(/rewardUsd/); expect(r.receipt.exposure.sharesApprox).toBeCloseTo(0.019);
      expect(r.receipt.limits.join()).toMatch(/not direct share ownership/);
    }
  });
  it('receipt id is deterministic for the same tx and differs for another', async () => {
    const a = await issueReceipt(settled(), TOKEN, ctx, deps), b = await issueReceipt(settled(), TOKEN, ctx, deps);
    const c = await issueReceipt(settled(6, '0x' + 'cd'.repeat(32)), TOKEN, ctx, deps);
    expect(a.ok && b.ok && c.ok && a.receipt.receiptId === b.receipt.receiptId && a.receipt.receiptId !== c.receipt.receiptId).toBe(true);
  });
  it('refuses for every non-settled state and for non-final settlements', async () => {
    for (const s of [{ state: 'pending', detail: '' }, { state: 'reverted', txHash: '0x1', blockNumber: '1', detail: '' }, { state: 'mismatch', txHash: '0x1', problems: ['x'] }, { state: 'not_found', detail: '' }] as Settlement[]) {
      const r = await issueReceipt(s, TOKEN, ctx, deps); expect(r.ok).toBe(false);
    }
    const early = await issueReceipt(settled(1), TOKEN, ctx, deps);
    expect(early.ok).toBe(false); if (!early.ok) expect(early.reason).toMatch(/confirmation/);
  });
  it('refuses a token that is not on the tokenized-stock list, or when the list is unreachable, or symbol mismatch', async () => {
    const a = await issueReceipt(settled(), TOKEN, ctx, { ...deps, listing: async () => null });
    expect(a.ok).toBe(false); if (!a.ok) expect(a.reason).toMatch(/not on the Binance tokenized-stock list/);
    const b = await issueReceipt(settled(), TOKEN, ctx, { ...deps, listing: async () => { throw new Error('down'); } });
    expect(b.ok).toBe(false); if (!b.ok) expect(b.reason).toMatch(/could not confirm/);
    expect((await issueReceipt(settled(), TOKEN, ctx, { ...deps, listing: async () => ({ ticker: 'AMZN', symbol: 'OTHER', multiplier: 1 }) })).ok).toBe(false);
  });
  it('refuses a non-settled state even when it has enough confirmations (state guard tested on its own)', async () => {
    const finalButNotSettled = [
      { state: 'mismatch', txHash: '0x' + 'ab'.repeat(32), problems: ['x'] },
      { state: 'reverted', txHash: '0x' + 'ab'.repeat(32), blockNumber: '100', detail: '' },
    ] as unknown as Settlement[];
    for (const s of finalButNotSettled) {
      const r = await issueReceipt({ ...s, confirmations: 10 } as unknown as Settlement, TOKEN, ctx, deps);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toMatch(/not settled/);
    }
  });
  it('uses the list multiplier and ticker, ignoring client-supplied values', async () => {
    const r = await issueReceipt(settled(), TOKEN, { ...ctx, ticker: 'FAKE', sharesPerToken: 999 }, { ...deps, listing: async () => ({ ticker: 'AMZN', symbol: 'AMZNon', multiplier: 2 }) });
    expect(r.ok && r.receipt.recordedByApp.ticker).toBe('AMZN'); expect(r.ok && r.receipt.exposure.sharesApprox).toBeCloseTo(0.038);
  });
  it('refuses if the token contract cannot be read; tolerates a missing balance', async () => {
    expect((await issueReceipt(settled(), TOKEN, ctx, { ...deps, token: async () => { throw new Error('x'); } })).ok).toBe(false);
    const r = await issueReceipt(settled(), TOKEN, ctx, { ...deps, balanceOf: async () => { throw new Error('x'); } });
    expect(r.ok && r.receipt.onChain.holderBalanceNow).toBeNull();
  });
});
