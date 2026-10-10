import { OwnFlow } from '@/components/own-flow';

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Spend to Own</h1>
      <p className="mt-2 max-w-xl text-neutral-700">Paste a shopping receipt, confirm what Stockup read, then invest a share of that amount from your own funds in the tokenized stock of the company you paid, on BNB Chain.</p>
      <p role="note" className="mt-4 max-w-xl border-l-4 border-amber-600 bg-amber-50 p-3 text-sm">
        Development build. The receipt is text you paste (or a sample); Stockup reads it locally, cannot verify it, and does not connect to cards, banks or merchants. You confirm the merchant and amount. The investment is your own money, not merchant cashback. Nothing is a confirmed trade until on-chain settlement is verified. Instrument lists and trading status come from Binance Web3 public endpoints. Prices and liquidity are read live from BSC mainnet. This page never signs or sends a transaction.
      </p>
      <div className="mt-10"><OwnFlow /></div>
    </main>
  );
}
