import { describe, it, expect } from 'vitest';
import { parseReceiptText, SAMPLE_RECEIPT } from '../src/lib/receipttext';

describe('parseReceiptText', () => {
  it('reads merchant and TOTAL from the sample, ignoring subtotal/tax/shipping', () => {
    const r = parseReceiptText(SAMPLE_RECEIPT);
    expect(r.merchantLine).toBe('AMAZON.COM*2K4'); expect(r.totalUsd).toBe(100); expect(r.warnings).toEqual([]);
  });
  it('handles thousands separators and "Amount Due"', () => {
    expect(parseReceiptText('Apple Store\nSubtotal $1,150.00\nTax $50.00\nAmount Due $1,200.00').totalUsd).toBe(1200);
  });
  it('does not mistake SUBTOTAL for TOTAL', () => {
    const r = parseReceiptText('Disney+\nSubtotal 12.99\nTax 1.04'); expect(r.totalUsd).toBe(12.99); expect(r.warnings.join()).toMatch(/No line labelled TOTAL/);
  });
  it('picks the known company line over a generic header', () => {
    expect(parseReceiptText('RECEIPT\nTel 555\nSTARBUCKS #4411 SEATTLE\nTOTAL $5.75').merchantLine).toBe('STARBUCKS #4411 SEATTLE');
  });
  it('warns on conflicting totals, other currencies, empty, and out-of-range', () => {
    expect(parseReceiptText('Shop\nTOTAL $10.00\nTOTAL $12.00').warnings.join()).toMatch(/Several total lines/);
    const eur = parseReceiptText('Cafe\nTOTAL €12.50'); expect(eur.totalUsd).toBeNull(); expect(eur.warnings.join()).toMatch(/currency/);
    expect(parseReceiptText('   ').warnings[0]).toMatch(/empty/);
    expect(parseReceiptText('Big\nTOTAL $99,999.00').totalUsd).toBeNull();
  });
  it('never claims the receipt is genuine', () => {
    expect(JSON.stringify(parseReceiptText(SAMPLE_RECEIPT))).not.toMatch(/verified|genuine|authentic/i);
  });
});
