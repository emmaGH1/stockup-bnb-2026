import { readToken, client } from '../src/lib/bsc';
import { getAddress, parseAbi, formatUnits } from 'viem';
const a = process.argv[2]; const c = client();
try { console.log(await readToken(a, c)); } catch (e) { console.log('NOT AN ERC-20 on BSC:', String(e).slice(0, 100)); process.exit(0); }
const F = getAddress('0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73');
const f = parseAbi(['function getPair(address,address) view returns (address)']);
const p = parseAbi(['function getReserves() view returns (uint112,uint112,uint32)','function token0() view returns (address)']);
for (const [n, q] of [['WBNB','0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'],['USDT','0x55d398326f99059fF775485246999027B3197955'],['USDC','0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d']]) {
  const pair = await c.readContract({ address: F, abi: f, functionName: 'getPair', args: [getAddress(a), getAddress(q)] });
  if (/^0x0+$/.test(pair)) { console.log(n, 'no V2 pool'); continue; }
  const [[r0, r1], t0] = await Promise.all([c.readContract({ address: pair, abi: p, functionName: 'getReserves' }), c.readContract({ address: pair, abi: p, functionName: 'token0' })]);
  const quoteRes = t0.toLowerCase() === a.toLowerCase() ? r1 : r0;
  console.log(n, 'V2 pool', pair, 'quote-side reserve', formatUnits(quoteRes, 18));
}
