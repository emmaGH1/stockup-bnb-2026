import { planBnbBuy, simulate } from '../src/lib/swap';
const AAPL = '0x390a684ef9cade28a7ad0dfa61ab1eb3842618c4';
const from = '0x000000000000000000000000000000000000dEaD'; // simulation-only address, holds nothing real
const plan = await planBnbBuy(AAPL, 100_000_000_000_000n, from); // 0.0001 BNB
console.log({ quotedOut: plan.quotedOut.toString(), minOut: plan.minOut.toString(), value: plan.value.toString() });
try { console.log('simulate:', await simulate(plan, from)); } catch (e) { console.log('simulate FAIL', String(e).slice(0, 300)); }
