// ONE authenticated, read-only GET (supported chains). No funds, no signing of transactions.
// Run once: node --env-file=.env --import tsx scripts/probe-w3w-auth.ts
// Result 2026-10-10: HTTP 200 with body code 40304 (compliance restriction). See docs/BLOCKERS.md.
// Do not re-run in a loop; each run is a real request to Binance.
// Credentials come from process.env via `node --env-file=.env`; this script never prints them.
export {};
import { w3w } from '../src/lib/w3w';
const r = await w3w('GET', '/api/v1/dex/balance/supported/chain?binanceChainId=56', undefined, process.env as never);
const j = r.json as Record<string, unknown>;
console.log(JSON.stringify({ httpStatus: r.status, code: j?.code ?? null, msg: j?.msg ?? j?.message ?? null, dataType: Array.isArray(j?.data) ? `array(${(j.data as unknown[]).length})` : typeof j?.data }));
process.exit(r.status === 200 && j?.code === '000000' ? 0 : 1);
