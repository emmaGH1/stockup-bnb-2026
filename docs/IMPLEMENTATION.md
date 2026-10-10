# Implementation plan (Stockup 2.0: Spend to Own)

Branch: `dev/foundation`. Mode B (Sprint). Deadline: 2026-10-11 12:00 UTC (unverified on the official page).

## Product rules (binding, enforced by tests in `test/claims.test.ts`)
1. The purchase is a **receipt the user pastes or types**. Stockup does not connect to cards, banks or merchants and cannot verify the receipt is real.
2. The investment is **the user's own money**, paid from their wallet. **No merchant cashback or reward exists.**
3. **Never claim a trade succeeded** unless settlement was independently verified on-chain. "Submitted" is not "settled".

## Phases and status
| # | Phase | Exit criteria | Status |
|---|---|---|---|
| 0 | Harness, CI, private repo | typecheck + tests + build in CI | done (CI green on last pushes) |
| 1 | Typed BSC reads, verified asset registry | live reads; symbol checks | done |
| 2 | Merchant -> company identification | whole-word alias match; ambiguous/unknown reported | done (curated list, 6 companies) |
| 3 | Instrument discovery | listed on Binance BSC list AND on-chain symbol matches | done |
| 4 | Live market data and live trading status | Binance public endpoints; unreachable = not tradable | done |
| 5 | Executable quote | PancakeSwap V2 `getAmountsOut` + `eth_call` simulation | done (Binance `baw` quote blocked by sign-in) |
| 6 | Pre-execution checks | market, fees, quote age, guard, wallet funds; unknown blocks | done |
| 7 | Review and authorize | calldata decoded and matched to quote; tamper tests | done |
| 8 | Settlement verification | receipt-level checks; validated on a real mainnet swap | done (read-only) |
| 9 | Ownership receipt | issued only for verified, final, listed-token settlement | done |
| 10 | Receipt-to-ownership interface | purchase vs ownership paper; "planned" until proven | done, desktop + mobile screenshots |
| 11 | Wallet connection | read/connect only; send requires matching account on BSC | done, tested with a mock provider |
| 12 | **Real capped purchase on BSC mainnet** | user authorizes in own wallet; settlement verified; receipt issued | **blocked on user approval, funded wallet, cap** |
| 13 | Binance signed API / `baw` quote | credentials or sign-in | **blocked on human** |
| 14 | Demo recording, submission package | verified evidence only | not started; needs phase 12 |

## Blockers (owned by a human)
- Real purchase: approval, funded wallet connected via browser extension, a cap (about $5 plus gas).
- Binance Agentic Wallet sign-in (pairing code in the Binance app) for the official quote.
- Official judging page check (weights and the "2 transactions" rule come from a search summary).

## What the judges will see (evidence we can actually produce)
- The receipt flow and the honest "no" for unsupported merchants (Starbucks: no pool, market closed).
- Live Binance public data and an on-chain quote compared to Binance's reference price.
- Review screen decoded from calldata, and a checklist where unknown blocks.
- Settlement check on a real mainnet swap (a historical one, not Stockup's) and the receipt pipeline on that data.
- A Stockup receipt **only if** phase 12 happens. Until then the product must say that plainly.
