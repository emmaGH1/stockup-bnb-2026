'use client';
import { useState } from 'react';

interface Eip1193 { request(a: { method: string; params?: unknown[] }): Promise<unknown> }
const eth = () => (typeof window === 'undefined' ? undefined : (window as unknown as { ethereum?: Eip1193 }).ethereum);

interface Ident { status: 'identified' | 'ambiguous' | 'not_found'; input: string; matchedAlias?: string; company?: { ticker: string; name: string; tokenSymbol?: string }; candidates?: { ticker: string; name: string }[] }
interface Result {
  identification: Ident;
  instrument?: { symbol: string; address: string; multiplier: string; verifiedOnChain: boolean };
  liveStatus?: { openState: boolean; marketStatus: string; reasonCode: string; reasonMsg: string | null } | null;
  investment?: { investUsd: number; investBps: number; fundedBy: string };
  calc: null | { merchant: { name: string; symbol: string; rewardBps: number }; spendUsd: number; rewardUsd: number; convertedUsd: number; keptUsd: number };
  bnbUsd?: number; convertedBnb?: string; outcome: 'ready_to_sign' | 'held' | 'no_route' | 'unidentified' | 'no_token'; note: string;
  plan: null | { tx: { to: string; data: string; value: string; chainId: number } | null; quotedOut: string; minOut: string; impactBps: number; pairLiquidityBnb: number; guard: { allowed: boolean; reasons: string[] }; simulation: { ok: boolean; error?: string } };
  error?: string;
}

const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export function OwnFlow() {
  const [merchant, setMerchant] = useState('STARBUCKS #4411 SEATTLE WA');
  const [spend, setSpend] = useState('100');
  const [investPct, setInvestPct] = useState('5');
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
    const tx = res?.plan?.tx; const w = eth();
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
        body: JSON.stringify({ merchant, spendUsd: Number(spend), investBps: Math.round(Number(investPct) * 100), recipient }) });
      const j = await r.json();
      if (!r.ok) setErr(j.error ?? 'request failed'); else setRes(j);
    } catch { setErr('network error'); } finally { setBusy(false); }
  }

  const field = 'mt-1 w-full border border-neutral-400 bg-white px-3 py-2 text-sm';
  return (
    <div className="grid gap-10 md:grid-cols-[22rem_1fr]">
      <form onSubmit={run} className="space-y-4">
        <label className="block text-sm font-medium">Merchant (as it appears on the purchase)
          <input className={field} value={merchant} onChange={e => setMerchant(e.target.value)} /></label>
        <label className="block text-sm font-medium">Purchase (USD)
          <input className={field} inputMode="decimal" value={spend} onChange={e => setSpend(e.target.value)} /></label>
        <label className="block text-sm font-medium">Invest from my own funds (% of purchase)
          <input className={field} inputMode="decimal" value={investPct} onChange={e => setInvestPct(e.target.value)} />
          <span className="mt-1 block text-xs font-normal text-neutral-600">{Number(spend) > 0 && Number(investPct) > 0 ? `= ${money(Number(spend) * Number(investPct) / 100)} of your own money` : ''}</span></label>
        <label className="block text-sm font-medium">Your BSC address (receives the stock)
          <input className={`${field} font-mono`} placeholder="0x…" value={recipient} onChange={e => setRecipient(e.target.value)} /></label>
        <button type="button" onClick={connect} className="w-full border border-neutral-900 px-4 py-2 text-sm">Use my browser wallet address</button>
        <button disabled={busy} className="w-full bg-neutral-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-50">
          {busy ? 'Checking live BSC…' : 'Invest in the company'}</button>
        {err && <p role="alert" className="text-sm text-red-700">{err}</p>}
      </form>

      <div aria-live="polite">
        {!res && !err && <p className="text-sm text-neutral-500">Result appears here after a live check against BSC mainnet.</p>}
        {res && (
          <div className="space-y-6">
            <section aria-label="Company identification" className="border-b pb-4 text-sm">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Identified company</h2>
              {res.identification.status === 'identified' && res.identification.company && (
                <p className="mt-1"><span className="text-base font-semibold">{res.identification.company.name}</span> <span className="font-mono">({res.identification.company.ticker})</span>
                  <span className="block text-neutral-600">Matched “{res.identification.matchedAlias}” in “{res.identification.input}”. {res.identification.company.tokenSymbol ? `Token: ${res.identification.company.tokenSymbol}.` : 'No Stockup token registered.'}</span></p>)}
              {res.identification.status === 'ambiguous' && <p className="mt-1">Matched more than one company: {res.identification.candidates?.map(c => c.name).join(', ')}.</p>}
              {res.identification.status === 'not_found' && <p className="mt-1">No publicly traded company matched “{res.identification.input}”.</p>}
            </section>
            {res.instrument && (
              <section aria-label="Tokenized instrument" className="border-b pb-4 text-sm">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Supported instrument</h2>
                <p className="mt-1"><span className="text-base font-semibold">{res.instrument.symbol}</span> on BNB Chain · 1 token = {Number(res.instrument.multiplier).toFixed(4)} share(s)</p>
                <p className="break-all font-mono text-xs text-neutral-600">{res.instrument.address}</p>
                <p className="mt-1 text-neutral-600">Listed by Binance Web3 (Ondo) and symbol confirmed on-chain: {res.instrument.verifiedOnChain ? 'yes' : 'no'}.
                  {' '}Trading status: {res.liveStatus ? `${res.liveStatus.openState ? 'open' : 'closed'} (${res.liveStatus.reasonCode}${res.liveStatus.reasonMsg ? `, ${res.liveStatus.reasonMsg}` : ''})` : 'unavailable, treated as not tradable'}.</p>
              </section>)}
            {(res.outcome === 'unidentified' || res.outcome === 'no_token') && <section className="border-l-4 border-amber-600 bg-amber-50 p-4 text-sm">{res.note}</section>}
            {res.calc && <dl className="grid grid-cols-2 gap-y-2 border-b pb-4 text-sm">
              <dt className="text-neutral-500">Purchase</dt><dd className="text-right">{money(res.calc.spendUsd)}</dd>
              <dt className="text-neutral-500">Reward ({res.calc.merchant.rewardBps / 100}%)</dt><dd className="text-right">{money(res.calc.rewardUsd)}</dd>
              <dt className="text-neutral-500">Your investment in {res.calc.merchant.symbol} ({(res.investment?.investBps ?? 0) / 100}% of purchase, own funds)</dt><dd className="text-right">{money(res.investment?.investUsd ?? 0)} ≈ {res.convertedBnb} BNB</dd>
            </dl>}
            {res.outcome === 'no_route' && res.calc && <section className="border-l-4 border-amber-600 bg-amber-50 p-4 text-sm"><h2 className="font-semibold">No on-chain route for {res.calc.merchant.symbol}</h2><p className="mt-1">{res.note}</p></section>}
            {res.plan && <>
            <section className={`border-l-4 p-4 ${res.outcome === 'ready_to_sign' ? 'border-green-700 bg-green-50' : 'border-amber-600 bg-amber-50'}`}>
              <h2 className="text-sm font-semibold">{res.outcome === 'ready_to_sign' ? 'Investment cleared the guard' : 'Investment held by the guard'}</h2>
              <ul className="mt-2 list-disc pl-5 text-sm">
                {res.plan!.guard.allowed ? <li>All pre-trade checks passed; simulation {res.plan!.simulation.ok ? 'succeeded' : 'failed'}.</li>
                  : res.plan!.guard.reasons.map(r => <li key={r}>{r}</li>)}
              </ul>
              <p className="mt-2 text-sm">{res.note}</p>
              {res.plan?.tx && (
                <div className="mt-3 space-y-2 text-sm">
                  <label className="flex items-start gap-2"><input type="checkbox" checked={confirm} onChange={e => setConfirm(e.target.checked)} className="mt-1" />
                    I understand this sends {res.convertedBnb} BNB from my wallet on BSC mainnet and cannot be undone.</label>
                  <button type="button" disabled={!confirm || !!txHash} onClick={sign} className="bg-green-800 px-4 py-2 text-white disabled:opacity-40">Sign in my wallet</button>
                  {txHash && <p className="break-all font-mono text-xs">Submitted: {txHash} (unverified until confirmed on-chain)</p>}
                </div>
              )}
            </section></>}
            {res.plan && <dl className="grid grid-cols-2 gap-y-1 text-xs text-neutral-600">
              <dt>Pool liquidity</dt><dd className="text-right">{res.plan!.pairLiquidityBnb.toFixed(6)} BNB</dd>
              <dt>Price impact</dt><dd className="text-right">{(res.plan!.impactBps / 100).toFixed(2)}%</dd>
              <dt>Quoted / minimum out</dt><dd className="text-right">{Number(res.plan!.quotedOut).toFixed(6)} / {Number(res.plan!.minOut).toFixed(6)}</dd>
              <dt>BNB/USD (live PancakeSwap spot)</dt><dd className="text-right">{res.bnbUsd?.toFixed(2)}</dd>
            </dl>}
          </div>
        )}
      </div>
    </div>
  );
}
