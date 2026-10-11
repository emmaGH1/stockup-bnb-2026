import { OwnFlow } from '@/components/own-flow';

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-5 md:px-10">
      {/* First fold: product statement on an architectural grid */}
      <section aria-label="Introduction" className="grid gap-8 border-b-2 border-ink py-10 md:grid-cols-12 md:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] md:col-span-3">Stockup 2.0 · Spend to Own</p>
        <div className="md:col-span-9">
          <h1 className="text-balance font-serif text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            Connect everyday purchases to investments in the companies people shop with.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-ink/80 md:text-lg">
            Tokenized shares, bought on BNB Chain with your own money, in companies you already pay.
          </p>
        </div>
      </section>

      <p role="note" className="mt-8 max-w-2xl border-l-4 border-vermilion bg-mist/50 p-4 text-sm leading-6">
        Development build. Stockup reads the receipt text you paste and cannot verify it. The investment is your own money; there is no merchant cashback. Nothing is a confirmed trade until on-chain settlement is verified. Stockup never signs for you: a transaction is sent only after you authorize it in your own wallet.
      </p>

      {/* Primary investment workspace */}
      <section aria-label="Investment workspace" className="mt-10 border-t border-ink/30 pt-8 pb-16">
        <OwnFlow />
      </section>
    </main>
  );
}
