import { client, BSC_TOKENS } from '../src/lib/bsc';
import { VERIFIED_ASSETS } from '../src/lib/assets';
import { parseAbi, getAddress } from 'viem';
const c = client();
const V2 = getAddress('0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73');
const V3 = getAddress('0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865');
const v2 = parseAbi(['function getPair(address,address) view returns (address)']);
const v3 = parseAbi(['function getPool(address,address,uint24) view returns (address)']);
const Z = '0x0000000000000000000000000000000000000000';
const quotes = [BSC_TOKENS.USDT, BSC_TOKENS.USDC, '0x1f8955E640Cbd9abc3C3Bb408c9E2E1f5F20DfE6', '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'];
for (const a of VERIFIED_ASSETS) for (const q of quotes) {
  if (getAddress(q) === getAddress(a.address)) continue;
  const p2 = await c.readContract({ address: V2, abi: v2, functionName: 'getPair', args: [getAddress(a.address), getAddress(q)] });
  if (p2 !== Z) console.log(a.symbol, 'V2', q.slice(0,8), p2);
  for (const fee of [100, 500, 2500, 10000]) {
    const p3 = await c.readContract({ address: V3, abi: v3, functionName: 'getPool', args: [getAddress(a.address), getAddress(q), fee] });
    if (p3 !== Z) console.log(a.symbol, 'V3', fee, q.slice(0,8), p3);
  }
}
console.log('done');
