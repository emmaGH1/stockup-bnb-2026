// Step 6: pre-execution checklist. Each check is pass | fail | unknown with its source.
// "unknown" is never treated as a pass: execution eligibility requires every REQUIRED check to pass.
export type CheckState = 'pass' | 'fail' | 'unknown';
export interface Check { id: string; label: string; state: CheckState; detail: string; source: string; required: boolean }

export const QUOTE_TTL_MS = 120_000;            // our own deadline: calldata expires 120s after build
export const FEE_RATE_PANCAKE_V2 = 0.0025;      // PancakeSwap V2 router pool fee (0.25%), protocol constant
export const MIN_GAS_RESERVE_BNB = 0.002;       // wallet must keep this much BNB beyond the trade for gas

export interface MarketStatusInput { asset: { openState: boolean; reasonCode: string; reasonMsg: string | null } | null; market: { openState: boolean; reasonCode: string | null } | null }

export function checkMarketStatus(i: MarketStatusInput): Check {
  const base = { id: 'market_status', label: 'Market and asset trading status', source: 'Binance Web3 public RWA status endpoints', required: true };
  if (!i.asset) return { ...base, state: 'unknown', detail: 'Asset status unavailable; treated as not tradable.' };
  if (i.asset.reasonCode === 'ASSET_PAUSED' || i.asset.reasonCode === 'MARKET_PAUSED') return { ...base, state: 'fail', detail: `Paused: ${i.asset.reasonMsg ?? i.asset.reasonCode}.` };
  if (i.asset.reasonCode === 'ASSET_LIMITED') return { ...base, state: 'fail', detail: `Restricted: ${i.asset.reasonMsg ?? 'limited'}.` };
  if (!i.asset.openState) return { ...base, state: 'fail', detail: `Asset not open: ${i.asset.reasonCode}${i.asset.reasonMsg ? ` (${i.asset.reasonMsg})` : ''}.` };
  return { ...base, state: 'pass', detail: `Asset ${i.asset.reasonCode}.` };
}

export interface FeeInput { investUsd: number; bnbUsd: number; gasUnits: bigint | null; gasPriceWei: bigint | null; dexFeeRate?: number }
export interface FeeBreakdown { poolFeeUsd: number; gasBnb: number | null; gasUsd: number | null; totalUsd: number | null; totalPct: number | null }

export function estimateFees(i: FeeInput): FeeBreakdown {
  const poolFeeUsd = i.investUsd * (i.dexFeeRate ?? FEE_RATE_PANCAKE_V2);
  if (i.gasUnits === null || i.gasPriceWei === null) return { poolFeeUsd, gasBnb: null, gasUsd: null, totalUsd: null, totalPct: null };
  const gasBnb = Number(i.gasUnits * i.gasPriceWei) / 1e18, gasUsd = gasBnb * i.bnbUsd, totalUsd = poolFeeUsd + gasUsd;
  return { poolFeeUsd, gasBnb, gasUsd, totalUsd, totalPct: i.investUsd > 0 ? (totalUsd / i.investUsd) * 100 : null };
}

export function checkFees(f: FeeBreakdown, investUsd: number, maxFeePct = 5): Check {
  const base = { id: 'fees', label: 'Fees', source: 'PancakeSwap V2 0.25% pool fee (protocol constant) + estimated gas (eth_estimateGas x gasPrice). Binance Web3 Wallet trading fees are NOT included.', required: true };
  if (f.totalUsd === null || f.totalPct === null) return { ...base, state: 'unknown', detail: `Pool fee $${f.poolFeeUsd.toFixed(4)}; gas estimate unavailable.` };
  const detail = `Pool fee $${f.poolFeeUsd.toFixed(4)} + gas ~$${f.gasUsd!.toFixed(4)} = $${f.totalUsd.toFixed(4)} (${f.totalPct.toFixed(2)}% of $${investUsd.toFixed(2)}).`;
  return { ...base, state: f.totalPct <= maxFeePct ? 'pass' : 'fail', detail: f.totalPct <= maxFeePct ? detail : `${detail} Exceeds ${maxFeePct}% limit.` };
}

export function checkQuoteValidity(i: { quotedAtMs: number; nowMs: number; simulated: boolean; minOut: number; quotedOut: number }): Check {
  const base = { id: 'quote_validity', label: 'Quote validity', source: 'On-chain getAmountsOut + eth_call simulation at quote time', required: true };
  const age = i.nowMs - i.quotedAtMs;
  if (!i.simulated) return { ...base, state: 'fail', detail: 'Simulation did not succeed.' };
  if (!(i.quotedOut > 0) || !(i.minOut > 0) || i.minOut > i.quotedOut) return { ...base, state: 'fail', detail: 'Quote amounts are inconsistent.' };
  if (age > QUOTE_TTL_MS) return { ...base, state: 'fail', detail: `Quote is ${(age / 1000).toFixed(0)}s old; expires after ${QUOTE_TTL_MS / 1000}s. Requote required.` };
  return { ...base, state: 'pass', detail: `Simulated OK; ${(age / 1000).toFixed(0)}s old; valid for ${((QUOTE_TTL_MS - age) / 1000).toFixed(0)}s more.` };
}

export interface WalletInput { balanceBnb: number | null; tradeBnb: number; gasBnb: number | null }
export function checkWalletFunds(w: WalletInput): Check {
  const base = { id: 'wallet_funds', label: 'Wallet funds for trade + gas', source: 'eth_getBalance on BSC mainnet for the entered address', required: true };
  if (w.balanceBnb === null) return { ...base, state: 'unknown', detail: 'Balance unavailable.' };
  const need = w.tradeBnb + Math.max(w.gasBnb ?? 0, MIN_GAS_RESERVE_BNB);
  return w.balanceBnb >= need
    ? { ...base, state: 'pass', detail: `Balance ${w.balanceBnb.toFixed(6)} BNB covers ${need.toFixed(6)} BNB (trade + gas reserve).` }
    : { ...base, state: 'fail', detail: `Balance ${w.balanceBnb.toFixed(6)} BNB is below the ${need.toFixed(6)} BNB needed (trade + gas reserve).` };
}

export interface Eligibility { eligible: boolean; blockedBy: string[]; unknown: string[] }
/** Eligible only if every required check passes. Unknown is a block, not a pass. */
export function executionEligibility(checks: Check[]): Eligibility {
  const req = checks.filter(c => c.required);
  return { eligible: req.every(c => c.state === 'pass'), blockedBy: req.filter(c => c.state === 'fail').map(c => c.id), unknown: req.filter(c => c.state === 'unknown').map(c => c.id) };
}
