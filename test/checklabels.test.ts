import { describe, it, expect } from 'vitest';
import { checkLabel } from '../src/lib/checks';
import { ownershipRows } from '../src/lib/paperrows';

describe('user-facing check labels', () => {
  it('maps every check id to plain language', () => {
    for (const id of ['market_status', 'route', 'wallet_funds', 'quote_validity', 'guard', 'fees']) {
      expect(checkLabel(id)).not.toMatch(/_/);
      expect(checkLabel(id).length).toBeGreaterThan(3);
    }
    expect(checkLabel('market_status')).toBe('market status');
  });
  it('ownership receipt never shows raw identifiers when blocked', () => {
    const rows = ownershipRows({
      res: { identification: { status: 'identified', company: { name: 'Starbucks Corporation', ticker: 'SBUX' } },
        instrument: { symbol: 'SBUXon', address: '0x94d7754541b829a87321d56121bc544167ac490d' },
        investment: { investUsd: 5 }, convertedBnb: '0.00664',
        eligibility: { eligible: false, blockedBy: ['market_status', 'route'], unknown: ['wallet_funds'] } },
      txHash: '', settle: null, receipt: null });
    const checks = rows.find(r => r.key === 'checks')!;
    expect(checks.value).toBe('market status, trading route, wallet funds (unknown)');
    expect(checks.value).not.toMatch(/_/);
  });
});
