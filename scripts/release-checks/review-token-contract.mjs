// reviewToken contract check (docs/UI_REQUEST_CONTRACT.md section 4).
// Usage: node review-token-contract.mjs http://localhost:PORT <label>. Needs playwright-core and a server started with REVIEW_HMAC_SECRET set (value never printed).
// Uses a PLACEHOLDER address (0x…0001) that happens to hold mainnet BNB: it proves layout and request flow only, never that our own wallet is funded.
// Mock wallet: eth_sendTransaction is never granted. Never signs, never broadcasts.
import { chromium } from 'playwright-core';
const exe = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const BASE = process.argv[2], MODE = process.argv[3]; // legacy | enforced
const ACCOUNT = '0x0000000000000000000000000000000000000001'; // placeholder that holds BNB: exercises the request flow only
const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const out = {};
async function session(mutate) {
  const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const seen = { own: null, settle: [], sent: 0, console: [] };
  p.on('console', m => m.type() === 'error' && seen.console.push(m.text()));
  await p.addInitScript(acc => { window.__sent = 0; window.ethereum = { request: async ({ method }) => {
    if (method === 'eth_requestAccounts' || method === 'eth_accounts') return [acc];
    if (method === 'eth_chainId') return '0x38';
    if (method === 'eth_sendTransaction') { window.__sent++; return '0x' + 'ab'.repeat(32); }
    throw new Error('unexpected method ' + method); } }; }, ACCOUNT);
  await p.route('**/api/own', async route => {
    const r = await route.fetch(); const j = await r.json();
    if (mutate?.own) mutate.own(j);
    seen.own = { status: r.status(), outcome: j.outcome, reviewBound: j.reviewBound, tokenPresent: !!j.reviewToken, expiresInSec: j.reviewExpiresAt ? j.reviewExpiresAt - Math.floor(Date.now() / 1000) : null };
    await route.fulfill({ response: r, json: j });
  });
  await p.route('**/api/settle', async route => {
    const body = JSON.parse(route.request().postData() || '{}');
    seen.settle.push({ hadToken: typeof body.reviewToken === 'string' && body.reviewToken.length > 0, fields: Object.keys(body).sort() });
    if (mutate?.settle) mutate.settle(body);
    const r = await route.fetch({ postData: JSON.stringify(body) });
    seen.settle[seen.settle.length - 1].status = r.status();
    await route.fulfill({ response: r });
  });
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.getByRole('link', { name: 'Try the Amazon example' }).click();
  await p.waitForTimeout(800);
  await p.getByRole('button', { name: 'Connect my browser wallet' }).click();
  await p.waitForTimeout(400);
  await p.getByRole('button', { name: 'Check and prepare my investment' }).click();
  await p.waitForSelector('[aria-label="Investment result"]', { timeout: 90000 });
  await p.waitForTimeout(1500);
  return { p, seen };
}
async function authorizeAndVerify(p) {
  const rev = p.locator('[aria-label="Review and authorize"]');
  await rev.locator('input[type=checkbox]').nth(0).check(); await rev.locator('input[type=checkbox]').nth(1).check();
  await p.getByRole('button', { name: 'Authorize in my wallet' }).click();
  await p.waitForTimeout(800);
}
// A. happy path: token issued, sent on settle
{ const { p, seen } = await session();
  out.A_issued = seen.own;
  if (seen.own.tokenPresent) {
    await authorizeAndVerify(p);
    await p.getByRole('button', { name: 'Verify settlement on-chain' }).click(); await p.waitForTimeout(3000);
    out.A_settle = seen.settle; out.A_mockWalletSendCalls = await p.evaluate(() => window.__sent);
    out.A_uiState = (await p.locator('[role=status] strong.uppercase').allInnerTexts()).slice(0, 2);
  }
  out.A_console = seen.console; await p.context().close(); }
// B. tamper: browser lowers minOut after the check
if (out.A_issued.tokenPresent) { const { p, seen } = await session({ settle: body => { body.minOutWei = '1'; } });
  await authorizeAndVerify(p); await p.getByRole('button', { name: 'Verify settlement on-chain' }).click(); await p.waitForTimeout(3000);
  out.B_tamper = { settle: seen.settle, uiText: (await p.locator('[role=status]').allInnerTexts()).filter(t => /check|details/i.test(t)).map(t => t.replace(/\s+/g, ' ').slice(0, 120)) }; await p.context().close(); }
// C. token stripped by the browser
if (out.A_issued.tokenPresent) { const { p, seen } = await session({ settle: body => { delete body.reviewToken; } });
  await authorizeAndVerify(p); await p.getByRole('button', { name: 'Verify settlement on-chain' }).click(); await p.waitForTimeout(3000);
  out.C_noToken = { settle: seen.settle, uiText: (await p.locator('[role=status]').allInnerTexts()).filter(t => /check|details/i.test(t)).map(t => t.replace(/\s+/g, ' ').slice(0, 120)) }; await p.context().close(); }
// D. expired authorization window (test manipulation of the response timestamp)
if (out.A_issued.tokenPresent) { const { p, seen } = await session({ own: j => { j.reviewExpiresAt = Math.floor(Date.now() / 1000) - 10; } });
  const rev = p.locator('[aria-label="Review and authorize"]');
  await rev.locator('input[type=checkbox]').nth(0).check(); await rev.locator('input[type=checkbox]').nth(1).check();
  await p.getByRole('button', { name: 'Authorize in my wallet' }).click(); await p.waitForTimeout(800);
  out.D_expired = { walletSendCalls: await p.evaluate(() => window.__sent), alert: (await p.locator('[role=alert]').allInnerTexts()).filter(Boolean) }; await p.context().close(); }
console.log(MODE, JSON.stringify(out, null, 1));
await b.close();
