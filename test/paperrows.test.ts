import { describe, it, expect } from 'vitest';
import { ownershipRows, isIssued, type PaperInput } from '../src/lib/paperrows';

const base: PaperInput = { res: null, txHash: '', settle: null, receipt: null };
const ident = { identification: { status: 'identified', company: { name: 'Amazon.com, Inc.', ticker: 'AMZN' } }, instrument: { symbol: 'AMZNon', address: '0x4553cfe1c09f37f38b12dc509f676964e392f8fc' },
  investment: { investUsd: 5 }, convertedBnb: '0.00665', eligibility: { eligible: true, blockedBy: [], unknown: [] } };
const get = (rows: ReturnType<typeof ownershipRows>, k: string) => rows.find(r => r.key === k)!;

describe('ownership rows', () => {
  it('starts fully blank: every row waiting, not issued', () => {
    expect(ownershipRows(base).every(r => r.state === 'waiting' && r.value === '')).toBe(true); expect(isIssued(base)).toBe(false);
  });
  it('fills only what is proven so far; eligible preview never shows holdings or settlement', () => {
    const rows = ownershipRows({ ...base, res: ident });
    expect(get(rows, 'company').state).toBe('done'); expect(get(rows, 'checks').state).toBe('done');
    expect(get(rows, 'auth').state).toBe('waiting'); expect(get(rows, 'settle').state).toBe('waiting'); expect(get(rows, 'owned').state).toBe('waiting');
    expect(isIssued({ ...base, res: ident })).toBe(false);
  });
  it('investment reads as planned until settlement is verified', () => {
    expect(get(ownershipRows({ ...base, res: ident }), 'invest').label).toBe('Planned, own funds');
    const settled = ownershipRows({ ...base, res: ident, txHash: '0x1', settle: { state: 'settled', blockNumber: '9' } });
    expect(get(settled, 'invest').label).toBe('Own funds in');
  });
  it('submitted transaction is labelled not confirmed and does not unlock ownership', () => {
    const rows = ownershipRows({ ...base, res: ident, txHash: '0x' + 'ab'.repeat(32) });
    expect(get(rows, 'auth').value).toMatch(/not confirmed/); expect(get(rows, 'owned').state).toBe('waiting');
  });
  it('pending / reverted / mismatch settlement never reach "You hold"', () => {
    for (const st of ['pending', 'reverted', 'mismatch', 'not_found']) {
      const rows = ownershipRows({ ...base, res: ident, txHash: '0x1', settle: { state: st }, receipt: { ok: false, reason: 'x' } });
      expect(get(rows, 'owned').state).not.toBe('done'); expect(isIssued({ ...base, receipt: { ok: false } })).toBe(false);
    }
  });
  it('only a verified receipt produces issued + holdings', () => {
    const i: PaperInput = { ...base, res: ident, txHash: '0x1', settle: { state: 'settled', blockNumber: '99' }, receipt: { ok: true, receipt: { onChain: { receivedTokens: '0.019', tokenSymbol: 'AMZNon', blockNumber: '99' } } } };
    expect(isIssued(i)).toBe(true); expect(get(ownershipRows(i), 'owned').value).toBe('0.019000 AMZNon');
  });
  it('blocked reasons are shown when a company or token is missing', () => {
    expect(get(ownershipRows({ ...base, res: { identification: { status: 'not_found' } } }), 'company').state).toBe('blocked');
    expect(get(ownershipRows({ ...base, res: { identification: ident.identification } }), 'instrument').value).toBe('no supported token');
  });
});
