export {};
// Read-only probe of Binance Web3 PUBLIC RWA endpoints (no credentials). Checks that the live response
// contains the fields our code depends on. Exit code 1 if a required field is missing. Never sends anything.
const H = { 'Accept-Encoding': 'identity', 'User-Agent': 'binance-web3/1.1 (Skill)' };
const BASE = 'https://www.binance.com/bapi/defi/v1/public/wallet-direct/buw/wallet/market/token/rwa';
const AMZN = '0x4553cfe1c09f37f38b12dc509f676964e392f8fc';
const checks: { name: string; url: string; need: (d: any) => string[] }[] = [
  { name: 'token list (type=1)', url: `${BASE}/stock/detail/list/ai?type=1`,
    need: d => { const r = d.data?.[0] ?? {}; return ['chainId', 'contractAddress', 'symbol', 'ticker', 'multiplier'].filter(k => !(k in r)); } },
  { name: 'asset market status', url: `${BASE}/asset/market/status/ai?chainId=56&contractAddress=${AMZN}`,
    need: d => ['openState', 'marketStatus', 'reasonCode', 'nextOpenTime'].filter(k => !(k in (d.data ?? {}))) },
  { name: 'market status (global)', url: `${BASE}/market/status/ai`,
    need: d => ['openState', 'reasonCode', 'nextOpen'].filter(k => !(k in (d.data ?? {}))) },
  { name: 'meta (company info)', url: `${BASE}/meta/ai?chainId=56&contractAddress=${AMZN}`,
    need: d => ['name', 'symbol', 'ticker', 'companyInfo'].filter(k => !(k in (d.data ?? {}))) },
];
let failed = 0;
for (const c of checks) {
  try {
    const res = await fetch(c.url, { headers: H, signal: AbortSignal.timeout(15000) });
    const j: any = await res.json();
    const missing = res.ok && j.code === '000000' ? c.need(j) : ['(http ' + res.status + ' code ' + j.code + ')'];
    if (missing.length) failed++;
    console.log(`${missing.length ? 'FAIL' : 'PASS'} ${c.name}${missing.length ? ' missing: ' + missing.join(', ') : ''}`);
  } catch (e) { failed++; console.log(`FAIL ${c.name}: ${String(e).slice(0, 100)}`); }
}
process.exit(failed ? 1 : 0);
