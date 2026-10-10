import { findInstrument, fetchAssetStatus } from '../src/lib/instruments';
for (const tk of process.argv.slice(2)) {
  const r = await findInstrument(tk);
  console.log(tk, '->', r.status, r.status === 'supported' ? `${r.instrument.symbol} ${r.instrument.address} verifiedOnChain=${r.instrument.verifiedOnChain} multiplier=${r.instrument.multiplier}` : r.reason);
  if (r.status === 'supported') console.log('   live status:', await fetchAssetStatus(r.instrument.address));
}
