import { describe, it, expect } from 'vitest';
import { evaluateGuard } from '../src/lib/guard';
const open = { symbol: 'AAPLon', session: 'open', source: 'fixture' } as const;
const base = { status: open, impactBps: 50, maxImpactBps: 300, quotedOut: 1n, poolDepthBnb: 10, amountBnb: 0.1 };
describe('evaluateGuard', () => {
  it('allows a healthy trade', () => expect(evaluateGuard(base).allowed).toBe(true));
  it('blocks closed market, high impact, thin pool, no quote — and says why', () => {
    expect(evaluateGuard({ ...base, status: { ...open, session: 'closed' } }).reasons[0]).toMatch(/market closed/);
    expect(evaluateGuard({ ...base, impactBps: 900 }).reasons.join()).toMatch(/price impact 9.00%/);
    expect(evaluateGuard({ ...base, poolDepthBnb: 1 }).reasons.join()).toMatch(/under 20x/);
    expect(evaluateGuard({ ...base, quotedOut: 0n }).allowed).toBe(false);
    expect(evaluateGuard({ ...base, status: undefined }).allowed).toBe(false);
  });
});
