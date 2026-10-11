'use client';
import type { ParsedReceipt } from '@/lib/receipttext';
import type { PaperRow } from '@/lib/paperrows';

const PAPER = 'border border-ink/25 bg-white text-ink font-mono text-[13px] leading-6';
// Perforated bottom edge: a repeating mask, structural to the paper motif.
const PERF: React.CSSProperties = { WebkitMaskImage: 'radial-gradient(circle at 6px 100%, transparent 4px, #000 4.5px)', WebkitMaskSize: '12px 100%', WebkitMaskPosition: '0 100%', WebkitMaskRepeat: 'repeat-x', paddingBottom: 18 };

function Leader({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'bad' | 'mute' }) {
  const c = tone === 'ok' ? 'text-[#14532d]' : tone === 'bad' ? 'text-[#9a2a12]' : '';
  return (
    <div className="flex items-baseline gap-2">
      <span className="shrink-0">{label}</span>
      <span aria-hidden className="min-w-4 flex-1 translate-y-[-3px] border-b border-dotted border-ink/40" />
      <span className={`max-w-[60%] break-words text-right ${c}`}>{value}</span>
    </div>
  );
}

export function PaperPair({ pasted, parsed, rows, issued, receiptId, reason }: {
  pasted: string; parsed: ParsedReceipt | null; rows: PaperRow[]; issued: boolean; receiptId?: string; reason?: string;
}) {
  const lines = pasted.split(/\r?\n/).map(l => l.trimEnd()).filter(Boolean).slice(0, 12);
  return (
    <section aria-label="From purchase receipt to ownership receipt" className="grid items-start gap-6 md:grid-cols-[1fr_auto_1fr]">
      {/* LEFT: what the user pasted. Shown exactly as pasted; nothing invented. */}
      <article aria-label="Purchase receipt" className={`${PAPER} px-5 pt-5`} style={PERF}>
        <header className="flex items-baseline justify-between border-b border-dashed border-ink/30 pb-2">
          <h2 className="font-serif text-xl tracking-tight">Purchase receipt</h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink/60">pasted by you · unverified</span>
        </header>
        <div className="mt-3 md:min-h-[10.5rem] whitespace-pre-wrap break-words">
          {lines.length ? lines.map((l, i) => <div key={i} className={parsed && l === parsed.merchantLine ? 'bg-vermilion/15' : parsed?.totalLabel && l === parsed.totalLabel ? 'bg-vermilion/15' : ''}>{l}</div>)
            : <div className="text-ink/50">Nothing pasted. This panel shows pasted receipt text only; typing the purchase into the form works too.</div>}
        </div>
        {parsed && <p className="mt-3 border-t border-dashed border-ink/30 pt-2 font-mono text-[10px] text-ink/60">Highlighted lines are what Stockup read. It cannot tell if this receipt is real.</p>}
      </article>

      <div aria-hidden className="hidden select-none self-center text-center font-mono text-[10px] uppercase tracking-[0.14em] text-ink/60 md:block">
        <div className="text-2xl">→</div>
        <div>proved</div><div>line by line</div>
      </div>

      {/* RIGHT: ownership receipt. Rows appear only when the data proves them. */}
      <article aria-label="Ownership receipt" className={`${PAPER} px-5 pt-5`} style={PERF}>
        <header className="flex items-baseline justify-between border-b border-dashed border-ink/30 pb-2">
          <h2 className="font-serif text-xl tracking-tight">Ownership receipt</h2>
          <span className={`border px-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] ${issued ? 'border-[#14532d] text-[#14532d]' : 'border-ink/40 text-ink/60'}`}>
            {issued ? `Issued ${receiptId ?? ''}` : 'Unissued'}
          </span>
        </header>
        <div className="mt-3 md:min-h-[10.5rem] space-y-0.5">
          {rows.map(r => (
            <div key={r.key} className="motion-safe:transition-opacity motion-safe:duration-500" style={{ opacity: r.state === 'waiting' ? 0.45 : 1 }}>
              <Leader label={r.label} value={r.state === 'waiting' ? '' : r.value} tone={r.state === 'blocked' ? 'bad' : r.state === 'done' && (r.key === 'settle' || r.key === 'owned') ? 'ok' : undefined} />
            </div>))}
        </div>
        <p className="mt-3 border-t border-dashed border-ink/30 pt-2 font-mono text-[10px] text-ink/60">
          {issued ? 'Every line above was checked against BNB Chain. Open the links below to verify it yourself.'
            : reason ?? 'This becomes an ownership receipt only after the swap settles on-chain and is independently verified. Until then it stays unissued.'}
        </p>
      </article>
    </section>
  );
}
