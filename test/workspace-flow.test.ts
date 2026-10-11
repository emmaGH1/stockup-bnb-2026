import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { QUICK_PICKS } from '../src/lib/quickpicks';
import { COMPANIES, identifyCompany } from '../src/lib/company';

const ui = readFileSync('src/components/own-flow.tsx', 'utf8');

describe('quick picks', () => {
  it('every pick identifies as its own company through identifyCompany', () => {
    for (const q of QUICK_PICKS) {
      const r = identifyCompany(q.merchant);
      expect(r.status).toBe('identified');
      if (r.status === 'identified') expect(r.company.ticker).toBe(q.ticker);
    }
  });
  it('every pick maps to a company in the curated table', () => {
    for (const q of QUICK_PICKS) expect(COMPANIES.some(c => c.ticker === q.ticker)).toBe(true);
  });
});

describe('workspace safety wording and gating', () => {
  it('the ownership receipt button is disabled until settlement is verified', () => {
    const line = ui.split('\n').find(l => l.includes('onClick={getReceipt}')) ?? '';
    expect(line).toMatch(/disabled=\{settle\?\.state !== 'settled'\}/);
  });
  it('the investment result card never claims holdings or ownership', () => {
    const start = ui.indexOf('aria-label="Investment result"');
    expect(start).toBeGreaterThan(-1);
    const card = ui.slice(start, ui.indexOf('</section>', start));
    expect(card).toMatch(/Proposed investment/);
    expect(card).toMatch(/not executed/);
    expect(card).not.toMatch(/You hold|You own|owned|Ownership/i);
  });
  it('receipt paste stays available as an optional input', () => {
    expect(ui).toMatch(/Optional: paste a receipt/);
    expect(ui).toMatch(/Use a sample/);
    expect(ui).toMatch(/Read receipt/);
  });

  it('on phones the page scrolls to the investment result after a check, not to a section below it', () => {
    expect(ui).toMatch(/resultRef\.current\?\.scrollIntoView/);
    expect(ui).toMatch(/aria-label="Investment result"/);
  });
  it('the eligibility banner repeats the verdict only when something is not ready, so blocked reasons stay visible', () => {
    expect(ui).toMatch(/res\.plan && res\.outcome !== 'ready_to_sign' && </);
    const start = ui.indexOf('aria-label="Investment result"');
    expect(ui.slice(start, ui.indexOf('</section>', start))).toMatch(/c\.state !== 'pass'/);
  });
  it('the result card states that the spend is unverified and that there is no merchant cashback', () => {
    const start = ui.indexOf('aria-label="Investment result"');
    const card = ui.slice(start, ui.indexOf('</section>', start));
    expect(card).toMatch(/not verified/);
    expect(card).toMatch(/No merchant cashback/);
  });
  it('the principal action follows the last required input; the optional receipt paste comes after it', () => {
    const wallet = ui.indexOf('Connect my browser wallet</button>');
    const action = ui.indexOf('Check and prepare my investment');
    const paste = ui.indexOf('Optional: paste a receipt');
    expect(wallet).toBeGreaterThan(-1);
    expect(action).toBeGreaterThan(wallet);
    expect(paste).toBeGreaterThan(action);
  });
  it('authorize sits next to its own prerequisite: a connect button appears in the review panel when no wallet is connected', () => {
    const review = ui.slice(ui.indexOf('aria-label="Review and authorize"'));
    expect(review).toMatch(/Connect wallet to authorize/);
    expect(review.indexOf('Connect wallet to authorize')).toBeLessThan(review.indexOf('Authorize in my wallet'));
  });

  it('every required disclosure stays in the page source, next to the workspace', () => {
    const page = readFileSync('src/app/page.tsx', 'utf8');
    const flat = (x: string) => x.replace(/\s+/g, ' ');
    const ws = flat(page.slice(page.indexOf('aria-label="Investment workspace"')));
    expect(ws).toMatch(/Development build/);
    expect(ws).toMatch(/cannot verify the purchase you type or paste/);
    expect(ws).toMatch(/there is no merchant cashback/);
    expect(ws).toMatch(/Nothing is a confirmed trade until on-chain settlement is verified/);
    expect(ws).toMatch(/Stockup never signs for you/);
    expect(flat(page.slice(0, page.indexOf('aria-label="Investment workspace"')))).toMatch(/nothing counts until BNB Chain settlement is verified/);
  });

  it('the hero says in plain words that shopping alone never buys stock, and implies no automatic purchase', () => {
    const page = readFileSync('src/app/page.tsx', 'utf8').replace(/\s+/g, ' ');
    const hero = readFileSync('src/components/hero-stage.tsx', 'utf8');
    expect(page).toMatch(/Shopping never buys stock by itself/);
    expect(page).not.toMatch(/auto-?(buy|invest|purchase)|automatically (buy|purchase|invest)/i);
    expect(hero).toMatch(/shopping alone buys nothing/);
    // the connector between the storefront and the token carries no arrowhead: only the user's own funding points at the token
    expect(hero).not.toMatch(/M 377 224 L 385 230/);
    expect(hero).not.toMatch(/M 164 307 L 170 315/);
  });

  it('the reference-price comparison shows a magnitude with fewer/more, never a minus sign next to the word', () => {
    expect(ui).toMatch(/Math\.abs\(res\.quote\.vsReferenceBps\) \/ 100/);
  });

  it('the result scrolls into view on every screen size, and respects reduced motion', () => {
    const start = ui.indexOf('const resultRef');
    const effect = ui.slice(start, ui.indexOf('[res]);', start) + 7);
    expect(effect).toMatch(/resultRef\.current\?\.scrollIntoView/);
    expect(effect).toMatch(/prefers-reduced-motion/);
    expect(effect).not.toMatch(/max-width/);
  });

  it('the development notice covers typed purchases, not only pasted receipts', () => {
    const page = readFileSync('src/app/page.tsx', 'utf8').replace(/\s+/g, ' ');
    expect(page).toMatch(/uses the merchant and amount exactly as you enter them/);
    expect(page).not.toMatch(/reads the receipt text you paste/);
  });
  it('the empty receipt panel no longer tells a manual user to paste', () => {
    const pp = readFileSync('src/components/paper-pair.tsx', 'utf8');
    expect(pp).toMatch(/typing the purchase into the form works too/);
    expect(pp).not.toMatch(/No receipt yet\. Paste text or use the sample/);
  });
  it('the guard line cannot contradict a blocked verdict (it speaks only about price impact and pool depth)', () => {
    expect(ui).not.toMatch(/All pre-trade checks passed/);
    expect(ui).toMatch(/Price impact and pool depth are within limits/);
  });
  it('both acknowledgement checkboxes are large, and each whole label is at least 44px tall', () => {
    expect(ui.split('\n').filter(l => l.includes('type="checkbox"') && l.includes('size-6')).length).toBe(2);
    expect((ui.match(/<label className="flex min-h-11 cursor-pointer items-start gap-3 py-1">/g) ?? []).length).toBe(2);
  });
  it('the form connect button is hidden while the review panel shows its own, and whenever a wallet is already connected', () => {
    expect(ui).toMatch(/const reviewConnectShown = !!\(res\?\.review && res\.plan\?\.tx\) && wallet\.status !== 'connected'/);
    expect(ui).toMatch(/\{!reviewConnectShown && wallet\.status !== 'connected' && <button type="button" onClick=\{connect\}/);
    // the wallet logic itself is untouched: one connect(), one sign(), authorize gating unchanged
    expect((ui.match(/async function connect\(\)/g) ?? []).length).toBe(1);
    expect(ui).toMatch(/disabled=\{!ack \|\| !confirm \|\| !!txHash \|\| wallet\.status !== 'connected'\}/);
  });
});
