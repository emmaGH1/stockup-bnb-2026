# Current state
Last updated: 2026-10-10 ~15:30 UTC (VPS clock). Branch dev/foundation.

## Verified (run this session)
- `tsc --noEmit` clean; `vitest` 5/5 pass; `next build` passes.
- Live BSC mainnet (chainId 56) reads via viem.
- `GET /api/assets` returned live on-chain data for AAPLon, JNJon, USDon (all status ok). `GET /api/token?address=zzz` -> 400.
- Asset registry src/lib/assets.ts: only addresses whose on-chain symbol() matched. Issuer authenticity NOT confirmed.

- Off-market gate `canTrade()` (src/lib/session.ts) unit-tested: blocks closed/halted/unknown. Home page renders live token reads plus a session column.
- Session data is FIXTURE ONLY (src/lib/fixtures/w3w.ts, source:"fixture"); UI shows an amber banner saying so. 7/7 tests.

- src/lib/price.ts: V2 reserve price math unit-tested (10/10 tests). Live pools checked: liquidity is dust, so price is NOT surfaced in the UI (see BLOCKERS.md).

## Unverified / not done
- Live W3W tokenized-securities status is not implemented; fixture shapes are invented, not real response schemas.
- W3W API: signing scheme from a search summary, never tested live (no keys). Unauthenticated calls return 401.
- Dockerfile/docker-compose untested (docker not installed on VPS). CI workflow not yet observed running on GitHub.
- No product concept/flows, no designed UI, no demo, no on-chain transactions (need approval and funds).

## Blocked on human (details: docs/BLOCKERS.md)
Concept + MVP scope; W3W keys in .env on VPS; approval to spend for on-chain txs.

## Next action
If concept arrives: write docs/PROJECT.md and build the core flow. If W3W keys arrive: run live signed call and log DevEx findings. Otherwise: check GitHub Actions result for the latest push.

## Update (commit 7143fb9, 15:13 UTC on the VPS clock): guarded swap planner (new)
- `POST /api/plan` builds an UNSIGNED PancakeSwap V2 BNB->token swap, runs a pre-trade guard (session, price impact, pool depth) and an eth_call simulation. Server holds no key, sends nothing, caps at 0.05 BNB.
- Verified live: calldata simulates OK against mainnet state (0.0001 BNB -> AAPLon, eth_call). Guard correctly BLOCKS the same trade: pool holds ~0.00057 BNB, impact 14.97%.
- JNJon has no WBNB pool on Pancake V2. USDon rejected as unsupported.
- 14/14 tests. Session input is still fixture data.
- Open decision: executable route exists, but these tokens' DEX liquidity is too thin for safe trades. Not retreating; options in report.

## Update (commit 89f88df, 15:15 UTC on the VPS clock): Spend to Own (product name received)
- `POST /api/own` works end to end on live chain data: $100 Apple Store spend -> $2 reward -> 0.00266 BNB (live WBNB/USDT $751) -> AAPLon plan.
- Live result: guard BLOCKED conversion (impact 82.42%, pool 0.00057 BNB), outcome `held`. Honest, correct, and the demo-blocking fact.
- 17/17 tests. Concept mechanics are the agent's interpretation of the name only.
- Next: page UI for the flow; decide liquidity route (W3W swap or deeper-pool token).

## Update (commit 159207d, 15:18 UTC on the VPS clock): first UI
- `/` now renders the Spend to Own form (client component `src/components/own-flow.tsx`) calling `POST /api/own`; shows reward split, guard verdict and live pool facts. Page served and form text confirmed in HTML; NOT yet checked in a real browser.
- Pharmacy (JNJon) returns "no WBNB pool" (honest error, surfaced as alert).
- Liquidity scan: Ondo API 403 twice, V2 factory has 3.4M pairs; stopped per retry rule (see BLOCKERS.md).

## Update (commit 04de6b7, 15:19 UTC on the VPS clock): product definition recorded + wallet step
- Human's definition recorded verbatim in docs/PROJECT.md. Reward rates / conversion mechanic remain agent interpretation.
- UI: "Use my browser wallet address" (eth_requestAccounts) and a "Sign in my wallet" button that exists ONLY when the server returned a tx (guard passed + simulation OK), requires an explicit confirm checkbox, and sends via the user's own wallet (eth_sendTransaction on chain 56). The server holds no key.
- Today the guard blocks every conversion, so the sign button never appears in practice. The sign path is UNTESTED in a browser and has sent nothing.
- 17/17 tests, build passes.

## Update (commit d233bc8, 15:22 UTC on the VPS clock): journey step 1, $100 Starbucks purchase
- Starbucks added (3% placeholder rate, SBUXx). $100 purchase -> $3 reward -> 0.0039928 BNB equivalent (live WBNB/USDT). Verified via /api/own.
- SBUXx has NO Pancake V2 pool, so API returns outcome `no_route` with the reward intact and a plain explanation; UI shows an amber panel. Apple still `held` (thin pool).
- Page default merchant is now Starbucks. 18/18 tests. Still no transaction, no browser check, session data fixture.

## Update (commit f8aba44, 15:24 UTC on the VPS clock): journey step 2, company identification
- `src/lib/company.ts`: raw merchant string -> public company/ticker. Whole-word alias matching on a HAND-CURATED table (4 companies); no fuzzy guessing; ambiguous and unknown inputs are reported, not guessed. Not backed by a card network or market-data vendor.
- `/api/own` now takes `merchant` (free text) and returns `identification` + outcome (`identified` path continues; `unidentified`/`no_token` stop with nothing calculated or sent).
- Verified live: "STARBUCKS #4411 SEATTLE WA" and "Sq *Starbucks" -> SBUX; "WHOLE FOODS MKT" -> AMZN (public, no token); unknown diner -> not_found; "APPLE AMAZON MARKETPLACE" -> ambiguous.
- UI: free-text merchant field + "Identified company" panel. 25/25 tests. Not browser-checked. Conversion still `no_route` for SBUXx.

## Update (commit 08486d5, 15:26 UTC on the VPS clock): journey step 3, own-funds investment
- `computeInvestment(spend, investBps=500)`: $100 -> $5 own funds, tested (27/27). Reward ($3 Starbucks, placeholder) is now display-only, NOT converted. `/api/own` takes `investBps` (0.01-20%); sizes the swap from the $5 using live WBNB/USDT ($751.41 -> 0.00665416 BNB).
- Live: Starbucks -> `no_route` (no Pancake pool for SBUXx); Apple -> `held` (impact 92%, pool 0.00057 BNB). Nothing sent; own funds untouched.
- UI field: "Invest from my own funds (% of purchase)" defaulting to 5 with a live dollar readout. Not browser-checked.

## Update (commit ff2c57b, 15:29 UTC on the VPS clock): journey step 4, real instrument discovery (BIG UNBLOCK)
- Found Binance's PUBLIC, keyless RWA endpoints (binance/binance-skills-hub, binance-tokenized-securities-info). No API key needed for: token list (1,366 entries, 458 on BSC), per-asset trading status, market status.
- `src/lib/instruments.ts`: `findInstrument(ticker)` -> `supported` only if listed on BSC AND on-chain `symbol()` matches; else `not_listed`/`unavailable`. `fetchAssetStatus` = LIVE session/halt status (replaces fixtures in the flow; unreachable => not tradable).
- Correct Starbucks instrument is **SBUXon 0x94d7...490D** (Ondo, listed by Binance, symbol verified on-chain), NOT the earlier SBUXx from a search result. SBUXx removed from use by the flow.
- Live results ($100 purchase, $5 own funds): Starbucks -> SBUXon, market CLOSED (weekend), no PancakeSwap V2 pool -> `no_route`. Apple -> AAPLon TRADING but pool 0.00057 BNB -> `held`. **Amazon -> AMZNon, pool 4.36 BNB, impact 0.15%, live status TRADING, eth_call simulation OK -> `ready_to_sign`** (first full pass of guard+simulation). Nothing was sent.
- 33/33 tests, build passes. W3W keyed API still unused/unverified; the public endpoints are not the signed W3W API.
- Starbucks still blocked: no PancakeSwap liquidity for SBUXon; need another venue (e.g. Ondo/Binance route).

## Update (commit 8d58b18, 15:31 UTC on the VPS clock): journey step 5, live market info + executable quote
- `src/lib/marketdata.ts`: live market info from Binance Web3 PUBLIC RWA "dynamic" endpoint (no key): token price, US stock price (null off-hours), 24h change, 52w range, P/E, holders, order limits. Parser is pure and tested (37/37 tests).
- Executable quote in `/api/own` -> `quote.dex`: PancakeSwap V2 on-chain quote + eth_call simulation, plus `vsReferenceBps` (our DEX output vs Binance reference price).
- Live: AMZNon $5 -> 0.018999 tokens (min 0.018809), simulation OK, 30 bps worse than Binance reference (consistent with 0.25% pool fee + 0.15% impact). SBUXon: market data returned ($92.42 token / $90.80 stock, -2.02%), but no DEX quote (no pool).
- **Binance's own swap quote (`baw market-order quote`) is NOT available.** Installed @binance/agentic-wallet 1.10.0 in /tmp (not in repo); quote returned `NOT_LOGGED_IN` (code 10003000). Sign-in is a human step (pairing code confirmed in the Binance app). Not attempted on your behalf. UI and API state this explicitly (`quote.binance.available=false` + reason).
- Still: no tx sent, page not browser-checked, sign path never run.

## Update (commit edfe76d, 15:35 UTC on the VPS clock): journey step 6, pre-execution checks
- `src/lib/checks.ts` (pure, 43/43 tests): market status, fees, quote validity, wallet funds; `executionEligibility` = every REQUIRED check must pass; `unknown` blocks (never a pass).
- `/api/own` now returns `checks[]` (each with state, detail, source), `fees`, `eligibility`. The unsigned tx is RELEASED ONLY when eligible (server withholds it otherwise). New outcomes: `not_eligible`, and `no_route` now carries a failed `route` check.
- Fees: PancakeSwap 0.25% pool fee (protocol constant) + gas from live `estimateGas` x `gasPrice`. **Binance Web3 Wallet trading fees are NOT included** (only applies to the `baw` route; schedule is on a Binance support page I did not read).
- Quote validity: simulation OK + amounts consistent + age <= 120s (our own deadline). Requote required after expiry.
- Live: Amazon $5 from a funded address -> all 5 PASS, eligible, fee $0.0203 (0.41%). Empty wallet -> `wallet_funds` FAIL, tx withheld. Starbucks -> market closed + no route. Apple -> guard + simulation FAIL.
- Caveat: eligibility is evaluated at quote time; it does not re-check at signing. Not browser-checked; no tx sent.

## Update (commit 6248e53, 15:38 UTC on the VPS clock): journey step 7, review and authorize
- `src/lib/review.ts` `verifyAndDescribe`: decodes the swap calldata itself and checks chain 56, router address, value, minOut, path (WBNB -> selected token), recipient == user, deadline window. 45/45 tests incl. 9 tamper cases (wrong recipient/minOut/path/router/value/deadline/selector/chain).
- Server withholds the unsigned tx unless eligible AND the review verifies (`review`, `reviewProblems` in `/api/own`).
- UI "Review before you authorize" panel built from the decoded calldata: BNB sent, minimum tokens, recipient, token contract, router, fees, expiry, calldata fingerprint. Two explicit checkboxes, then "Authorize in my wallet". `sign()` refuses if the quote is >100s old (client-side check at the moment of authorization). Shows BscScan link after submission, labeled "submitted, not yet confirmed".
- Live: Amazon $5 -> review shows 0.00665368 BNB -> min 0.018808 AMZNon -> recipient = user; digest 0x6174590262be57b5; matches quote. Empty wallet -> no review, no tx.
- NOT done: browser rendering check, an actual wallet signing run, receipt/confirmation tracking after submit. No tx sent.

## Update (commit 884c6db, 15:41 UTC on the VPS clock): journey step 8, settlement verification (execution NOT performed)
- `src/lib/settle.ts` `verifySettlement(hash, expected)` (read-only): states `not_found | pending | reverted | mismatch | settled`. `settled` requires mined + status success + sent to the V2 router + decoded calldata matches the AUTHORIZED value/minOut/path/recipient + token Transfer logs credit the recipient >= minOut. `isFinal` needs >= 3 confirmations. 50/50 tests (11 new, fake client).
- Validated against a REAL historical mainnet swap (tx 0xaee572a2...dd03, block 126853293, some other user's AMZN-unrelated token swap, found by scanning blocks via publicnode): correct expectations -> `settled` (received 1816.795 vs min 1762.291, 74 confirmations); wrong recipient -> mismatch; higher minOut -> mismatch; unknown hash -> not_found.
- `POST /api/settle` (read-only) + UI "Verify settlement on-chain" after submission; UI says "submitted is not the same as settled".
- **No Stockup swap has been executed.** The verifier has never seen a Stockup transaction. Execution still needs: your explicit approval, a funded wallet, a cap. Public BSC RPC bans getLogs (see BLOCKERS.md); publicnode.com works for block/tx reads.

## Update (commit d3342c2, 15:44 UTC on the VPS clock): journey step 9, ownership receipt (no Stockup receipt exists yet)
- `src/lib/receipt.ts` `issueReceipt`: a receipt is issued ONLY for a `settled` + final (>=3 confirmations) swap whose token is on Binance's BSC tokenized-stock list with matching on-chain symbol. Ticker and shares multiplier come from the LIST, never from the client. Receipt separates "Verified on-chain" (holder, token, tx, block, received, gas, live balance) from "Recorded by Stockup (not on-chain)", gives BscScan links (tx/token/holding), "check it yourself" steps and honest limits (Ondo exposure != direct share ownership; not tax/advice). Deterministic id SU-<hash>.
- `POST /api/receipt` re-verifies settlement from the chain on every call. UI: "Get ownership receipt" button after submission.
- BUG CAUGHT LIVE: first run issued a receipt for an unrelated meme-token swap (real mainnet tx 0xaee5...dd03) because nothing checked the token was a tokenized stock. Fixed: refuses unless listed; test added. 56/56 tests.
- No receipt has been issued for a Stockup trade, because no Stockup trade has executed. The only live receipt run used someone else's transaction, before the fix, purely to test the pipeline.
- Not browser-checked. Receipt is a web view only (no PDF/export/persistence; nothing stored server-side).

## Update (commit 7ea1836, 15:47 UTC on the VPS clock): merchant/stock selection by verified route (full-list liquidity scan)
- `scripts/scan-liquidity.ts` (read-only): all 458 BSC tokens on Binance's Ondo list x PancakeSwap V2 pairs vs WBNB/USDT/USDC via multicall. Only **48 pools exist; 7 hold >= $5k**: FXIon $25.2k, BILIon $10.5k, PDDon $10.4k, SGOVon $9.0k, TLTon $8.7k, AMZNon $6.6k, DISon $5.1k. Everything else is < $120 (AAPLon $2, NVDAon $3, MSFTon $2, JPMon $4, GOOGLon $3). Starbucks (SBUXon): no pool at all.
- Live Binance status at scan time (weekend): **only AMZNon is open (offhours/TRADING)**; the other six liquid tokens are MARKET_CLOSED until Monday.
- Issuer evidence: all checked tokens (DISon, AMZNon, AAPLon, PDDon) share byte-identical 824-byte bytecode (hash 0x439923c8...), i.e. one Ondo proxy template; names read "<Company> (Ondo Tokenized)"; Binance's RWA meta endpoint lists DISon with company info and attestation report links. This is evidence of consistency and Binance listing, NOT a cryptographic proof of issuer identity.
- **Selected: Amazon / AMZNon** for any real run now (only open + liquid + guard-passing + simulation-OK). **Fallback: Disney / DISon** (pool 3.37 BNB, impact 0.19%, but market closed until Monday; flow correctly returns not eligible). Added Disney merchant aliases (DISNEY+, WALT DISNEY WORLD, DISNEYLAND) + tests; 57/57.
- Small fix: quote_validity is now `unknown` (not a misleading `fail`) when the simulation was skipped because an earlier check blocked.
- Starbucks remains unsupported on BSC (no pool; market closed). No tx sent.

## Update (commit 6e0accc, 15:49 UTC on the VPS clock): binding product rules enforced
- Human rules: (1) purchase = manually entered/simulated spending event; (2) investment is USER-FUNDED, NOT merchant cashback; (3) never claim a trade succeeded unless settlement was independently verified.
- Removed the entire reward/cashback concept from code, API, UI, receipt and docs (`computeReward*`, `rewardBps`, `calc`, `rewardUsd`). `/api/own` no longer returns any reward field (verified: the word does not appear in the response).
- Wording: page banner and form labels say the amount/merchant are typed in by you and Stockup sees no real purchases; submitted-to-network is labeled "not confirmed"; receipt note says the spending event is manual and there is no cashback.
- `test/claims.test.ts` (58/58 total): scans src for cashback/reward/earn language (negations allowed), bans unconditional success phrases in the UI, and asserts receipts are refused for pending/not_found/reverted/mismatch.
- Still no Stockup trade executed. Settlement verification + receipt remain the ONLY paths to a success claim.

## Update (commit 74a9cd3, 15:53 UTC on the VPS clock): shopping receipt -> investment journey
- Product line from human: "Stockup converts a familiar shopping receipt into an investment journey."
- `src/lib/receipttext.ts` `parseReceiptText`: reads PASTED receipt text locally (no OCR, no network): merchant = known-company line else first plausible header; amount = TOTAL / AMOUNT DUE / BALANCE DUE (ignores subtotal/tax/tip); warns on conflicting totals, no TOTAL line, non-USD currency (no conversion), empty, out-of-range. 64 -> 66 tests with claims tests.
- UI step "1. Paste a shopping receipt" + "Use a sample" + "Read receipt" -> fills merchant/amount -> user must confirm ("2. Confirm the spending event"). Copy says Stockup cannot verify the receipt is real.
- Live: sample Amazon receipt -> $100 -> AMZNon -> ready_to_sign. A pasted $9,999.99 total hits the 0.05 BNB per-trade cap and returns new outcome `over_limit` (was mislabeled `no_route`); check label "Per-trade limit".
- Prompt-injection text inside a receipt is just data: the parser only extracts merchant/amount; nothing in receipt text reaches a command, URL or contract.
- NOT built: image/PDF/photo OCR (text paste only), email-receipt import, proof a receipt is genuine. Not browser-checked. No tx sent.
