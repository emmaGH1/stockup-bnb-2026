import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('hero example prefill', () => {
  const ui = readFileSync('src/components/own-flow.tsx', 'utf8');
  const start = ui.indexOf('function loadExample()');
  const body = ui.slice(start, ui.indexOf('useEffect(', start));

  it('loadExample fills the form from the sample receipt and does nothing else', () => {
    expect(start).toBeGreaterThan(-1);
    expect(body).toMatch(/SAMPLE_RECEIPT/);
    expect(body).not.toMatch(/fetch\(|eth_sendTransaction|eth_requestAccounts|run\(|sign\(|connect\(/);
  });

  it('the page CTA points at the example hash handled by the workspace', () => {
    expect(readFileSync('src/app/page.tsx', 'utf8')).toMatch(/href="#invest-example"/);
    expect(ui).toMatch(/#invest-example/);
  });
});
