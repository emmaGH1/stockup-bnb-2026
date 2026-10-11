import type { ReactNode } from 'react';

// Original commerce-to-investment scene on an ink stage (architectural elevation). A shopfront (what happened:
// commerce), a hatched dashed slab (what is only PLANNED until BNB Chain confirms), and the user's own-funds slice
// of the recorded spend feeding it. Example company and amounts only. It shows no holdings, no automatic
// purchase detection and no merchant payout.
const INK = '#171917', PAPER = '#F4F3F0', MIST = '#DADBD6', VERM = '#F26438';
const mono = 'var(--font-mono, monospace)';
const sans = 'var(--font-sans, sans-serif)';
const micro = { fontSize: 11, letterSpacing: '0.12em' } as const;

function Defs({ id }: { id: string }) {
  return (
    <defs>
      <pattern id={`${id}-grid`} width={40} height={40} patternUnits="userSpaceOnUse">
        <path d="M 40 0 H 0 V 40" fill="none" stroke={PAPER} strokeOpacity={0.07} strokeWidth={1} />
      </pattern>
      <pattern id={`${id}-hatch`} width={8} height={8} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1={0} y1={0} x2={0} y2={8} stroke={PAPER} strokeOpacity={0.22} strokeWidth={1.3} />
      </pattern>
    </defs>
  );
}

function Label({ x, y, anchor = 'start', children }: { x: number; y: number; anchor?: 'start' | 'middle' | 'end'; children: ReactNode }) {
  return <text x={x} y={y} textAnchor={anchor} fill={PAPER} fillOpacity={0.78} fontFamily={mono} style={micro}>{children}</text>;
}

function Plus({ x, y }: { x: number; y: number }) {
  return <path d={`M ${x - 5} ${y} H ${x + 5} M ${x} ${y - 5} V ${y + 5}`} stroke={PAPER} strokeOpacity={0.5} strokeWidth={1} />;
}

function Storefront({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={30} y={0} width={180} height={34} fill={PAPER} stroke={INK} strokeWidth={1.5} />
      <text x={120} y={23} textAnchor="middle" fill={INK} fontFamily={sans} fontSize={16} fontWeight={700} letterSpacing="0.16em">AMAZON</text>
      <path d="M 66 34 V 50 M 174 34 V 50" stroke={PAPER} strokeWidth={2} />
      {Array.from({ length: 8 }, (_, i) => {
        const fill = i % 2 ? MIST : PAPER;
        return (
          <g key={i}>
            <rect x={i * 30} y={50} width={30} height={34} fill={fill} stroke={INK} strokeWidth={1.5} />
            <path d={`M ${i * 30} 84 H ${i * 30 + 30} L ${i * 30 + 15} 98 Z`} fill={fill} stroke={INK} strokeWidth={1.5} />
          </g>
        );
      })}
      <rect x={10} y={98} width={220} height={178} fill={PAPER} stroke={INK} strokeWidth={2} />
      <rect x={24} y={120} width={64} height={76} fill={INK} />
      <rect x={152} y={120} width={64} height={76} fill={INK} />
      <path d="M 56 120 V 196 M 24 158 H 88 M 184 120 V 196 M 152 158 H 216" stroke={PAPER} strokeOpacity={0.55} strokeWidth={1.2} />
      <rect x={100} y={160} width={40} height={116} fill={INK} />
      <rect x={126} y={222} width={7} height={7} fill={VERM} />
    </g>
  );
}

function Slab({ x, y, w, h, id }: { x: number; y: number; w: number; h: number; id: string }) {
  const mid = h / 2;
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={0} y={0} width={w} height={h} fill={`url(#${id}-hatch)`} stroke={PAPER} strokeWidth={2} strokeDasharray="8 6" />
      <rect x={w - 86} y={12} width={74} height={22} fill={INK} stroke={PAPER} strokeWidth={1.2} />
      <text x={w - 49} y={27} textAnchor="middle" fill={PAPER} fontFamily={mono} style={micro}>PLANNED</text>
      <rect x={18} y={mid - 34} width={w - 36} height={76} fill={PAPER} stroke={INK} strokeWidth={1.5} />
      <text x={34} y={mid + 2} fill={INK} fontFamily={sans} fontSize={28} fontWeight={700}>AMZNon</text>
      <text x={34} y={mid + 26} fill={INK} fillOpacity={0.72} fontFamily={mono} style={micro}>TOKENIZED STOCK</text>
      <rect x={w - 44} y={mid - 20} width={9} height={9} fill={VERM} />
    </g>
  );
}

function SpendBar({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const slice = w * 0.05;
  const ty = h / 2 + 5;
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={0} y={0} width={w - slice} height={h} fill={MIST} stroke={PAPER} strokeWidth={1.5} />
      <rect x={w - slice} y={0} width={slice} height={h} fill={VERM} stroke={PAPER} strokeWidth={1.5} />
      <text x={14} y={ty} fill={INK} fontFamily={sans} fontSize={17} fontWeight={700}>$100</text>
      <text x={68} y={ty - 1} fill={INK} fillOpacity={0.78} fontFamily={mono} style={micro}>AMAZON PURCHASE · EXAMPLE</text>
    </g>
  );
}

const ALT = 'Illustration of the flow: you shop at a company (example: Amazon), you fund a 5% slice of that recorded spend from your own money, and Stockup prepares a planned investment in that same company\u2019s supported tokenized stock on BNB Chain, which counts only once BNB Chain confirms it.';
const dotted = { stroke: PAPER, strokeWidth: 1.8, strokeDasharray: '2 5', fill: 'none' } as const;
const head = { fill: 'none', stroke: PAPER, strokeWidth: 1.8 } as const;
const proposed = { fill: PAPER, fontFamily: sans, fontSize: 13, fontWeight: 700 } as const;

export function HeroStage() {
  const ticksD = Array.from({ length: 16 }, (_, i) => `M ${10 + i * 40} 348 v 6`).join(' ');
  const ticksM = Array.from({ length: 9 }, (_, i) => `M ${10 + i * 40} 278 v 6`).join(' ');
  return (
    <figure>
      {/* Desktop composition */}
      <svg viewBox="0 0 640 466" role="img" aria-label={ALT} className="hidden w-full bg-ink md:block">
        <Defs id="d" />
        <rect width={640} height={466} fill="url(#d-grid)" />
        <Plus x={10} y={10} /><Plus x={630} y={10} /><Plus x={10} y={456} /><Plus x={630} y={456} />
        <Label x={30} y={32}>01 · YOU SHOP AT A COMPANY</Label>
        <Storefront x={30} y={48} s={1.1} />
        <path d="M 10 348 H 630" stroke={PAPER} strokeWidth={2.2} />
        <path d={ticksD} stroke={PAPER} strokeOpacity={0.5} strokeWidth={1} />
        <Label x={388} y={72}>03 · SUPPORTED TOKENIZED STOCK</Label>
        <Slab x={388} y={84} w={222} h={264} id="d" />
        <path d="M 304 230 H 384" {...dotted} />
        <rect x={336} y={226} width={8} height={8} fill={VERM} />
        <Label x={344} y={206} anchor="middle">SAME</Label>
        <Label x={344} y={262} anchor="middle">COMPANY</Label>
        <Label x={30} y={382}>02 · YOU FUND A SLICE</Label>
        <text x={584} y={382} textAnchor="end" {...proposed}>PROPOSED INVESTMENT · $5 (5%) OF YOUR OWN FUNDS</text>
        <path d="M 595 394 V 358" {...dotted} />
        <path d="M 589 365 L 595 357 L 601 365" {...head} />
        <SpendBar x={30} y={398} w={580} h={46} />
      </svg>

      {/* Mobile composition: stacked, near-native text sizes, kept short to limit scrolling */}
      <svg viewBox="0 0 340 612" role="img" aria-label={ALT} className="w-full bg-ink md:hidden">
        <Defs id="m" />
        <rect width={340} height={612} fill="url(#m-grid)" />
        <Plus x={10} y={10} /><Plus x={330} y={10} />
        <Label x={20} y={26}>01 · YOU SHOP AT A COMPANY</Label>
        <Storefront x={68} y={36} s={0.85} />
        <path d="M 10 278 H 330" stroke={PAPER} strokeWidth={2.2} />
        <path d={ticksM} stroke={PAPER} strokeOpacity={0.5} strokeWidth={1} />
        <path d="M 170 286 V 314" {...dotted} />
        <rect x={166} y={294} width={8} height={8} fill={VERM} />
        <Label x={186} y={304}>SAME COMPANY</Label>
        <Label x={20} y={338}>03 · SUPPORTED TOKENIZED STOCK</Label>
        <Slab x={50} y={346} w={240} h={150} id="m" />
        <Label x={20} y={520}>02 · YOU FUND A SLICE</Label>
        <path d="M 312 554 V 522 H 270 V 510" {...dotted} />
        <path d="M 264 517 L 270 509 L 276 517" {...head} />
        <text x={300} y={544} textAnchor="end" {...proposed}>PROPOSED · $5 (5%) OF YOUR OWN FUNDS</text>
        <SpendBar x={20} y={556} w={300} h={42} />
      </svg>
      <figcaption className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-ink/60">
        Example only · shopping alone buys nothing · you choose and fund the slice · nothing is owned until BNB Chain confirms
      </figcaption>
    </figure>
  );
}
