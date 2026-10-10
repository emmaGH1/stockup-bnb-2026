import { readToken } from '../src/lib/bsc';
const cands: Record<string,string> = {
  AAPLon: '0x390a684ef9cade28a7ad0dfa61ab1eb3842618c4',
  JNJon: '0xd1F799cB9f5d0a02951b0755BeCeD6C43882712F',
  CRCLon: '0x992879cd3645391d84fae41df2ed709d042cbf34',
  USDon: '0x1f8955E640Cbd9abc3C3Bb408c9E2E1f5F20DfE6',
  NVDAB: '0x02fca66c25d8f6f59518d9609f7a77e3598a7436',
};
for (const [name, a] of Object.entries(cands)) {
  try { const t = await readToken(a); console.log(name, 'OK on-chain symbol=', t.symbol, 'decimals=', t.decimals); }
  catch (e) { console.log(name, 'FAIL', String(e).slice(0, 80)); }
}
