// DEVELOPMENT FIXTURES ONLY. Invented shapes for UI/logic development; NOT real W3W responses.
// Every value is tagged source:"fixture". Never use as evidence of integration.
export type MarketSession = 'open' | 'closed' | 'halted';
export interface SecurityStatus {
  symbol: string;
  session: MarketSession;
  haltReason?: 'earnings' | 'split' | 'dividend';
  source: 'fixture' | 'live';
}

export const FIXTURE_STATUS: SecurityStatus[] = [
  { symbol: 'AAPLon', session: 'open', source: 'fixture' },
  { symbol: 'JNJon', session: 'closed', source: 'fixture' },
  { symbol: 'USDon', session: 'open', source: 'fixture' },
];

export const FIXTURE_HALTED: SecurityStatus = { symbol: 'AAPLon', session: 'halted', haltReason: 'earnings', source: 'fixture' };
