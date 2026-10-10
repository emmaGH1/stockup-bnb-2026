import { describe, it, expect } from 'vitest';
import { identifyCompany, normalizeMerchant } from '../src/lib/company';

describe('identifyCompany', () => {
  it('identifies Starbucks from a raw card-style descriptor', () => {
    const r = identifyCompany('STARBUCKS #4411 SEATTLE WA');
    expect(r.status).toBe('identified');
    if (r.status === 'identified') { expect(r.company.ticker).toBe('SBUX'); expect(r.company.tokenSymbol).toBe('SBUXon'); expect(r.matchedAlias).toBe('STARBUCKS'); }
  });
  it('is case/punctuation tolerant', () => {
    expect(identifyCompany('starbucks coffee 12345').status).toBe('identified');
    expect(identifyCompany('Sq *Starbucks').status).toBe('identified');
  });
  it('maps a subsidiary brand to a public parent without a token', () => {
    const r = identifyCompany('WHOLE FOODS MKT 10234');
    expect(r.status === 'identified' && r.company.ticker).toBe('AMZN');
    expect(r.status === 'identified' && r.company.tokenSymbol).toBeUndefined();
  });
  it('identifies Disney from card-style descriptors', () => {
    for (const m of ['DISNEY+ 877-7886', 'WALT DISNEY WORLD ORLANDO FL', 'DISNEYLAND PARK ANAHEIM']) { const r = identifyCompany(m); expect(r.status === 'identified' && r.company.ticker).toBe('DIS'); }
    expect(identifyCompany('DISCOUNT TIRE').status).toBe('not_found');
  });
  it('does not match inside other words', () => {
    expect(identifyCompany('PINEAPPLE GROVE CAFE').status).toBe('not_found');
    expect(identifyCompany('STARBUCKSY').status).toBe('not_found');
  });
  it('returns not_found for private or unknown merchants and empty input', () => {
    expect(identifyCompany("JOE'S CORNER DINER").status).toBe('not_found');
    expect(identifyCompany('   ').status).toBe('not_found');
  });
  it('flags ambiguity instead of guessing', () => {
    expect(identifyCompany('APPLE AMAZON MARKETPLACE').status).toBe('ambiguous');
  });
  it('normalizes store numbers', () => { expect(normalizeMerchant('STARBUCKS #4411, SEATTLE')).toBe('STARBUCKS SEATTLE'); });
});
