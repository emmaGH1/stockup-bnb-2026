import { describe, it, expect, vi } from 'vitest';
import crypto from 'node:crypto';
import { sign, w3w } from '../src/lib/w3w';
import { readToken, readBalance } from '../src/lib/bsc';

describe('w3w signing', () => {
  it('matches independent HMAC', () => {
    const e = crypto.createHmac('sha256', 'k').update('TPOST/build/x{}').digest('base64');
    expect(sign({ secret: 'k', timestamp: 'T', method: 'post', path: '/build/x', body: '{}' })).toBe(e);
  });
  it('refuses without credentials', async () => {
    await expect(w3w('GET', '/x', undefined, {})).rejects.toThrow(/credentials/);
  });
  it('keeps /build prefix in path and sends headers', async () => {
    const f = vi.fn(async () => new Response('{"ok":1}', { status: 200 }));
    const r = await w3w('GET', '/api/v1/a?b=1', undefined, { W3W_API_KEY: 'k', W3W_API_SECRET: 's' }, f as unknown as typeof fetch);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://web3.binance.com/build/api/v1/a?b=1');
    expect((init.headers as Record<string, string>)['X-OC-SIGN']).toBeTruthy();
    expect(r.status).toBe(200);
  });
});

describe('bsc reads', () => {
  it('rejects invalid addresses', async () => {
    await expect(readToken('nope')).rejects.toThrow();
    await expect(readBalance('nope', 'nope')).rejects.toThrow();
  });
});
