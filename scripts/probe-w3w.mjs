// Read-only W3W probe. Skips cleanly without credentials. Logs no secrets.
import { w3w } from '../src/w3w-client.mjs';
if (!process.env.W3W_API_KEY) { console.log('SKIP: no W3W credentials (human must supply)'); process.exit(0); }
const r = await w3w('GET', '/api/v1/dex/balance/supported/chain?binanceChainId=56');
console.log(r.status, JSON.stringify(r.json).slice(0, 400));
