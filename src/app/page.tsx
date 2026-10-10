import { VERIFIED_ASSETS } from '@/lib/assets';
import { readAssets } from '@/lib/registry';
import { getStatuses } from '@/lib/status';
import { canTrade } from '@/lib/session';
export const dynamic = 'force-dynamic';

export default async function Home() {
  const [rows, { statuses, mode }] = [await readAssets(VERIFIED_ASSETS), getStatuses()];
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">Stockup 2.0</h1>
      <p className="mt-2 text-sm text-neutral-600">Provisional shell. The product concept has not been applied and no design is approved.</p>
      {mode === 'fixture' && (
        <p role="note" className="mt-4 border-l-4 border-amber-600 bg-amber-50 p-3 text-sm">
          Market session column is <strong>development fixture data</strong>, not a Binance Web3 Wallet response. Token columns are live BSC mainnet reads.
        </p>
      )}
      <table className="mt-6 w-full text-left text-sm">
        <thead><tr className="border-b text-neutral-500"><th className="py-2">Token</th><th>Live supply (BSC)</th><th>Chain check</th><th>Session (fixture)</th></tr></thead>
        <tbody>
          {rows.map(r => {
            const d = canTrade(statuses.find(s => s.symbol === r.symbol));
            return (
              <tr key={r.address} className="border-b align-top">
                <td className="py-2"><div className="font-medium">{r.symbol}</div><div className="break-all font-mono text-xs text-neutral-500">{r.address}</div></td>
                <td>{r.onChain ? Number(r.onChain.totalSupply).toLocaleString('en-US', { maximumFractionDigits: 2 }) : 'n/a'}</td>
                <td>{r.status}</td>
                <td>{d.reason}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}
