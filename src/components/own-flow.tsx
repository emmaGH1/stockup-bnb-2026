'use client';
import { useState } from 'react';

interface Eip1193 { request(a: { method: string; params?: unknown[] }): Promise<unknown> }
const eth = () => (typeof window === 'undefined' ? undefined : (window as unknown as { ethereum?: Eip1193 }).ethereum);

interface Result {
  calc: { merchant: { name: string; symbol: string; rewardBps: number }; spendUsd: number; rewardUsd: number; convertedUsd: number; keptUsd: number };
  bnbUsd: number; convertedBnb: string; outcome: 'ready_to_sign' | 'held_reward'; note: string;
  plan: { tx: { to: string; data: string; value: string; chainId: number } | null; quotedOut: string; minOut: string; impactBps: number; pairLiquidityBnb: number; guard: { allowed: boolean; reasons: string[] }; simulation: { ok: boolean; error?: string } };
  error?: string;
}

const MERCHANTS = [{ id: 'apple-store', name: 'Apple Store → AAPLon' }, { id: 'pharmacy', name: 'Neighborhood Pharmacy → JNJon' }];
const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export function OwnFlow() {
  const [merchantId, setMerchant] = useState('apple-store');
  const [spend, setSpend] = useState('100');
  const [share, setShare] = useState(100);
  const [recipient, setRecipient] = useState('');
  const [res, setRes] = useState<Result | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [txHash, setTxHash] = useState('');

  async function connect() {
    setErr('');
    try {
      const w = eth(); if (!w) return setErr('No browser wallet found');
      const accts = (await w.request({ method: 'eth_requestAccounts' })) as string[];
      if (accts[0]) setRecipient(accts[0]);
    } catch { setErr('Wallet connection was declined'); }
  }

  // Only reachable when the guard passed AND the server simulation succeeded (tx non-null). User must tick confirm and approve in their wallet.
  async function sign() {
    const tx = res?.plan.tx; const w = eth();
    if (!tx || !w || !confirm) return;
    setErr('');
    try {
      await w.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x38' }] });
      const hash = (await w.request({ method: 'eth_sendTransaction', params: [{ from: recipient, to: tx.to, data: tx.data, value: tx.value }] })) as string;
      setTxHash(hash);
    } catch { setErr('Transaction was not sent'); }
  }

  async function run(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(''); setRes(null); setConfirm(false); setTxHash('');
    try {
      const r = await fetch('/api/own', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ merchantId, spendUsd: Number(spend), convertShareBps: share * 100, recipient }) });
      const j = await r.json();
      if (!r.ok) setErr(j.error ?? 'request failed'); else setRes(j);
    } catch { setErr('network error'); } finally { setBusy(false); }
  }

  const field = 'mt-1 w-full border border-neutral-400 bg-white px-3 py-2 text-sm';
  return (
    <div className="grid gap-10 md:grid-cols-[22rem_1fr]">
      <form onSubmit={run} className="space-y-4">
        <label className="block text-sm font-medium">Merchant
          <select className={field} value={merchantId} onChange={e => setMerchant(e.target.value)}>
            {MERCHANTS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select></label>
        <label className="block text-sm font-medium">Purchase (USD)
          <input className={field} inputMode="decimal" value={spend} onChange={e => setSpend(e.target.value)} /></label>
        <label className="block text-sm font-medium">Reward converted to stock: {share}%
          <input className="mt-2 w-full" type="range" min={0} max={100} step={5} value={share} onChange={e => setShare(Number(e.target.value))} /></label>
        <label className="block text-sm font-medium">Your BSC address (receives the stock)
          <input className={`${field} font-mono`} placeholder="0x…" value={recipient} onChange={e => setRecipient(e.target.value)} /></label>
        <button type="button" onClick={connect} className="w-full border border-neutral-900 px-4 py-2 text-sm">Use my browser wallet address</button>
        <button disabled={busy} className="w-full bg-neutral-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-50">
          {busy ? 'Checking live BSC…' : 'Convert reward to ownership'}</button>
        {err && <p role="alert" className="text-sm text-red-700">{err}</p>}
      </form>

      <div aria-live="polite">
        {!res && !err && <p className="text-sm text-neutral-500">Result appears here after a live check against BSC mainnet.</p>}
        {res && (
          <div className="space-y-6">
            <dl className="grid grid-cols-2 gap-y-2 border-b pb-4 text-sm">
              <dt className="text-neutral-500">Purchase</dt><dd className="text-right">{money(res.calc.spendUsd)}</dd>
              <dt className="text-neutral-500">Reward ({res.calc.merchant.rewardBps / 100}%)</dt><dd className="text-right">{money(res.calc.rewardUsd)}</dd>
              <dt className="text-neutral-500">Converting to {res.calc.merchant.symbol}</dt><dd className="text-right">{money(res.calc.convertedUsd)} ≈ {res.convertedBnb} BNB</dd>
              <dt className="text-neutral-500">Kept as plain reward</dt><dd className="text-right">{money(res.calc.keptUsd)}</dd>
            </dl>
            <section className={`border-l-4 p-4 ${res.outcome === 'ready_to_sign' ? 'border-green-700 bg-green-50' : 'border-amber-600 bg-amber-50'}`}>
              <h2 className="text-sm font-semibold">{res.outcome === 'ready_to_sign' ? 'Conversion cleared the guard' : 'Conversion held by the guard'}</h2>
              <ul className="mt-2 list-disc pl-5 text-sm">
                {res.plan.guard.allowed ? <li>All pre-trade checks passed; simulation {res.plan.simulation.ok ? 'succeeded' : 'failed'}.</li>
                  : res.plan.guard.reasons.map(r => <li key={r}>{r}</li>)}
              </ul>
              <p className="mt-2 text-sm">{res.note}</p>
              {res.plan.tx && (
                <div className="mt-3 space-y-2 text-sm">
                  <label className="flex items-start gap-2"><input type="checkbox" checked={confirm} onChange={e => setConfirm(e.target.checked)} className="mt-1" />
                    I understand this sends {res.convertedBnb} BNB from my wallet on BSC mainnet and cannot be undone.</label>
                  <button type="button" disabled={!confirm || !!txHash} onClick={sign} className="bg-green-800 px-4 py-2 text-white disabled:opacity-40">Sign in my wallet</button>
                  {txHash && <p className="break-all font-mono text-xs">Submitted: {txHash} (unverified until confirmed on-chain)</p>}
                </div>
              )}
            </section>
            <dl className="grid grid-cols-2 gap-y-1 text-xs text-neutral-600">
              <dt>Pool liquidity</dt><dd className="text-right">{res.plan.pairLiquidityBnb.toFixed(6)} BNB</dd>
              <dt>Price impact</dt><dd className="text-right">{(res.plan.impactBps / 100).toFixed(2)}%</dd>
              <dt>Quoted / minimum out</dt><dd className="text-right">{Number(res.plan.quotedOut).toFixed(6)} / {Number(res.plan.minOut).toFixed(6)}</dd>
              <dt>BNB/USD (live PancakeSwap spot)</dt><dd className="text-right">{res.bnbUsd.toFixed(2)}</dd>
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
