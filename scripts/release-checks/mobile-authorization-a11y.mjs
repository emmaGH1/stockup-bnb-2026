// Mobile (390px) authorization-section accessibility check: WCAG AA contrast, control names, keyboard focus.
// Usage: node mobile-authorization-a11y.mjs (edit the base URL inside). Needs playwright-core and a running server.
// Uses a PLACEHOLDER address (0x…0001) that happens to hold mainnet BNB: it proves layout and request flow only, never that our own wallet is funded.
// Mock wallet: eth_sendTransaction is never granted. Never signs, never broadcasts.
import { chromium } from 'playwright-core';
const exe = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const ACC = '0x0000000000000000000000000000000000000001';
const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true })).newPage();
await p.addInitScript(acc => { window.ethereum = { request: async ({ method }) => { if (method === 'eth_requestAccounts' || method === 'eth_accounts') return [acc]; if (method === 'eth_chainId') return '0x38'; throw new Error('blocked'); } }; }, ACC);
await p.goto('http://localhost:3941/', { waitUntil: 'networkidle' });
await p.getByRole('link', { name: 'Try the Amazon example' }).click(); await p.waitForTimeout(800);
await p.locator('input[placeholder="0x…"]').fill(ACC);
await p.getByRole('button', { name: 'Check and prepare my investment' }).click();
await p.waitForSelector('[aria-label="Review and authorize"]', { timeout: 90000 }); await p.waitForTimeout(1500);
const res = await p.evaluate(() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1; const cx = cv.getContext('2d', { willReadFrequently: true });
  const rgba = c => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const over = (f, bg) => [0, 1, 2].map(i => f[i] * f[3] + bg[i] * (1 - f[3]));
  const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const L = c => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const ratio = (a, b2) => { const x = L(a), y = L(b2); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const bgOf = el => { const stack = []; for (let e = el; e; e = e.parentElement) { const c = rgba(getComputedStyle(e).backgroundColor); if (c[3] > 0) stack.push(c); if (c[3] >= 1) break; } let base = [255, 255, 255]; for (let i = stack.length - 1; i >= 0; i--) base = over(stack[i], base); return base; };
  const fails = [], seen = new Set();
  for (const root of ['[aria-label="Investment result"]', '[aria-label="Review and authorize"]', 'form']) {
    for (const el of document.querySelectorAll(root + ' *')) {
      if (el.closest('svg') || [...el.childNodes].every(n => n.nodeType !== 3 || !n.textContent.trim())) continue;
      if (el.disabled || el.closest('button:disabled')) continue; // disabled controls are exempt (WCAG 1.4.3)
      const cs = getComputedStyle(el); const bg = bgOf(el); const fg = over(rgba(cs.color), bg);
      const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight) >= 700; const large = size >= 24 || (size >= 18.66 && bold);
      const r = ratio(fg, bg); const need = large ? 3 : 4.5;
      const key = el.textContent.trim().slice(0, 40) + '|' + r.toFixed(2);
      if (r < need && !seen.has(key)) { seen.add(key); fails.push({ text: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 44), ratio: +r.toFixed(2), need, size, tag: el.tagName }); }
    }
  }
  const unnamed = [...document.querySelectorAll('button, a[href], input, summary, select, textarea')].filter(e => { const r = e.getBoundingClientRect(); if (!r.width) return false; const name = (e.getAttribute('aria-label') || e.labels?.[0]?.textContent || e.textContent || e.getAttribute('placeholder') || '').trim(); return !name; }).map(e => e.tagName + ':' + (e.type || ''));
  return { contrastFailures: fails, unnamedControls: unnamed };
});
console.log(JSON.stringify(res, null, 1));
// keyboard focus visibility on the safety controls
const rev = p.locator('[aria-label="Review and authorize"]');
await rev.locator('label').nth(0).click(); await rev.locator('label').nth(1).click();
await p.getByRole('button', { name: 'Connect wallet to authorize' }).click(); await p.waitForTimeout(600);
const focus = {};
for (const [name, loc] of [['ack checkbox 1', rev.locator('input[type=checkbox]').nth(0)], ['ack checkbox 2', rev.locator('input[type=checkbox]').nth(1)], ['Authorize button', p.getByRole('button', { name: 'Authorize in my wallet' })]]) {
  await loc.focus(); await p.keyboard.press('Shift+Tab'); await p.keyboard.press('Tab');
  focus[name] = await p.evaluate(() => { const e = document.activeElement; const cs = getComputedStyle(e); const ring = e.matches(':focus-visible'); return { focusVisible: ring, outline: cs.outlineStyle + ' ' + cs.outlineWidth, boxShadow: cs.boxShadow === 'none' ? 'none' : 'set' }; });
}
console.log('keyboard focus:', JSON.stringify(focus));
await b.close();
