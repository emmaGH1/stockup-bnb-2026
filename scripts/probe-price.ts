import { readV2Price } from '../src/lib/price';
import { BSC_TOKENS } from '../src/lib/bsc';
console.log(await readV2Price('0xE545e390D757F7071b48D3BEA88C912DF497c3Ee', '0x390a684ef9cade28a7ad0dfa61ab1eb3842618c4', BSC_TOKENS.USDT));
