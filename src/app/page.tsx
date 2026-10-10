import { readToken, BSC_TOKENS } from '@/lib/bsc';
export const dynamic = 'force-dynamic';

export default async function Home() {
  const token = await readToken(BSC_TOKENS.USDT).catch(() => null);
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">Stockup 2.0</h1>
      <p className="mt-2 text-sm text-neutral-600">Provisional shell. Product concept not yet applied; no UI design has been approved.</p>
      <section className="mt-8 border-t pt-4">
        <h2 className="text-sm font-medium">Live BSC read (mainnet, read-only)</h2>
        {token ? (
          <dl className="mt-2 grid grid-cols-[8rem_1fr] gap-y-1 text-sm">
            <dt className="text-neutral-500">Token</dt><dd>{token.symbol}</dd>
            <dt className="text-neutral-500">Address</dt><dd className="break-all font-mono">{token.address}</dd>
            <dt className="text-neutral-500">Total supply</dt><dd>{token.totalSupply}</dd>
          </dl>
        ) : <p className="mt-2 text-sm">RPC read failed.</p>}
      </section>
    </main>
  );
}
