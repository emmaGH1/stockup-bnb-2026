import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { issueReceipt, type PurchaseContext } from '../src/lib/receipt';
import type { Settlement } from '../src/lib/settle';

const walk = (d: string): string[] => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(p) ? [p] : []; });
const files = walk('src');

describe('product claims (rules from the human)', () => {
  it('no cashback / reward / earn language in user-facing source, except in negations', () => {
    const bad: string[] = [];
    for (const f of files) readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
      if (/cashback|\breward|\bearn(?!ings)/i.test(line) && !/no merchant cashback|not merchant cashback|there is no merchant cashback|no reward|not a? ?reward/i.test(line)) bad.push(`${f}:${i + 1}: ${line.trim().slice(0, 100)}`);
    });
    expect(bad).toEqual([]);
  });
  it('no unconditional trade-success wording in the UI', () => {
    const ui = readFileSync('src/components/own-flow.tsx', 'utf8');
    expect(ui).not.toMatch(/Purchase successful|Trade successful|Investment successful|You now own|Congratulations/i);
  });
  it('a receipt is refused unless settlement is independently verified (every non-settled state)', async () => {
    const ctx: PurchaseContext = { merchantInput: 'x', companyName: 'x', ticker: 'X', spendUsd: 1, investUsd: 1, sharesPerToken: 1 };
    const deps = { listing: async () => ({ ticker: 'X', symbol: 'X', multiplier: 1 }), token: async () => ({ address: '0x0000000000000000000000000000000000000001' as `0x${string}`, symbol: 'X', decimals: 18, totalSupply: '1' }), balanceOf: async () => '1' };
    for (const s of [{ state: 'pending', detail: '' }, { state: 'not_found', detail: '' }, { state: 'reverted', txHash: '0x1', blockNumber: '1', detail: '' }, { state: 'mismatch', txHash: '0x1', problems: [] }] as Settlement[])
      expect((await issueReceipt(s, '0x0000000000000000000000000000000000000001', ctx, deps)).ok).toBe(false);
  });
});
