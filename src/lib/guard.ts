import { canTrade } from './session';
import type { SecurityStatus } from './fixtures/w3w';

export interface GuardInput {
  status: SecurityStatus | undefined; impactBps: number; maxImpactBps: number;
  quotedOut: bigint; poolDepthBnb: number; amountBnb: number;
}
export interface GuardResult { allowed: boolean; reasons: string[]; sessionSource: 'fixture' | 'live' }

/** Pure pre-trade guard. Every failed check adds a reason; trade is allowed only when none fail. */
export function evaluateGuard(i: GuardInput): GuardResult {
  const reasons: string[] = [];
  const s = canTrade(i.status);
  if (!s.allowed) reasons.push(`session: ${s.reason}`);
  if (i.quotedOut <= 0n) reasons.push('no output quoted');
  if (i.impactBps > i.maxImpactBps) reasons.push(`price impact ${(i.impactBps / 100).toFixed(2)}% exceeds limit ${(i.maxImpactBps / 100).toFixed(2)}%`);
  if (i.poolDepthBnb < i.amountBnb * 20) reasons.push(`pool depth ${i.poolDepthBnb.toFixed(6)} BNB is under 20x trade size`);
  return { allowed: reasons.length === 0, reasons, sessionSource: s.source };
}
