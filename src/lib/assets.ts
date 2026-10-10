// Only addresses whose on-chain symbol() matched on BSC mainnet on 2026-10-10 (scripts/verify-addresses.ts).
// Issuer authenticity is NOT independently confirmed; sources were a search summary. Check bscscan/issuer docs before relying.
export const VERIFIED_ASSETS = [
  { symbol: 'AAPLon', standard: 'ondo', address: '0x390a684ef9cade28a7ad0dfa61ab1eb3842618c4' },
  { symbol: 'JNJon', standard: 'ondo', address: '0xd1F799cB9f5d0a02951b0755BeCeD6C43882712F' },
  { symbol: 'USDon', standard: 'ondo', address: '0x1f8955E640Cbd9abc3C3Bb408c9E2E1f5F20DfE6' },
] as const;
