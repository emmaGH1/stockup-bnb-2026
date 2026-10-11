# Stockup 2.0: Spend to Own

Stockup turns a shopping receipt into an investment journey: the user's own money buys a
tokenized stock on BNB Smart Chain, after live checks and a review of exactly what their wallet will sign.

**Status: pre-submission, not deployed, no real trade executed.** Everything below is either verified in this repo
or labelled as not verified. No ownership receipt exists yet. See [docs/CURRENT_STATE.md](docs/CURRENT_STATE.md) for the
dated record.

## Rules the product enforces
1. The purchase is a receipt the user pastes or types. Stockup cannot verify the receipt is genuine.
2. The investment is the user's own money. There is no merchant cashback or reward.
3. A trade is claimed as successful only after the on-chain settlement is verified. "Submitted" is not "settled".

These rules are enforced by tests in `test/claims.test.ts`.

## How a judge can check this (about 10 minutes, no funds, no keys)
See [docs/JUDGE_FLOW.md](docs/JUDGE_FLOW.md) for the exact steps, expected results, and what each result proves.

Short version:
```bash
npm ci
npm run typecheck     # passes
npm test              # 105 tests pass
npm run build         # production build passes
npm start             # serves on http://localhost:3000
```

## What is verified, and how
| Claim | Evidence | Reproduce |
|---|---|---|
| Typecheck, tests, build pass | CI and local runs at the commit in `docs/CURRENT_STATE.md` | `npm run typecheck && npm test && npm run build` |
| Tokenized stock is on Binance's BSC list, with a matching on-chain symbol | live public endpoints | `npx tsx scripts/revalidate-trade.ts` (set `RECIPIENT`) |
| Public Binance RWA endpoints still return the fields the code reads | live probe | `npx tsx scripts/probe-binance-public.ts` |
| Live PancakeSwap V2 quote and eth_call simulation for a $5 trade | live BSC mainnet reads | `curl -X POST localhost:3000/api/plan ...` (see judge flow; the recipient must be an address you control or an unfunded one) |
| Calldata decodes to the router, path, recipient, minimum and deadline the user is shown | unit tests with tamper cases | `npx vitest run test/review.test.ts` |
| Settlement check rejects wrong router, sender, path, recipient, amount and non-swap calldata | unit tests with mutation checks | `npx vitest run test/settle.test.ts` |
| Ownership receipt refused for non-settled, non-final or unlisted tokens | unit tests | `npx vitest run test/receipt.test.ts` |
| Authorize stays disabled until the wallet is connected and matches the recipient on BSC | browser audit, mock wallet only | `scripts/audit-live.mjs` (needs Playwright and a deployed URL) |

## What is NOT verified
- A real wallet extension or a mobile wallet browser. Every wallet test used a mock EIP-1193 provider.
- Any real Stockup transaction. No funds have been spent and nothing has been broadcast.
- Binance's official executable quote (`baw`). It needs a human sign-in and returns NOT_LOGGED_IN.
- Binance's signed Web3 API. It returns compliance code 40304 for the test key. The product does not use it. See `docs/BLOCKERS.md`.
- Binance Web3 trading fees. They are not in the fee figure.
- Issuer identity. Eligibility is a Binance listing plus an on-chain symbol match, not proof of who issued the token.

## Known limits
- Settlement and receipt routes take the expected amounts and recipient from the client. Input validation rejects malformed or inconsistent values, but the stronger fix (a server-side review store) is not built.
- No rate limiting. `'unsafe-inline'` remains in the CSP.
- The ownership exposure is an Ondo tokenized exposure to the stock, not direct share ownership.

## Configuration
Copy `.env.example` to `.env` if you need to change anything. No secret is required to run or test the app.

| Variable | Needed? | Notes |
|---|---|---|
| `BSC_RPC_URL` | optional | defaults to `https://bsc-dataseed.binance.org` |
| `W3W_API_KEY`, `W3W_API_SECRET` | no | used only by the one-off probe `scripts/probe-w3w-auth.ts`; never read by the app |

Never commit `.env`. It is git-ignored.

## Repository map
- `src/lib/`: business logic. Discovery (`instruments.ts`, `company.ts`), market data (`marketdata.ts`), quote and guard (`swap.ts`, `plan.ts`, `guard.ts`), checks (`checks.ts`), review (`review.ts`), settlement (`settle.ts`, `settle-input.ts`), receipt (`receipt.ts`), receipt text parsing (`receipttext.ts`).
- `src/app/api/`: `/api/own` (whole journey), `/api/plan`, `/api/settle`, `/api/receipt`, `/api/assets`, `/api/token`. All read-only; none sends a transaction.
- `src/components/own-flow.tsx`: the browser flow. It asks the user's wallet to sign; the app holds no key.
- `scripts/`: read-only integration probes and audits.
- `test/`: 105 unit tests.
- `docs/`: `ARCHITECTURE.md`, `JUDGE_FLOW.md`, `CURRENT_STATE.md`, `BLOCKERS.md`, `DEVEX_REPORT.md`, `MAINNET_TEST_PROCEDURE.md` (draft, not approved), `DEPLOY.md`.
