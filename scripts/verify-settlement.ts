// Read-only: verify a tx hash against expected swap parameters. Usage: tsx scripts/verify-settlement.ts <hash> <token> <recipient> <valueWei> <minOutWei>
import { verifySettlement } from '../src/lib/settle';
const [hash, token, recipient, value, minOut] = process.argv.slice(2);
console.log(JSON.stringify(await verifySettlement(hash, { token, recipient, valueWei: BigInt(value), minOutWei: BigInt(minOut) }), null, 1));
