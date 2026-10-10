import { OwnFlow } from '@/components/own-flow';

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="max-w-3xl text-balance font-serif text-4xl font-semibold tracking-tight">A receipt for what you bought. A receipt for what you own.</h1>
      <p className="mt-1 text-sm uppercase tracking-widest text-neutral-500">Stockup 2.0 · Spend to Own</p>
      <p className="mt-2 max-w-xl text-neutral-700">Paste a shopping receipt, confirm what Stockup read, then invest a share of that amount from your own funds in the tokenized stock of the company you paid, on BNB Chain.</p>
      <p role="note" className="mt-4 max-w-xl border-l-4 border-amber-600 bg-amber-50 p-3 text-sm">
        Development build. Stockup reads the receipt text you paste and cannot verify it. The investment is your own money; there is no merchant cashback. Nothing is a confirmed trade until on-chain settlement is verified. This page never signs or sends a transaction.
      </p>
      <div className="mt-10"><OwnFlow /></div>
    </main>
  );
}
