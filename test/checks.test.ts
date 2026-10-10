import { describe, it, expect } from 'vitest';
import { checkMarketStatus, estimateFees, checkFees, checkQuoteValidity, checkWalletFunds, executionEligibility, QUOTE_TTL_MS, type Check } from '../src/lib/checks';

const open = { openState: true, reasonCode: 'TRADING', reasonMsg: null };
describe('market status', () => {
  it('passes when open, fails closed/paused/limited, unknown when missing', () => {
    expect(checkMarketStatus({ asset: open, market: null }).state).toBe('pass');
    expect(checkMarketStatus({ asset: { openState: false, reasonCode: 'MARKET_CLOSED', reasonMsg: 'Weekend or Holiday' }, market: null })).toMatchObject({ state: 'fail' });
    expect(checkMarketStatus({ asset: { openState: false, reasonCode: 'ASSET_PAUSED', reasonMsg: 'stock_split' }, market: null }).detail).toMatch(/stock_split/);
    expect(checkMarketStatus({ asset: { openState: true, reasonCode: 'ASSET_LIMITED', reasonMsg: 'earnings' }, market: null }).state).toBe('fail');
    expect(checkMarketStatus({ asset: null, market: null }).state).toBe('unknown');
  });
});
describe('fees', () => {
  it('computes pool fee + gas', () => {
    const f = estimateFees({ investUsd: 100, bnbUsd: 600, gasUnits: 150_000n, gasPriceWei: 1_000_000_000n });
    expect(f.poolFeeUsd).toBeCloseTo(0.25); expect(f.gasBnb).toBeCloseTo(0.00015); expect(f.gasUsd).toBeCloseTo(0.09); expect(f.totalPct).toBeCloseTo(0.34);
    expect(checkFees(f, 100).state).toBe('pass');
  });
  it('fails over the limit and is unknown without gas data', () => {
    expect(checkFees(estimateFees({ investUsd: 5, bnbUsd: 600, gasUnits: 150_000n, gasPriceWei: 50_000_000_000n }), 5).state).toBe('fail');
    expect(checkFees(estimateFees({ investUsd: 5, bnbUsd: 600, gasUnits: null, gasPriceWei: null }), 5).state).toBe('unknown');
  });
});
describe('quote validity', () => {
  const base = { quotedAtMs: 1_000_000, simulated: true, minOut: 0.9, quotedOut: 1 };
  it('passes fresh, fails stale / unsimulated / inconsistent', () => {
    expect(checkQuoteValidity({ ...base, nowMs: 1_000_000 + 30_000 }).state).toBe('pass');
    expect(checkQuoteValidity({ ...base, nowMs: 1_000_000 + QUOTE_TTL_MS + 1 }).detail).toMatch(/Requote/);
    expect(checkQuoteValidity({ ...base, nowMs: 1_000_000, simulated: false }).state).toBe('fail');
    expect(checkQuoteValidity({ ...base, nowMs: 1_000_000, minOut: 2 }).state).toBe('fail');
  });
});
describe('wallet funds', () => {
  it('requires trade plus gas reserve', () => {
    expect(checkWalletFunds({ balanceBnb: 1, tradeBnb: 0.0066, gasBnb: 0.0001 }).state).toBe('pass');
    expect(checkWalletFunds({ balanceBnb: 0.0066, tradeBnb: 0.0066, gasBnb: 0.0001 }).state).toBe('fail');
    expect(checkWalletFunds({ balanceBnb: null, tradeBnb: 1, gasBnb: null }).state).toBe('unknown');
  });
});
describe('eligibility', () => {
  const c = (id: string, state: Check['state'], required = true): Check => ({ id, label: id, state, detail: '', source: '', required });
  it('requires every required check to pass; unknown blocks', () => {
    expect(executionEligibility([c('a', 'pass'), c('b', 'pass')]).eligible).toBe(true);
    expect(executionEligibility([c('a', 'pass'), c('b', 'unknown')])).toMatchObject({ eligible: false, unknown: ['b'] });
    expect(executionEligibility([c('a', 'fail'), c('b', 'pass')])).toMatchObject({ eligible: false, blockedBy: ['a'] });
    expect(executionEligibility([c('a', 'pass'), c('x', 'fail', false)]).eligible).toBe(true);
  });
});
