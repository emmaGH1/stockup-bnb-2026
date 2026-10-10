# Stockup 2.0 (BNB Hack: Tokenized Stocks Edition)

**Status: provisional foundation.** The approved product concept was not available to the agent, so no product flow is implemented. Nothing here claims a finished product.

## What exists (verified)
- `src/lib/bsc.ts`: read-only BSC mainnet ERC-20 reads via viem (live USDT read verified).
- `src/lib/w3w.ts`: signed Binance Web3 Wallet API client. Signing scheme is UNVERIFIED live (no API keys yet).
- `src/app`: minimal Next.js shell showing a real on-chain read. Not a designed UI.
- Checks: `npm run typecheck`, `npm test` (4 tests), `npm run build`.

## Run
```
npm install
cp .env.example .env   # add W3W keys on the VPS only
npm run dev
```
No funds are spent and no transactions are sent by this code.
