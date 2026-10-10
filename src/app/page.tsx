import { OwnFlow } from '@/components/own-flow';

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Spend to Own</h1>
      <p className="mt-2 max-w-xl text-neutral-700">Part of what you earn at a merchant becomes a share of that merchant, as a tokenized stock on BNB Chain.</p>
      <p role="note" className="mt-4 max-w-xl border-l-4 border-amber-600 bg-amber-50 p-3 text-sm">
        Development build. Merchant reward rates and market-session status are placeholders, not live data. Prices and liquidity are read live from BSC mainnet. This page never signs or sends a transaction.
      </p>
      <div className="mt-10"><OwnFlow /></div>
    </main>
  );
}
