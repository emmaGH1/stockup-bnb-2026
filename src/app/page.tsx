import { OwnFlow } from '@/components/own-flow';
import { HeroStrip } from '@/components/hero-strip';

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-5 md:px-10">
      <header className="flex items-center justify-between border-b border-ink/30 py-4">
        <p className="text-sm font-bold uppercase tracking-[0.08em]">Stockup 2.0</p>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink/60">Spend to Own · BNB Chain</p>
      </header>

      {/* 01 — first fold: grid, product statement, signature flow diagram */}
      <section aria-label="Introduction" className="grid gap-10 border-b-2 border-ink py-10 md:grid-cols-12 md:py-14">
        <div className="md:col-span-7">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink/60">
            <span className="mr-2 inline-block size-2 bg-vermilion" aria-hidden />01 · What Stockup does
          </p>
          <h1 className="mt-5 text-balance text-5xl font-bold leading-[0.95] tracking-tight md:text-7xl">
            Everyday purchases,{' '}
            <em className="font-serif font-medium italic tracking-normal">invested</em>{' '}
            in the companies you shop with.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-ink/80">
            Stockup transforms everyday spending decisions into user-funded investments in tokenized stocks —
            listing, quote, safeguards and settlement verified before anything is called real.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a href="#invest" className="bg-vermilion px-5 py-3 text-sm font-semibold text-ink">
              Run the investment check
            </a>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink/60">You fund it. No merchant cashback.</p>
          </div>
        </div>
        <div className="md:col-span-5">
          <HeroStrip />
        </div>
      </section>

      <p role="note" className="mt-8 max-w-2xl border-l-4 border-vermilion bg-mist/50 p-4 text-sm leading-6">
        Development build. Stockup reads the receipt text you paste and cannot verify it. The investment is your
        own money; there is no merchant cashback. Nothing is a confirmed trade until on-chain settlement is
        verified. Stockup never signs for you: a transaction is sent only after you authorize it in your own wallet.
      </p>

      {/* 02 — investment workspace */}
      <section id="invest" aria-label="Investment workspace" className="mt-12 scroll-mt-6 border-t-2 border-ink pt-8 pb-20">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink/60">
          <span className="mr-2 inline-block size-2 bg-vermilion" aria-hidden />02 · Investment workspace
        </p>
        <h2 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">Check a real allocation before anything moves</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-ink/70">
          Live market data, an on-chain quote and safeguards, with every number sourced. The transaction stays
          unsigned until your own wallet authorizes it.
        </p>
        <div className="mt-8">
          <OwnFlow />
        </div>
      </section>
    </main>
  );
}
