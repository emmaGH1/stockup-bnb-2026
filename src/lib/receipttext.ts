// Reads PASTED receipt text into a spending event. Local, deterministic, no OCR, no network, no verification.
// The result is a SUGGESTION the user must confirm; Stockup cannot tell a real receipt from an invented one.
import { identifyCompany, COMPANIES } from './company';

export interface ParsedReceipt {
  merchantLine: string | null;      // best guess at the merchant name as printed
  totalUsd: number | null;          // the amount the user is asked to confirm
  totalLabel: string | null;        // which line it came from
  otherAmounts: number[];           // other candidate totals, so ambiguity is visible
  currency: 'USD' | 'unknown';
  warnings: string[];
}

const MONEY = /(?<![\d.])(\$?\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})|\$?\s?\d+\.\d{2})(?![\d])/g;
const toNum = (s: string) => Number(s.replace(/[$,\s]/g, ''));
const SKIP_MERCHANT = /^(receipt|invoice|order|thank|welcome|date|time|tel|phone|www\.|http|store\s*#|cashier|server|table|\d)/i;

export function parseReceiptText(raw: string): ParsedReceipt {
  const warnings: string[] = [];
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return { merchantLine: null, totalUsd: null, totalLabel: null, otherAmounts: [], currency: 'unknown', warnings: ['Receipt text is empty.'] };

  // Merchant: a known company alias anywhere wins; otherwise the first plausible header line.
  let merchantLine: string | null = null;
  for (const l of lines.slice(0, 8)) { if (identifyCompany(l).status === 'identified') { merchantLine = l; break; } }
  if (!merchantLine) merchantLine = lines.slice(0, 6).find(l => !SKIP_MERCHANT.test(l) && /[A-Za-z]{3}/.test(l)) ?? null;
  if (!merchantLine) warnings.push('Could not find a merchant name.');

  // Total: prefer a line labelled TOTAL / AMOUNT DUE / BALANCE DUE, not SUBTOTAL / TAX / TIP / SAVINGS.
  const labelled: { label: string; amount: number }[] = [];
  for (const l of lines) {
    if (/sub\s*-?total|tax|tip|gratuity|saving|discount|change|cash|tender|points|item/i.test(l.replace(/total/i, m => (/sub\s*-?\s*$/i.test(l.slice(0, l.toLowerCase().indexOf('total'))) ? 'subtotal' : m)))
        && !/^\s*(grand\s+)?total\b|amount due|balance due/i.test(l)) continue;
    if (/(^|\b)(grand\s+)?total\b|amount due|balance due|total due/i.test(l) && !/sub\s*-?\s*total/i.test(l)) {
      const nums = [...l.matchAll(MONEY)].map(m => toNum(m[1]));
      if (nums.length) labelled.push({ label: l, amount: nums[nums.length - 1] });
    }
  }
  const all = [...raw.matchAll(MONEY)].map(m => toNum(m[1])).filter(n => n > 0);
  let totalUsd: number | null = null, totalLabel: string | null = null;
  if (labelled.length) {
    const best = labelled[labelled.length - 1];
    totalUsd = best.amount; totalLabel = best.label;
    const distinct = [...new Set(labelled.map(x => x.amount))];
    if (distinct.length > 1) warnings.push(`Several total lines with different amounts (${distinct.join(', ')}); using the last. Please check.`);
  } else if (all.length) {
    totalUsd = Math.max(...all); totalLabel = 'largest amount on the receipt (no TOTAL line found)';
    warnings.push('No line labelled TOTAL; using the largest amount. Please check.');
  } else warnings.push('No amount found.');

  const hasOtherCurrency = /[€£¥₦₹]|\b(EUR|GBP|NGN|JPY|INR|CAD|AUD)\b/i.test(raw);
  if (hasOtherCurrency) warnings.push('Receipt appears to use a currency other than USD; amounts are NOT converted. Enter the USD value yourself.');
  if (totalUsd !== null && (totalUsd <= 0 || totalUsd > 10_000)) { warnings.push('Amount is outside the supported range ($0-$10,000).'); totalUsd = null; }
  return { merchantLine, totalUsd: hasOtherCurrency ? null : totalUsd, totalLabel, otherAmounts: [...new Set(all)].filter(n => n !== totalUsd).slice(0, 8), currency: hasOtherCurrency ? 'unknown' : 'USD', warnings };
}

export const SAMPLE_RECEIPT = `AMAZON.COM*2K4
Order #113-4822
Item 1                 $62.40
Item 2                 $24.99
Subtotal               $87.39
Tax                     $7.21
Shipping                $5.40
TOTAL                  $100.00
Visa ****1234
Thank you`;

void COMPANIES;
