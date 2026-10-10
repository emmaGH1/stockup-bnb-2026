// Step 9: ownership receipt. Issued ONLY for a final, verified settlement. Separates facts proven on-chain
// from context the app merely recorded. Every on-chain fact carries a link anyone can open independently.
import { keccak256, toHex, getAddress } from 'viem';
import { isFinal, type Settlement } from './settle';
import { readBalance, readToken } from './bsc';
import { fetchTokenList } from './instruments';

const SCAN = 'https://bscscan.com';

export interface PurchaseContext { merchantInput: string; companyName: string; ticker: string; spendUsd: number; investUsd: number; sharesPerToken: number | null }
export interface Receipt {
  receiptId: string; issuedAt: string; chain: 'BNB Smart Chain (56)';
  onChain: { txHash: string; blockNumber: string; confirmations: number; tokenSymbol: string; tokenAddress: string; holder: string;
    receivedTokens: string; authorizedMinimum: string; gasCostBnb: string; holderBalanceNow: string | null; belowQuotePct: number | null };
  links: { tx: string; token: string; holderOnToken: string };
  recordedByApp: PurchaseContext & { note: string };
  exposure: { sharesApprox: number | null; basis: string };
  verifyYourself: string[];
  limits: string[];
}
export type ReceiptResult = { ok: true; receipt: Receipt } | { ok: false; reason: string };

export interface Listed { ticker: string; symbol: string; multiplier: number }
export interface ReceiptDeps { balanceOf?: typeof readBalance; token?: typeof readToken; now?: () => Date; listing?: (token: string) => Promise<Listed | null> }

/** Is this token on Binance's BSC tokenized-stock list? Returns list-sourced ticker/multiplier, or null. */
export async function lookupListing(token: string): Promise<Listed | null> {
  const t = getAddress(token).toLowerCase();
  const hit = (await fetchTokenList()).find(x => x.chainId === '56' && x.contractAddress.toLowerCase() === t);
  return hit ? { ticker: hit.ticker, symbol: hit.symbol, multiplier: Number(hit.multiplier) || 1 } : null;
}

export async function issueReceipt(settlement: Settlement, token: string, ctx: PurchaseContext, deps: ReceiptDeps = {}): Promise<ReceiptResult> {
  if (settlement.state !== 'settled') return { ok: false, reason: `No receipt: settlement state is "${settlement.state}", not settled.` };
  if (!isFinal(settlement)) return { ok: false, reason: `No receipt yet: ${settlement.confirmations} confirmation(s); waiting for enough blocks to be final.` };
  const tokenAddr = getAddress(token), holder = getAddress(settlement.recipient);
  const listing = await (deps.listing ?? lookupListing)(tokenAddr).catch(() => undefined);
  if (listing === undefined) return { ok: false, reason: 'No receipt: could not confirm the token against the Binance tokenized-stock list.' };
  if (listing === null) return { ok: false, reason: 'No receipt: this token is not on the Binance tokenized-stock list, so Stockup will not issue an ownership receipt for it.' };
  const meta = await (deps.token ?? readToken)(tokenAddr).catch(() => null);
  if (!meta) return { ok: false, reason: 'No receipt: could not read the token contract.' };
  if (meta.symbol !== listing.symbol) return { ok: false, reason: 'No receipt: on-chain symbol does not match the listing.' };
  const bal = await (deps.balanceOf ?? readBalance)(tokenAddr, holder).catch(() => null);
  const received = Number(settlement.receivedTokens);
  const receiptId = 'SU-' + keccak256(toHex(`${settlement.txHash}:${holder}:${tokenAddr}`)).slice(2, 14).toUpperCase();
  const sharesPerToken = listing.multiplier; // from the list, never from the client
  const shares = Number.isFinite(received) ? received * sharesPerToken : null;
  return { ok: true, receipt: {
    receiptId, issuedAt: (deps.now?.() ?? new Date()).toISOString(), chain: 'BNB Smart Chain (56)',
    onChain: { txHash: settlement.txHash, blockNumber: settlement.blockNumber, confirmations: settlement.confirmations, tokenSymbol: meta.symbol, tokenAddress: tokenAddr,
      holder, receivedTokens: settlement.receivedTokens, authorizedMinimum: settlement.minTokens, gasCostBnb: settlement.gasCostBnb, holderBalanceNow: bal,
      belowQuotePct: settlement.vsQuotedBps != null ? settlement.vsQuotedBps / 100 : null },
    links: { tx: `${SCAN}/tx/${settlement.txHash}`, token: `${SCAN}/token/${tokenAddr}`, holderOnToken: `${SCAN}/token/${tokenAddr}?a=${holder}` },
    recordedByApp: { ...ctx, ticker: listing.ticker, sharesPerToken, note: 'The spending event was entered manually (or simulated) in this session; Stockup did not see a card, bank or merchant record. The investment was paid from your own funds; there is no merchant cashback or reward. None of this is on-chain or independently verified.' },
    exposure: { sharesApprox: shares, basis: `tokens received x ${sharesPerToken} shares per token (Binance list multiplier)` },
    verifyYourself: [
      `Open the transaction link and confirm status Success, block ${settlement.blockNumber}, and that it was sent to the PancakeSwap V2 router.`,
      `Open the token link and confirm the symbol is ${meta.symbol} at ${tokenAddr}.`,
      `Open the holder link and confirm ${holder} holds the tokens.`,
    ],
    limits: [
      'This token is an Ondo tokenized exposure to the stock, not direct share ownership; Ondo and Binance terms and any regional restrictions apply.',
      'The receipt proves a token transfer on BSC. It is not an account statement, tax document or investment advice.',
      'holderBalanceNow is read live and can change if you later move the tokens.',
    ] } };
}
