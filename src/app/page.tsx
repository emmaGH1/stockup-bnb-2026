import { OwnFlow } from '@/components/own-flow';
import { HeroStage } from '@/components/hero-stage';

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-5 md:px-10">
      <header className="flex items-center justify-between border-b border-ink/30 py-4">
        <p className="text-sm font-bold uppercase tracking-[0.08em]">Stockup 2.0</p>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink/60">Spend to Own · BNB Chain</p>
      </header>

      {/* 01 — first fold: product statement beside a large staged commerce-to-investment scene */}
      <section aria-label="Introduction" className="grid gap-8 border-b-2 border-ink py-8 md:grid-cols-12 md:gap-10 md:py-10">
        <div className="flex flex-col md:col-span-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink/60">
            <span className="mr-2 inline-block size-2 bg-vermilion" aria-hidden />01 · What Stockup does
          </p>
          <h1 className="mt-4 text-balance text-6xl font-bold leading-[0.92] tracking-tight md:text-5xl lg:text-6xl xl:text-7xl">
            Shop the brands. Build a{' '}
            <em className="font-serif font-medium italic tracking-normal">stake</em>.
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-ink/80">
            Record a purchase yourself, fund a slice with your own money, and review the quote and safeguards
            before your wallet approves a swap into that company’s tokenized stock.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4 md:mt-auto md:pt-8">
            <a href="#invest-example" className="bg-vermilion px-5 py-3 text-sm font-semibold text-ink">
              Try the Amazon example
            </a>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink/60">You fund it. No merchant cashback.</p>
          </div>
        </div>
        <div className="md:col-span-7">
          <HeroStage />
        </div>
      </section>

      <p role="note" className="mt-8 max-w-2xl border-l-4 border-vermilion bg-mist/50 p-4 text-sm leading-6">
        Development build. Stockup reads the receipt text you paste and cannot verify it. The investment is your
        own money; there is no merchant cashback. Nothing is a confirmed trade until on-chain settlement is
        verified. Stockup never signs for you: a transaction is sent only after you authorize it in your own wallet.
      </p>

      {/* 02 — investment workspace (unchanged in this revision step) */}
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
