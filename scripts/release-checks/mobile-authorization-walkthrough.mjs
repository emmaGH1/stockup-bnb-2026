// Mobile (390px) walkthrough of the review-and-authorize section: geometry, warnings, button states. Never presses Authorize.
// Usage: node mobile-authorization-walkthrough.mjs (edit the base URL inside). Needs playwright-core and a running server.
// Uses a PLACEHOLDER address (0x…0001) that happens to hold mainnet BNB: it proves layout and request flow only, never that our own wallet is funded.
// Mock wallet: eth_sendTransaction is never granted. Never signs, never broadcasts.
import { chromium } from 'playwright-core';
const exe = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const ACC = '0x0000000000000000000000000000000000000001'; // placeholder that holds BNB: lets the review panel render. Not our wallet.
const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const p = await ctx.newPage();
const errs = []; p.on('console', m => m.type() === 'error' && errs.push(m.text()));
await p.addInitScript(acc => { window.__calls = []; window.ethereum = { request: async ({ method }) => { window.__calls.push(method);
  if (method === 'eth_requestAccounts' || method === 'eth_accounts') return [acc];
  if (method === 'eth_chainId') return '0x38';
  throw new Error('blocked in test: ' + method); } }; }, ACC);
await p.goto('http://localhost:3941/', { waitUntil: 'networkidle' });
await p.getByRole('link', { name: 'Try the Amazon example' }).click(); await p.waitForTimeout(800);
await p.locator('input[placeholder="0x…"]').fill(ACC);
await p.getByRole('button', { name: 'Check and prepare my investment' }).click();
await p.waitForSelector('[aria-label="Review and authorize"]', { timeout: 90000 }); await p.waitForTimeout(1500);
const rev = p.locator('[aria-label="Review and authorize"]');
const measure = async (tag) => p.evaluate(tag => {
  const sec = document.querySelector('[aria-label="Review and authorize"]');
  const q = t => Array.from(sec.querySelectorAll('button')).find(b => b.textContent.trim() === t);
  const box = e => { if (!e) return null; const r = e.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), w: Math.round(r.width), inView: r.top >= 0 && r.bottom <= innerHeight, disabled: e.disabled }; };
  const cbs = Array.from(sec.querySelectorAll('input[type=checkbox]')).map(c => { const l = c.closest('label').getBoundingClientRect(); return { checkbox: Math.round(c.getBoundingClientRect().width) + 'x' + Math.round(c.getBoundingClientRect().height), labelHeight: Math.round(l.height), checked: c.checked }; });
  const text = sec.innerText.replace(/\s+/g, ' ');
  return { tag, scrollY: Math.round(scrollY), overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth, connect: box(q('Connect wallet to authorize')), authorize: box(q('Authorize in my wallet')), checkboxes: cbs,
    warnings: { real_bnb: /spends real BNB on BSC mainnet and cannot be undone/.test(text), review_exact: /authorizing this exact transaction/.test(text), wallet_confirm: /reject it/.test(text) }, fonts: { smallestText: Math.min(...Array.from(sec.querySelectorAll('*')).filter(e => e.children.length === 0 && e.textContent.trim()).map(e => parseFloat(getComputedStyle(e).fontSize))) } };
}, tag);
const log = [];
await rev.scrollIntoViewIfNeeded(); await p.evaluate(() => document.querySelector('[aria-label="Review and authorize"]').scrollIntoView({ block: 'start' })); await p.waitForTimeout(300);
log.push(await measure('1 panel top'));
await p.screenshot({ path: '/tmp/auth-shots/1-top.png' });
await p.evaluate(() => scrollBy(0, 560)); await p.waitForTimeout(300);
log.push(await measure('2 acknowledgements + connect'));
await p.screenshot({ path: '/tmp/auth-shots/2-acks.png' });
await rev.locator('label').nth(0).click(); await rev.locator('label').nth(1).click();
await p.getByRole('button', { name: 'Connect wallet to authorize' }).click(); await p.waitForTimeout(800);
await p.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Authorize in my wallet'); b.scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(300);
log.push(await measure('3 connected, acks ticked, Authorize ENABLED (not pressed)'));
await p.screenshot({ path: '/tmp/auth-shots/3-ready.png' });
console.log(JSON.stringify(log, null, 1));
console.log('wallet methods requested by the page:', await p.evaluate(() => window.__calls), '| console errors:', errs.length ? errs : 'none');
await b.close();
