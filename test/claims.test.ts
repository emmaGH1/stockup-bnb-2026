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

describe('pasted-receipt wording', () => {
  it('own.ts never labels an over-limit amount as a routing failure and never says "manually entered" for pasted text', () => {
    const src = readFileSync('src/lib/own.ts', 'utf8');
    expect(src).toMatch(/over_limit/); expect(src).not.toMatch(/\(manually entered\)/);
  });
  it('UI tells the user the pasted receipt cannot be verified', () => {
    const ui = readFileSync('src/components/own-flow.tsx', 'utf8') + readFileSync('src/app/page.tsx', 'utf8');
    expect(ui).toMatch(/cannot (verify|tell whether)/i);
  });
});

describe('signature interface', () => {
  it('the ownership receipt is marked issued only via isIssued (verified receipt), never from a preview or submission', () => {
    const ui = readFileSync('src/components/own-flow.tsx', 'utf8');
    expect(ui).toMatch(/isIssued\(paper\)/); expect(ui).not.toMatch(/issued=\{true\}|issued\s*$/m);
  });
  it('no throwaway preview routes ship', () => {
    expect(files.filter(f => /zz-|preview|mock/i.test(f))).toEqual([]);
  });
});

describe('wallet authorization guard (source-level)', () => {
  it('sign() checks the account matches the recipient and the chain before sending', () => {
    const ui = readFileSync('src/components/own-flow.tsx', 'utf8');
    const body = ui.slice(ui.indexOf('async function sign()'), ui.indexOf('async function run('));
    expect(body).toMatch(/st\.account\.toLowerCase\(\) !== res\.review\.recipient\.toLowerCase\(\)/);
    expect(body).toMatch(/switchToBsc|wrong_chain/);
    expect(body.indexOf('eth_sendTransaction')).toBeGreaterThan(body.indexOf('toLowerCase()'));
    expect(ui).not.toMatch(/personal_sign|eth_sign\b|signTypedData/);
  });
});

describe('server hardening', () => {
  it('every POST route reads bodies through the bounded reader', () => {
    for (const r of ['own', 'plan', 'receipt', 'settle']) {
      const s = readFileSync(`src/app/api/${r}/route.ts`, 'utf8');
      expect(s, r).toMatch(/readBounded\(req\)/); expect(s, r).not.toMatch(/await req\.json\(\)/);
    }
  });
  it('bounded reader rejects oversize bodies', async () => {
    const { readBounded } = await import('../src/lib/http');
    const big = new Request('http://x', { method: 'POST', body: 'a'.repeat(9000), headers: { 'content-length': '9000' } });
    await expect(readBounded(big)).rejects.toThrow(/too large/);
  });
  it('server rejects a malformed recipient before any chain or Binance work', async () => {
    const { spendToOwn } = await import('../src/lib/own');
    await expect(spendToOwn({ merchant: 'AMAZON', spendUsd: 100, recipient: 'nope' })).rejects.toThrow(/valid BSC address/);
  });
  it('security headers are configured', () => {
    const c = readFileSync('next.config.ts', 'utf8');
    for (const h of ['X-Frame-Options', 'X-Content-Type-Options', 'Content-Security-Policy', 'Strict-Transport-Security'.replace('Strict-Transport-Security', 'Referrer-Policy')]) expect(c).toMatch(new RegExp(h));
  });
});
