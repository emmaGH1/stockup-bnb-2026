'use client';
import { useEffect, useRef, useState } from 'react';
import { PaperPair } from '@/components/paper-pair';
import { connectWallet, readWallet, switchToBsc, type WalletState } from '@/lib/wallet/provider';
import { ownershipRows, isIssued } from '@/lib/paperrows';
import { parseReceiptText, SAMPLE_RECEIPT, type ParsedReceipt } from '@/lib/receipttext';

interface Eip1193 { request(a: { method: string; params?: unknown[] }): Promise<unknown> }
function walletLine(w: WalletState): string {
  if (w.status === 'connected') return `Connected to BNB Smart Chain (56) as ${w.account.slice(0, 8)}…${w.account.slice(-4)}.`;
  if (w.status === 'wrong_chain') return 'Your wallet is on another network. Connecting again will ask it to switch to BSC.';
  if (w.status === 'no_wallet') return 'No browser wallet found.';
  return 'Not connected. Connecting only shares your address. It never sends anything.';
}

const eth = () => (typeof window === 'undefined' ? undefined : (window as unknown as { ethereum?: Eip1193 }).ethereum);

interface Ident { status: 'identified' | 'ambiguous' | 'not_found'; input: string; matchedAlias?: string; company?: { ticker: string; name: string; tokenSymbol?: string }; candidates?: { ticker: string; name: string }[] }
interface Result {
  identification: Ident;
  instrument?: { symbol: string; address: string; multiplier: string; verifiedOnChain: boolean };
  liveStatus?: { openState: boolean; marketStatus: string; reasonCode: string; reasonMsg: string | null } | null;
  market?: { tokenPriceUsd: number | null; stockPriceUsd: number | null; changePct24h: number | null; holders: number | null; high52w: number | null; low52w: number | null; pe: number | null; fetchedAt: string } | null;
  quote?: { dex: { tokensOut: number; minOut: number; simulated: boolean }; vsReferenceBps: number | null; binance: { available: boolean; reason: string } } | null;
  checks?: { id: string; label: string; state: 'pass' | 'fail' | 'unknown'; detail: string; source: string }[];
  eligibility?: { eligible: boolean; blockedBy: string[]; unknown: string[] };
  settleParams?: { token: string; recipient: string; valueWei: string; minOutWei: string; quotedOutWei: string } | null;
  fees?: { totalUsd: number | null };
  review?: { contract: string; sendsBnb: string; minTokensOut: string; receivesToken: string; recipient: string; deadlineUtc: string; secondsLeft: number; calldataDigest: string } | null;
  reviewProblems?: string[];
  investment?: { spendUsd: number; investUsd: number; investBps: number; fundedBy: string };
  bnbUsd?: number; convertedBnb?: string; outcome: 'ready_to_sign' | 'held' | 'not_eligible' | 'over_limit' | 'no_route' | 'unidentified' | 'no_token'; note: string;
  plan: null | { tx: { to: string; data: string; value: string; chainId: number } | null; quotedOut: string; minOut: string; impactBps: number; pairLiquidityBnb: number; guard: { allowed: boolean; reasons: string[] }; simulation: { ok: boolean; error?: string } };
  error?: string;
}

const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export function OwnFlow() {
  const [merchant, setMerchant] = useState('');
  const [spend, setSpend] = useState('');
  const [investPct, setInvestPct] = useState('5');
  const [recipient, setRecipient] = useState('');
  const [res, setRes] = useState<Result | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [quotedAt, setQuotedAt] = useState(0);
  const [ack, setAck] = useState(false);
  const [pasted, setPasted] = useState('');
  const [parsed, setParsed] = useState<ParsedReceipt | null>(null);

  function readReceipt() {
    const p = parseReceiptText(pasted); setParsed(p);
    if (p.merchantLine) setMerchant(p.merchantLine);
    if (p.totalUsd != null) setSpend(String(p.totalUsd));
  }
  const [receipt, setReceipt] = useState<null | { ok: boolean; reason?: string; receipt?: {
    receiptId: string; issuedAt: string; chain: string;
    onChain: { txHash: string; blockNumber: string; confirmations: number; tokenSymbol: string; tokenAddress: string; holder: string; receivedTokens: string; authorizedMinimum: string; gasCostBnb: string; holderBalanceNow: string | null };
    links: { tx: string; token: string; holderOnToken: string };
    recordedByApp: { merchantInput: string; companyName: string; ticker: string; spendUsd: number; investUsd: number; note: string };
    exposure: { sharesApprox: number | null; basis: string }; verifyYourself: string[]; limits: string[] } }>(null);
  const [settle, setSettle] = useState<null | { state: string; detail?: string; problems?: string[]; receivedTokens?: string; minTokens?: string; confirmations?: number; blockNumber?: string; gasCostBnb?: string; vsQuotedBps?: number | null; error?: string }>(null);

  async function getReceipt() {
    if (!txHash || !res?.settleParams || !res.instrument || res.identification.status !== 'identified') return;
    setReceipt(null);
    try {
      const r = await fetch('/api/receipt', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ txHash, ...res.settleParams,
        context: { merchantInput: res.identification.input, companyName: res.identification.company?.name, ticker: res.identification.company?.ticker,
          spendUsd: res.investment?.spendUsd, investUsd: res.investment?.investUsd, sharesPerToken: Number(res.instrument.multiplier) } }) });
      setReceipt(await r.json());
    } catch { setReceipt({ ok: false, reason: 'network error' }); }
  }

  async function checkSettlement() {
    if (!txHash || !res?.settleParams) return;
    setSettle(null);
    try {
      const r = await fetch('/api/settle', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ txHash, ...res.settleParams }) });
      setSettle(await r.json());
    } catch { setSettle({ state: 'error', error: 'network error' }); }
  }

  const [wallet, setWallet] = useState<WalletState>({ status: 'disconnected' });

  // Explicit click only. Requests account access; never a transaction.
  async function connect() {
    setErr('');
    const w = eth();
    const st = await connectWallet(w);
    setWallet(st);
    if (st.status === 'disconnected') setErr('Wallet connection was declined.');
    else if (st.status === 'connected' || st.status === 'wrong_chain') setRecipient(st.account);
  }

  // Authorization needs: a released tx, verified review, both acknowledgements, a fresh quote,
  // the connected account equal to the recipient, and the wallet on BSC.
  async function sign() {
    const tx = res?.plan?.tx; const w = eth();
    if (!tx || !res?.review || !w || !confirm || !ack) return;
    if (Date.now() - quotedAt > 100_000) { setErr('This quote is too old to authorize. Run the check again.'); return; }
    setErr('');
    let st = await readWallet(w);
    if (st.status === 'wrong_chain') { if (!(await switchToBsc(w))) { setErr('Switch your wallet to BNB Smart Chain (56) to continue.'); return; } st = await readWallet(w); }
    if (st.status !== 'connected') { setErr('Connect your wallet first.'); return; }
    setWallet(st);
    if (st.account.toLowerCase() !== res.review.recipient.toLowerCase()) { setErr(`Your wallet account (${st.account.slice(0, 8)}…) is not the recipient address on this review. Switch accounts or re-run the check.`); return; }
    try {
      const hash = (await w.request({ method: 'eth_sendTransaction', params: [{ from: st.account, to: tx.to, data: tx.data, value: tx.value }] })) as string;
      setTxHash(hash);
    } catch { setErr('Transaction was not sent. Nothing was submitted.'); }
  }

  const reviewRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (res?.review && window.matchMedia('(max-width: 767px)').matches) reviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [res?.review]);

  async function run(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(''); setRes(null); setConfirm(false); setTxHash('');
    try {
      const r = await fetch('/api/own', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ merchant, spendUsd: Number(spend), investBps: Math.round(Number(investPct) * 100), recipient }) });
      const j = await r.json();
      if (!r.ok) setErr(j.error ?? 'request failed'); else { setRes(j); setQuotedAt(Date.now()); setAck(false); }
    } catch { setErr('network error'); } finally { setBusy(false); }
  }

  const field = 'mt-1 w-full border border-ink/40 bg-white px-3 py-2 text-sm focus:outline-2 focus:outline-vermilion';
  const paper = { res, txHash, settle, receipt };
  const issued = isIssued(paper);
  return (
    <div className="space-y-10">
    <PaperPair pasted={pasted} parsed={parsed} rows={ownershipRows(paper)} issued={issued} receiptId={receipt?.receipt?.receiptId} reason={receipt && !receipt.ok ? receipt.reason : undefined} />
    <div className="grid gap-10 md:grid-cols-[22rem_1fr]">
      <form onSubmit={run} className="space-y-4">
        <fieldset className="space-y-2 border border-neutral-300 p-3">
          <legend className="px-1 text-sm font-medium">1. Paste a shopping receipt</legend>
          <textarea aria-label="Shopping receipt text" className="h-32 w-full border border-neutral-400 bg-white p-2 font-mono text-xs" placeholder="Paste receipt text here" value={pasted} onChange={e => setPasted(e.target.value)} />
          <div className="flex gap-2">
            <button type="button" onClick={readReceipt} disabled={!pasted.trim()} className="min-h-11 border border-neutral-900 px-4 text-sm disabled:opacity-40">Read receipt</button>
            <button type="button" onClick={() => setPasted(SAMPLE_RECEIPT)} className="min-h-11 px-4 text-sm underline">Use a sample</button>
          </div>
          {parsed && (
            <div role="status" className="space-y-1 text-xs">
              <p>Read from your text: merchant <strong>{parsed.merchantLine ?? 'not found'}</strong>, amount <strong>{parsed.totalUsd != null ? money(parsed.totalUsd) : 'not found'}</strong>{parsed.totalLabel && <> (from “{parsed.totalLabel.slice(0, 40)}”)</>}.</p>
              {parsed.warnings.map(w => <p key={w} className="text-amber-800">⚠ {w}</p>)}
              <p className="text-neutral-600">Stockup cannot tell whether this receipt is real. Check the two fields below, edit them if wrong, then continue.</p>
            </div>)}
        </fieldset>
        <p className="text-sm font-medium">2. Confirm the spending event</p>
        <label className="block text-sm font-medium">Merchant (read from your receipt; edit if wrong)
          <input className={field} value={merchant} onChange={e => setMerchant(e.target.value)} /></label>
        <label className="block text-sm font-medium">Spending amount in USD (read from your receipt; edit if wrong)
          <input className={field} inputMode="decimal" value={spend} onChange={e => setSpend(e.target.value)} /></label>
        <label className="block text-sm font-medium">Invest from my own funds (% of purchase)
          <input className={field} inputMode="decimal" value={investPct} onChange={e => setInvestPct(e.target.value)} />
          <span className="mt-1 block text-xs font-normal text-neutral-600">{Number(spend) > 0 && Number(investPct) > 0 ? `= ${money(Number(spend) * Number(investPct) / 100)} of your own money` : ''}</span></label>
        <label className="block text-sm font-medium">Your BSC address (receives the stock)
          <input className={`${field} font-mono`} placeholder="0x…" value={recipient} onChange={e => setRecipient(e.target.value)} /></label>
        <button type="button" onClick={connect} className="w-full border border-neutral-900 px-4 py-2 text-sm">Connect my browser wallet</button>
        <p role="status" className="text-xs text-neutral-600">{walletLine(wallet)}</p>
        <button disabled={busy || !merchant.trim() || !(Number(spend) > 0)} className="w-full bg-vermilion px-4 py-3 text-sm font-semibold text-ink disabled:opacity-50">
          {busy ? 'Checking live BSC…' : 'Check and prepare my investment'}</button>
        {err ? <p role="alert" className="text-sm text-red-700">{err}</p> : null}
      </form>

      <div aria-live="polite">
        {!res && !err && <p className="text-sm text-neutral-500">Result appears here after a live check against BSC mainnet.</p>}
        {res && (
          <div className="space-y-6">
            <section aria-label="Company identification" className="border-b pb-4 text-sm">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Identified company</h2>
              {res.identification.status === 'identified' && res.identification.company && (
                <p className="mt-1"><span className="text-base font-semibold">{res.identification.company.name}</span> <span className="font-mono">({res.identification.company.ticker})</span>
                  <span className="block text-neutral-600">Matched “{res.identification.matchedAlias}” in “{res.identification.input}”.</span></p>)}
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
            {res.market && (
              <section aria-label="Live market information" className="border-b pb-4 text-sm">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Live market information (Binance Web3)</h2>
                <dl className="mt-1 grid grid-cols-2 gap-y-1">
                  <dt className="text-neutral-500">Token price</dt><dd className="text-right">{res.market.tokenPriceUsd != null ? money(res.market.tokenPriceUsd) : 'n/a'}{res.market.changePct24h != null && ` (${res.market.changePct24h.toFixed(2)}% 24h)`}</dd>
                  <dt className="text-neutral-500">US stock price</dt><dd className="text-right">{res.market.stockPriceUsd != null ? money(res.market.stockPriceUsd) : 'not reported'}</dd>
                  <dt className="text-neutral-500">52-week range</dt><dd className="text-right">{res.market.low52w ?? 'n/a'} – {res.market.high52w ?? 'n/a'}</dd>
                  <dt className="text-neutral-500">P/E · holders</dt><dd className="text-right">{res.market.pe ?? 'n/a'} · {res.market.holders ?? 'n/a'}</dd>
                </dl>
                <p className="mt-1 text-xs text-neutral-500">Fetched {new Date(res.market.fetchedAt).toISOString().slice(11, 19)} UTC</p>
              </section>)}
            {res.quote && (
              <section aria-label="Executable quote" className="border-b pb-4 text-sm">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Executable quote</h2>
                <p className="mt-1">PancakeSwap on-chain quote: <strong>{res.quote.dex.tokensOut.toFixed(6)}</strong> tokens (min {res.quote.dex.minOut.toFixed(6)}), simulation {res.quote.dex.simulated ? 'passed' : 'not run or failed'}.
                  {res.quote.vsReferenceBps != null && ` Versus Binance reference price: ${(res.quote.vsReferenceBps / 100).toFixed(2)}% ${res.quote.vsReferenceBps >= 0 ? 'fewer' : 'more'} tokens.`}</p>
                <p className="mt-1 text-neutral-600">Binance swap quote: {res.quote.binance.available ? 'available' : `not available. ${res.quote.binance.reason}`}</p>
              </section>)}
            {res.checks && (
              <section aria-label="Pre-execution checks" className="border-b pb-4 text-sm">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Execution eligibility: {res.eligibility?.eligible ? 'eligible' : 'not eligible'}</h2>
                <ul className="mt-2 space-y-2">
                  {res.checks.map(c => (
                    <li key={c.id} className="grid grid-cols-[4.5rem_1fr] gap-2">
                      <span className={`font-mono text-xs font-semibold uppercase ${c.state === 'pass' ? 'text-green-800' : c.state === 'fail' ? 'text-red-700' : 'text-amber-700'}`}>{c.state}</span>
                      <span><span className="font-medium">{c.label}.</span> {c.detail}<span className="block text-xs text-neutral-500">Source: {c.source}</span></span>
                    </li>))}
                </ul>
              </section>)}
            {res.review && res.plan?.tx && (
              <section ref={reviewRef} aria-label="Review and authorize" className="scroll-mt-4 border-2 border-neutral-900 p-4 text-sm">
                <h2 className="text-base font-semibold">Review before you authorize</h2>
                <p className="mt-1 text-neutral-600">Decoded from the transaction itself, not from this page&apos;s text.</p>
                <dl className="mt-3 grid grid-cols-[9rem_1fr] gap-y-2">
                  <dt className="text-neutral-500">You send</dt><dd><strong>{res.review.sendsBnb} BNB</strong> (about {money(res.investment?.investUsd ?? 0)}) from your own funds</dd>
                  <dt className="text-neutral-500">You receive at least</dt><dd><strong>{Number(res.review.minTokensOut).toFixed(6)} {res.instrument?.symbol}</strong>, quoted {res.quote?.dex.tokensOut.toFixed(6)}</dd>
                  <dt className="text-neutral-500">Tokens go to</dt><dd className="break-all font-mono text-xs">{res.review.recipient}</dd>
                  <dt className="text-neutral-500">Token contract</dt><dd className="break-all font-mono text-xs">{res.review.receivesToken}</dd>
                  <dt className="text-neutral-500">Executed by</dt><dd className="break-all font-mono text-xs">PancakeSwap V2 router {res.review.contract}</dd>
                  <dt className="text-neutral-500">Network fees</dt><dd>{res.fees?.totalUsd != null ? `about ${money(res.fees.totalUsd)} (pool fee plus gas), shown above` : 'estimate unavailable'}</dd>
                  <dt className="text-neutral-500">Expires</dt><dd>{res.review.deadlineUtc.slice(11, 19)} UTC (about {res.review.secondsLeft}s from quote)</dd>
                  <dt className="text-neutral-500">Calldata fingerprint</dt><dd className="font-mono text-xs">{res.review.calldataDigest}</dd>
                </dl>
                <div className="mt-4 space-y-2">
                  <label className="flex items-start gap-2"><input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)} className="mt-1" />
                    I reviewed the amounts and addresses above and I am authorizing this exact transaction.</label>
                  <label className="flex items-start gap-2"><input type="checkbox" checked={confirm} onChange={e => setConfirm(e.target.checked)} className="mt-1" />
                    I understand this spends real BNB on BSC mainnet and cannot be undone.</label>
                  <button type="button" disabled={!ack || !confirm || !!txHash || wallet.status !== 'connected'} onClick={sign} className="w-full bg-neutral-900 px-4 py-3 text-white disabled:opacity-40">Authorize in my wallet</button>
                  {wallet.status !== 'connected' && <p className="text-xs text-neutral-600">Use “Connect my browser wallet” in step 2 to authorize. Stockup will check that the account matches the recipient and that the wallet is on BSC before anything is sent.</p>}
                  <p className="text-xs text-neutral-500">Your wallet will show its own confirmation. If the amounts there differ from this page, reject it.</p>
                  {txHash && (
                    <div className="space-y-2 border-t pt-3">
                      <p className="break-all font-mono text-xs">Submitted to the network (not confirmed): <a className="underline" href={`https://bscscan.com/tx/${txHash}`} target="_blank" rel="noreferrer">{txHash}</a> Submitted is not settled. Nothing is confirmed until you verify settlement below.</p>
                      <div className="flex gap-2">
                        <button type="button" onClick={checkSettlement} className="border border-neutral-900 px-3 py-2">Verify settlement on-chain</button>
                        <button type="button" onClick={getReceipt} className="bg-neutral-900 px-3 py-2 text-white">Get ownership receipt</button>
                      </div>
                      {receipt && !receipt.ok && <p role="status" className="border-l-4 border-amber-600 bg-amber-50 p-3">{receipt.reason}</p>}
                      {receipt?.ok && receipt.receipt && (
                        <article aria-label="Ownership receipt" className="border-2 border-neutral-900 bg-white p-4">
                          <header className="flex items-baseline justify-between border-b pb-2"><h3 className="text-base font-semibold">Ownership receipt</h3><span className="font-mono text-xs">{receipt.receipt.receiptId}</span></header>
                          <p className="mt-3 text-lg font-semibold">{Number(receipt.receipt.onChain.receivedTokens).toFixed(6)} {receipt.receipt.onChain.tokenSymbol}</p>
                          <p className="text-xs text-neutral-600">≈ {receipt.receipt.exposure.sharesApprox?.toFixed(6) ?? 'n/a'} shares of {receipt.receipt.recordedByApp.companyName} ({receipt.receipt.exposure.basis})</p>
                          <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-green-800">Verified on-chain</h4>
                          <dl className="mt-1 grid grid-cols-[8rem_1fr] gap-y-1 text-xs">
                            <dt className="text-neutral-500">Holder</dt><dd className="break-all font-mono">{receipt.receipt.onChain.holder}</dd>
                            <dt className="text-neutral-500">Token</dt><dd className="break-all font-mono">{receipt.receipt.onChain.tokenAddress}</dd>
                            <dt className="text-neutral-500">Transaction</dt><dd className="break-all font-mono"><a className="underline" href={receipt.receipt.links.tx} target="_blank" rel="noreferrer">{receipt.receipt.onChain.txHash}</a></dd>
                            <dt className="text-neutral-500">Block · confirmations</dt><dd>{receipt.receipt.onChain.blockNumber} · {receipt.receipt.onChain.confirmations}</dd>
                            <dt className="text-neutral-500">Minimum authorized</dt><dd>{Number(receipt.receipt.onChain.authorizedMinimum).toFixed(6)}</dd>
                            <dt className="text-neutral-500">Gas</dt><dd>{Number(receipt.receipt.onChain.gasCostBnb).toFixed(6)} BNB</dd>
                            <dt className="text-neutral-500">Balance now</dt><dd>{receipt.receipt.onChain.holderBalanceNow ?? 'unavailable'}</dd>
                          </dl>
                          <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-600">Recorded by Stockup (not on-chain)</h4>
                          <p className="text-xs">{receipt.receipt.recordedByApp.merchantInput} → {receipt.receipt.recordedByApp.companyName} ({receipt.receipt.recordedByApp.ticker}); purchase {money(receipt.receipt.recordedByApp.spendUsd)}, invested {money(receipt.receipt.recordedByApp.investUsd)} of your own funds. {receipt.receipt.recordedByApp.note}</p>
                          <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-600">Check it yourself</h4>
                          <ul className="list-disc pl-5 text-xs">{receipt.receipt.verifyYourself.map(v => <li key={v}>{v}</li>)}</ul>
                          <p className="mt-2 text-xs"><a className="underline" href={receipt.receipt.links.token} target="_blank" rel="noreferrer">Token on BscScan</a> · <a className="underline" href={receipt.receipt.links.holderOnToken} target="_blank" rel="noreferrer">Your holding on BscScan</a></p>
                          <ul className="mt-3 list-disc border-t pt-2 pl-5 text-xs text-neutral-600">{receipt.receipt.limits.map(l => <li key={l}>{l}</li>)}</ul>
                        </article>)}
                      {settle && (
                        <div role="status" className={`border-l-4 p-3 ${settle.state === 'settled' ? 'border-green-700 bg-green-50' : settle.state === 'pending' ? 'border-amber-600 bg-amber-50' : 'border-red-700 bg-red-50'}`}>
                          <strong className="uppercase">{settle.state}</strong>
                          {settle.state === 'settled' && <p>Received {Number(settle.receivedTokens).toFixed(6)} {res.instrument?.symbol} (authorized minimum {Number(settle.minTokens).toFixed(6)}) in block {settle.blockNumber}, {settle.confirmations} confirmations, gas {Number(settle.gasCostBnb).toFixed(6)} BNB{settle.vsQuotedBps != null && `, ${(settle.vsQuotedBps / 100).toFixed(2)}% below the quote`}. Verified from the receipt&apos;s token Transfer logs.</p>}
                          {settle.detail && <p>{settle.detail}</p>}
                          {settle.problems && <ul className="list-disc pl-5">{settle.problems.map(p => <li key={p}>{p}</li>)}</ul>}
                          {settle.error && <p>{settle.error}</p>}
                        </div>)}
                    </div>)}
                </div>
              </section>)}
            {res.reviewProblems && res.reviewProblems.length > 0 && <section role="alert" className="border-l-4 border-red-700 bg-red-50 p-4 text-sm">Transaction failed verification and was withheld: {res.reviewProblems.join('; ')}.</section>}
            {(res.outcome === 'unidentified' || res.outcome === 'no_token') && <section className="border-l-4 border-amber-600 bg-amber-50 p-4 text-sm">{res.note}</section>}
            {res.investment && res.instrument && <dl className="grid grid-cols-2 gap-y-2 border-b pb-4 text-sm">
              <dt className="text-neutral-500">Spending event (entered by you, not verified)</dt><dd className="text-right">{money(res.investment.spendUsd)}</dd>
              <dt className="text-neutral-500">Your investment in {res.instrument.symbol} ({res.investment.investBps / 100}% of that amount)</dt><dd className="text-right">{money(res.investment.investUsd)} ≈ {res.convertedBnb} BNB</dd>
              <dt className="text-neutral-500">Funded by</dt><dd className="text-right">your own wallet. No merchant cashback.</dd>
            </dl>}
            {(res.outcome === 'no_route' || res.outcome === 'over_limit') && <section className="border-l-4 border-amber-600 bg-amber-50 p-4 text-sm"><h2 className="font-semibold">{res.outcome === 'over_limit' ? 'Amount over this build\'s per-trade limit' : `No on-chain route for ${res.instrument?.symbol}`}</h2><p className="mt-1">{res.note}</p></section>}
            {res.plan && <>
            <section className={`border-l-4 p-4 ${res.outcome === 'ready_to_sign' ? 'border-green-700 bg-green-50' : 'border-amber-600 bg-amber-50'}`}>
              <h2 className="text-sm font-semibold">{res.outcome === 'ready_to_sign' ? 'Eligible to execute' : res.outcome === 'not_eligible' ? 'Not eligible to execute' : 'Investment held by the guard'}</h2>
              <ul className="mt-2 list-disc pl-5 text-sm">
                {res.plan!.guard.allowed ? <li>All pre-trade checks passed; simulation {res.plan!.simulation.ok ? 'succeeded' : 'failed'}.</li>
                  : res.plan!.guard.reasons.map(r => <li key={r}>{r}</li>)}
              </ul>
              <p className="mt-2 text-sm">{res.note}</p>
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
    </div>
  );
}
