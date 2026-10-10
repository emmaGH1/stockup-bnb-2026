import { readV2Price } from '../src/lib/price';
import { client } from '../src/lib/bsc';
import { parseAbi, getAddress, erc20Abi, formatUnits } from 'viem';
const c = client(); const AAPL = '0x390a684ef9cade28a7ad0dfa61ab1eb3842618c4';
console.log('V2 AAPLon/WBNB', await readV2Price('0xEd226182eC1d7A888C9bFc002710fF1EEDbFD7Ab', AAPL, '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'));
const v3 = parseAbi(['function liquidity() view returns (uint128)']);
for (const [n, p, q] of [['V3 100 USDT','0x8dcBA688219dc5Ee6dbf74ee2F74045E2A07C79C','0x55d398326f99059fF775485246999027B3197955'],['V3 2500 USDT','0xC0BFbc52dEeceE475BDb52A62f8D7cF128B59358','0x55d398326f99059fF775485246999027B3197955'],['V3 100 USDC','0x58a631f2c15e9cB80Ff0c2e4B980CbDb377e6FB0','0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d']] as const) {
  const [liq, bal] = await Promise.all([
    c.readContract({ address: getAddress(p), abi: v3, functionName: 'liquidity' }),
    c.readContract({ address: getAddress(q), abi: erc20Abi, functionName: 'balanceOf', args: [getAddress(p)] }),
  ]);
  console.log(n, 'liquidity', liq.toString(), 'quote token held', formatUnits(bal, 18));
}
