// Merchant -> publicly traded company resolution.
// The alias table is CURATED BY US (a small hand-written list), not sourced from a card network or market-data vendor.
export interface Company { ticker: string; name: string; aliases: string[]; tokenSymbol?: string }

export const COMPANIES: Company[] = [
  { ticker: 'SBUX', name: 'Starbucks Corporation', aliases: ['STARBUCKS', 'SBUX'], tokenSymbol: 'SBUXx' },
  { ticker: 'AAPL', name: 'Apple Inc.', aliases: ['APPLE STORE', 'APPLE', 'APPLE.COM'], tokenSymbol: 'AAPLon' },
  { ticker: 'JNJ', name: 'Johnson & Johnson', aliases: ['JOHNSON & JOHNSON', 'JNJ', 'NEUTROGENA', 'BAND-AID'], tokenSymbol: 'JNJon' },
  { ticker: 'AMZN', name: 'Amazon.com, Inc.', aliases: ['AMAZON', 'AMZN', 'WHOLE FOODS'] }, // public, but no registered token
];

export type Identification =
  | { status: 'identified'; company: Company; matchedAlias: string; input: string }
  | { status: 'ambiguous'; candidates: Company[]; input: string }
  | { status: 'not_found'; input: string };

/** Uppercase, drop store numbers/punctuation noise, collapse spaces. Keeps & and . for names like J&J / APPLE.COM. */
export function normalizeMerchant(raw: string): string {
  return raw.toUpperCase().replace(/[#*]\s*\d+/g, ' ').replace(/\b\d{2,}\b/g, ' ').replace(/[^A-Z0-9&.\- ]/g, ' ').replace(/\s+/g, ' ').trim();
}

const hasWord = (hay: string, needle: string) => {
  const esc = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^A-Z0-9])${esc}($|[^A-Z0-9])`).test(hay);
};

/** Whole-word alias match only (no fuzzy guessing). Longest alias wins within a company; two companies matching = ambiguous. */
export function identifyCompany(raw: string): Identification {
  const input = raw.trim();
  const text = normalizeMerchant(input);
  if (!text) return { status: 'not_found', input };
  const hits: { company: Company; alias: string }[] = [];
  for (const company of COMPANIES) {
    const alias = [...company.aliases].sort((a, b) => b.length - a.length).find(a => hasWord(text, a));
    if (alias) hits.push({ company, alias });
  }
  if (hits.length === 1) return { status: 'identified', company: hits[0].company, matchedAlias: hits[0].alias, input };
  if (hits.length > 1) return { status: 'ambiguous', candidates: hits.map(h => h.company), input };
  return { status: 'not_found', input };
}
