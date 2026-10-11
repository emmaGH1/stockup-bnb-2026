// Live-site audit (run from a dev machine with playwright-core and a Chromium headless shell). Reads the page, drives the form, and injects a mock EIP-1193 provider. Never clicks Authorize.
import { chromium } from 'playwright-core';
const exe = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const U = process.argv[2];
// Mock-provider account only. Use a wallet you control (or a throwaway address); the old fixed address holds real BNB on mainnet.
const RECIPIENT = process.env.AUDIT_ACCOUNT ?? (() => { throw new Error('set AUDIT_ACCOUNT=<mock account address>'); })();
const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });

async function session(label, { width, provider }) {
  const ctx = await b.newContext({ viewport: { width, height: 900 } });
  if (provider) await ctx.addInitScript(provider);
  const p = await ctx.newPage();
  const console_ = [], failed = [], http = [];
  p.on('console', m => { if (['error', 'warning'].includes(m.type())) console_.push(`${m.type()}: ${m.text().slice(0, 160)}`); });
  p.on('pageerror', e => console_.push('pageerror: ' + e.message.slice(0, 160)));
  p.on('requestfailed', r => failed.push(`${r.failure()?.errorText} ${r.url().slice(0, 100)}`));
  p.on('response', r => { if (r.status() >= 400) http.push(`${r.status()} ${r.request().method()} ${r.url().slice(0, 100)}`); });
  await p.goto(U, { waitUntil: 'networkidle', timeout: 60000 });
  return { ctx, p, console_, failed, http };
}

const layoutProblems = async (p) => p.evaluate(() => {
  const out = [];
  const vw = document.documentElement.clientWidth;
  if (document.documentElement.scrollWidth > vw + 1) out.push(`page scrolls sideways by ${document.documentElement.scrollWidth - vw}px`);
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right > vw + 1 && getComputedStyle(el).position !== 'fixed') { out.push(`off-screen: <${el.tagName.toLowerCase()}> ${(el.innerText || '').trim().slice(0, 40)}`); if (out.length > 6) break; }
    if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA' && el.scrollWidth > el.clientWidth + 2 && ['hidden', 'clip'].includes(getComputedStyle(el).overflowX)) out.push(`clipped text in <${el.tagName.toLowerCase()}>: ${(el.innerText || '').trim().slice(0, 40)}`);
  }
  for (const img of document.images) if (!img.complete || img.naturalWidth === 0) out.push(`broken image ${img.src.slice(0, 80)}`);
  return out.slice(0, 8);
});

const results = [];
// 1) Layout + console + network at desktop and mobile, no wallet present
for (const [name, width] of [['desktop', 1280], ['mobile', 390]]) {
  const s = await session(name, { width });
  await s.p.getByText('Optional: paste a receipt').click(); await s.p.getByText('Use a sample').click();
  await s.p.getByRole('button', { name: 'Read receipt' }).click();
  await s.p.getByPlaceholder('0x…').fill(RECIPIENT);
  await s.p.getByRole('button', { name: /Check and prepare my investment/ }).click();
  await s.p.waitForSelector('text=Execution eligibility', { timeout: 120000 });
  await s.p.waitForTimeout(500);
  results.push({ section: `layout+network (${name})`, layout: await layoutProblems(s.p), console: s.console_, failed: s.failed, http: s.http });
  await s.p.screenshot({ path: `/tmp/shots/audit-${name}.png`, fullPage: true });
  await s.ctx.close();
}

// 2) Wallet scenarios on desktop
const mk = (accounts, chain, reject = false) => `(() => { const log = []; window.__log = log;
  window.ethereum = { request: async ({ method }) => { log.push(method);
    if (method === 'eth_requestAccounts') { if (${reject}) throw new Error('User rejected'); return ${JSON.stringify(accounts)}; }
    if (method === 'eth_accounts') return ${JSON.stringify(accounts)};
    if (method === 'eth_chainId') return '${chain}';
    throw new Error('blocked by audit: ' + method); } }; })();`;
const scenarios = [
  ['W1 no wallet', null],
  ['W2 wallet rejects connect', mk([], '0x38', true)],
  ['W3 wallet on Ethereum (wrong chain)', mk([RECIPIENT], '0x1')],
  ['W4 wallet on BSC, account matches', mk([RECIPIENT], '0x38')],
];
for (const [label, prov] of scenarios) {
  const s = await session(label, { width: 1280, provider: prov });
  await s.p.getByText('Optional: paste a receipt').click(); await s.p.getByText('Use a sample').click(); await s.p.getByRole('button', { name: 'Read receipt' }).click();
  await s.p.getByPlaceholder('0x…').fill(RECIPIENT);
  await s.p.getByRole('button', { name: /Check and prepare my investment/ }).click();
  await s.p.waitForSelector('text=Execution eligibility', { timeout: 120000 });
  await s.p.getByRole('button', { name: 'Connect my browser wallet' }).click();
  await s.p.waitForTimeout(400);
  const status = (await s.p.locator('[role=status]').allInnerTexts()).map(t => t.split('\n')[0].slice(0, 110));
  const alert = await s.p.locator('[role=alert]').allInnerTexts();
  const authDisabled = await s.p.getByRole('button', { name: 'Authorize in my wallet' }).isDisabled().catch(() => 'n/a');
  const methods = prov ? await s.p.evaluate(() => window.__log) : [];
  const unsafe = methods.filter(m => /sign|sendTransaction|personal_|switch/.test(m));
  results.push({ section: label, status, alert: alert.map(a => a.slice(0, 110)), authorizeDisabled: authDisabled, methods, unsafeMethods: unsafe, console: s.console_, failed: s.failed, http: s.http });
  await s.ctx.close();
}
await b.close();
console.log(JSON.stringify(results, null, 1));
