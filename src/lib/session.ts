import type { SecurityStatus } from './fixtures/w3w';

export interface TradeDecision { allowed: boolean; reason: string; source: SecurityStatus['source'] }

/** Pure off-market-state gate. A live trade must never proceed on closed/halted status. */
export function canTrade(s: SecurityStatus | undefined): TradeDecision {
  if (!s) return { allowed: false, reason: 'status unknown', source: 'fixture' };
  if (s.session === 'open') return { allowed: true, reason: 'market open', source: s.source };
  if (s.session === 'halted') return { allowed: false, reason: `halted${s.haltReason ? ` (${s.haltReason})` : ''}`, source: s.source };
  return { allowed: false, reason: 'market closed', source: s.source };
}
