// Pure model behind the receipt-to-ownership-receipt interface. Each ownership row is 'waiting' until the fact is PROVEN
// by real data; 'issued' requires a verified receipt from /api/receipt. No decorative success states.
export type RowState = 'done' | 'blocked' | 'waiting';
export interface PaperRow { key: string; label: string; state: RowState; value: string }
export interface PaperInput {
  res: null | {
    identification: { status: string; company?: { name: string; ticker: string } };
    instrument?: { symbol: string; address: string };
    investment?: { investUsd: number };
    convertedBnb?: string;
    eligibility?: { eligible: boolean; blockedBy: string[]; unknown: string[] };
  };
  txHash: string;
  settle: null | { state: string; blockNumber?: string };
  receipt: null | { ok: boolean; reason?: string; receipt?: { onChain: { receivedTokens: string; tokenSymbol: string; blockNumber: string } } };
}

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const usd = (n: number) => `$${n.toFixed(2)}`;

export function ownershipRows(i: PaperInput): PaperRow[] {
  const r = i.res;
  const rows: PaperRow[] = [];
  rows.push(!r ? { key: 'company', label: 'Company', state: 'waiting', value: '' }
    : r.identification.status === 'identified' && r.identification.company
      ? { key: 'company', label: 'Company', state: 'done', value: `${r.identification.company.name} (${r.identification.company.ticker})` }
      : { key: 'company', label: 'Company', state: 'blocked', value: r.identification.status === 'ambiguous' ? 'more than one match' : 'no public company matched' });
  rows.push(r?.instrument ? { key: 'instrument', label: 'Instrument', state: 'done', value: `${r.instrument.symbol} ${short(r.instrument.address)}` }
    : r && r.identification.status === 'identified' ? { key: 'instrument', label: 'Instrument', state: 'blocked', value: 'no supported token' }
    : { key: 'instrument', label: 'Instrument', state: 'waiting', value: '' });
  rows.push(r?.investment && r.instrument ? { key: 'invest', label: i.settle?.state === 'settled' ? 'Own funds in' : 'Planned, own funds', state: 'done', value: `${usd(r.investment.investUsd)} ≈ ${r.convertedBnb} BNB` }
    : { key: 'invest', label: 'Planned, own funds', state: 'waiting', value: '' });
  rows.push(!r?.eligibility ? { key: 'checks', label: 'Checks', state: 'waiting', value: '' }
    : r.eligibility.eligible ? { key: 'checks', label: 'Checks', state: 'done', value: 'all required passed' }
    : { key: 'checks', label: 'Checks', state: 'blocked', value: [...r.eligibility.blockedBy, ...r.eligibility.unknown.map(u => `${u}?`)].join(', ') || 'not eligible' });
  rows.push(i.txHash ? { key: 'auth', label: 'Submitted', state: 'done', value: `${short(i.txHash)} (not confirmed)` } : { key: 'auth', label: 'Submitted', state: 'waiting', value: '' });
  const s = i.settle;
  rows.push(!s ? { key: 'settle', label: 'Settlement', state: 'waiting', value: '' }
    : s.state === 'settled' ? { key: 'settle', label: 'Settlement', state: 'done', value: `verified, block ${s.blockNumber}` }
    : s.state === 'pending' ? { key: 'settle', label: 'Settlement', state: 'waiting', value: 'pending' }
    : { key: 'settle', label: 'Settlement', state: 'blocked', value: s.state });
  const rc = i.receipt;
  rows.push(rc?.ok && rc.receipt ? { key: 'owned', label: 'You hold', state: 'done', value: `${Number(rc.receipt.onChain.receivedTokens).toFixed(6)} ${rc.receipt.onChain.tokenSymbol}` }
    : rc && !rc.ok ? { key: 'owned', label: 'You hold', state: 'blocked', value: 'not issued' }
    : { key: 'owned', label: 'You hold', state: 'waiting', value: '' });
  return rows;
}

/** Issued only when a verified receipt exists. Nothing else can produce this. */
export const isIssued = (i: PaperInput) => !!(i.receipt?.ok && i.receipt.receipt);
