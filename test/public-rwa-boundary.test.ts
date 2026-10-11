// Guard: the product runtime must use only the keyless public Binance RWA endpoints.
// The signed Binance Web3 client (src/lib/w3w.ts) is blocked by compliance code 40304 and is used only by a one-off probe script.
// If runtime code imports it, this test fails.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(__dirname, '..');
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap(f => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(f) ? [p] : []; });
}
const runtimeFiles = [...walk(join(ROOT, 'src/app')), ...walk(join(ROOT, 'src/lib'))];

describe('public Binance RWA boundary', () => {
  it('runtime code does not import the signed W3W client', () => {
    const offenders = runtimeFiles.filter(f => {
      const src = readFileSync(f, 'utf8');
      // Targets the signed client module only: src/lib/w3w.ts, imported as ./w3w (from src/lib) or @/lib/w3w.
      // The fixtures module (./fixtures/w3w) is a different file and is not the signed client.
      return /from\s+['"](?:\.\/w3w|@\/lib\/w3w)['"]/.test(src);
    }).map(f => relative(ROOT, f));
    expect(offenders).toEqual([]);
  });
  it('the public RWA endpoints the product reads are still configured in code', () => {
    const inst = readFileSync(join(ROOT, 'src/lib/instruments.ts'), 'utf8');
    const md = readFileSync(join(ROOT, 'src/lib/marketdata.ts'), 'utf8');
    expect(inst).toContain('wallet-direct/buw/wallet/market/token/rwa');
    expect(md).toContain('wallet-direct/buw/wallet/market/token/rwa/dynamic/ai');
    expect(inst).not.toMatch(/X-OC-APIKEY|W3W_API_KEY|W3W_API_SECRET/);
    expect(md).not.toMatch(/X-OC-APIKEY|W3W_API_KEY|W3W_API_SECRET/);
  });
});
