const micro = { fontSize: 9, letterSpacing: '0.12em' };

function Plus({ x, y }: { x: number; y: number }) {
  return <path d={`M ${x - 5} ${y} H ${x + 5} M ${x} ${y - 5} V ${y + 5}`} stroke="#171917" strokeOpacity={0.4} strokeWidth={1} />;
}

export function HeroStrip() {
  return (
    <figure>
      <svg viewBox="0 0 340 430" role="img" aria-label="Diagram of the flow: a spending event you record becomes an allocation from your own funds, which buys tokenized stock on BNB Chain whose listing and settlement are checked against the chain." className="w-full">
        <Plus x={12} y={14} /><Plus x={328} y={14} /><Plus x={12} y={416} /><Plus x={328} y={416} />

        {/* 01 — spending event */}
        <text x={60} y={18} fill="#171917" fillOpacity={0.7} fontFamily="var(--font-mono, monospace)" style={micro}>01 · SPENDING EVENT</text>
        <path d="M 100 30 H 240 V 96 L 232 90 L 224 96 L 216 90 L 208 96 L 200 90 L 192 96 L 184 90 L 176 96 L 168 90 L 160 96 L 152 90 L 144 96 L 136 90 L 128 96 L 120 90 L 112 96 L 104 90 L 100 96 Z" fill="#fff" stroke="#171917" strokeWidth={1.5} />
        <path d="M 112 46 H 200 M 112 58 H 226 M 112 70 H 170" stroke="#171917" strokeOpacity={0.35} strokeWidth={1.5} />
        <rect x={196} y={42} width={8} height={8} fill="#F26438" />
        <text x={100} y={114} fill="#171917" fillOpacity={0.7} fontFamily="var(--font-mono, monospace)" style={micro}>TYPED OR PASTED BY YOU</text>

        {/* connector */}
        <path d="M 170 128 V 168" stroke="#171917" strokeWidth={1.5} strokeDasharray="2 5" />
        <path d="M 165 162 L 170 170 L 175 162" fill="none" stroke="#171917" strokeWidth={1.5} />
        <rect x={166} y={144} width={8} height={8} fill="#F26438" />

        {/* 02 — allocation */}
        <text x={60} y={192} fill="#171917" fillOpacity={0.7} fontFamily="var(--font-mono, monospace)" style={micro}>02 · YOUR ALLOCATION</text>
        <circle cx={170} cy={248} r={40} fill="#fff" stroke="#171917" strokeWidth={1.5} />
        <circle cx={170} cy={248} r={30} fill="none" stroke="#171917" strokeOpacity={0.25} strokeWidth={1} strokeDasharray="2 4" />
        <text x={170} y={255} textAnchor="middle" fill="#171917" fontSize={20} fontWeight={700} fontFamily="var(--font-sans, sans-serif)">5%</text>
        <text x={100} y={304} fill="#171917" fillOpacity={0.7} fontFamily="var(--font-mono, monospace)" style={micro}>FROM YOUR OWN FUNDS</text>

        {/* connector */}
        <path d="M 170 312 V 344" stroke="#171917" strokeWidth={1.5} strokeDasharray="2 5" />
        <path d="M 165 338 L 170 346 L 175 338" fill="none" stroke="#171917" strokeWidth={1.5} />
        <rect x={166} y={322} width={8} height={8} fill="#F26438" />

        {/* 03 — tokenized stock */}
        <text x={60} y={360} fill="#171917" fillOpacity={0.7} fontFamily="var(--font-mono, monospace)" style={micro}>03 · TOKENIZED STOCK</text>
        <rect x={90} y={368} width={160} height={52} fill="#171917" />
        <text x={102} y={390} fill="#F4F3F0" fontSize={16} fontWeight={700} fontFamily="var(--font-sans, sans-serif)">AMZNon</text>
        <text x={102} y={408} fill="#F4F3F0" fillOpacity={0.65} fontFamily="var(--font-mono, monospace)" style={micro}>LISTED · CHECKED</text>
        <path d="M 208 406 l 4 4 l 8 -9" fill="none" stroke="#F26438" strokeWidth={2} />
      </svg>
      <figcaption className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink/60">
        The flow, not a claim. Example instrument; real numbers come only from live checks.
      </figcaption>
    </figure>
  );
}
