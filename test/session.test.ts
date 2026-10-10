import { describe, it, expect } from 'vitest';
import { canTrade } from '../src/lib/session';
import { FIXTURE_HALTED, FIXTURE_STATUS } from '../src/lib/fixtures/w3w';
import { getStatuses } from '../src/lib/status';

describe('canTrade', () => {
  it('allows open, blocks closed/halted/unknown', () => {
    expect(canTrade(FIXTURE_STATUS[0]).allowed).toBe(true);
    expect(canTrade(FIXTURE_STATUS[1])).toMatchObject({ allowed: false, reason: 'market closed' });
    expect(canTrade(FIXTURE_HALTED).reason).toBe('halted (earnings)');
    expect(canTrade(undefined).allowed).toBe(false);
  });
  it('status provider is honest about fixture mode', () => {
    const r = getStatuses();
    expect(r.mode).toBe('fixture');
    expect(r.statuses.every(s => s.source === 'fixture')).toBe(true);
  });
});
