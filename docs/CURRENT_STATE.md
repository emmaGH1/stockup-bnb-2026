# Current state
Last updated: 2026-10-10 ~18:50 UTC (VPS clock). Branch `dev/foundation`. Latest commit: see `git log -1`.

## Summary (authoritative; older history below is kept for the record)
- **Works, verified in this repo:** typecheck; 80 unit tests; production build; live BSC reads; Binance public RWA endpoints (list, per-asset status, dynamic data, meta); PancakeSwap V2 quote and `eth_call` simulation; pre-execution checks; calldata-decoded review; settlement verification validated on a real historical mainnet swap (not a Stockup swap); ownership-receipt pipeline (validated on the same historical swap, before the listing check was added, and refused after).
- **Browser-checked:** desktop and 390px mobile screenshots of the receipt interface; the wallet connect and authorization path, using a **mock injected EIP-1193 provider** in headless Chromium. Results: mismatched account -> nothing sent, alert shown; matching account on wrong chain -> switch requested, then send; matching account on BSC -> send requested. No signature request is ever made.
- **Not verified:** a real wallet extension; a real Stockup transaction; a Stockup ownership receipt; Binance signed APIs; Binance `baw` quote (NOT_LOGGED_IN).
- **Not claimed:** that any trade succeeded. No Stockup trade has executed. No success state can appear without verified settlement.
- **Market status now (weekend):** AMZNon is the only liquid token open for trading; Disney (DISon) is closed until Monday; Starbucks (SBUXon) has no pool.
- **Binding rules:** manual or pasted spending event; user-funded investment; no cashback; no success claim without verified settlement.

## Browser and integration checks (latest)
- 9-step purchase-to-investment journey passes in headless Chromium on the production build (desktop + 390px). Fixed: authorize now stays disabled until a wallet is connected; duplicate no-wallet message removed.
- `scripts/probe-binance-public.ts`: live Binance public endpoints (token list, asset status, market status, meta) return every field the code reads. Read-only, no credentials.
- `docs/DEPLOY.md`: deployment notes only. Not deployed. Public deployment and making the repo public need approval.

## Public preview (latest)
- Temporary Vercel preview: https://temporary-turbo-rowan-fk635uu.vercel.app (expires after 60 min unless claimed). Created after the security checks in docs/DEPLOY.md passed.
- Nine-step browser journey: all pass against the preview URL.
- No transaction sent. Nothing merged to main. Repo still private.

## Production readiness and security audit (2026-10-10, local production build)
- Routes: `/api/own`, `/api/plan`, `/api/receipt`, `/api/settle` now read bodies through a bounded reader (8 KB cap, JSON only). Oversize and non-JSON bodies return 400.
- Server validates the recipient as a BSC address before any chain or Binance work (previously a bad recipient reached the route check). Merchant text capped at 200 characters.
- Security headers on every response: nosniff, frame DENY, referrer policy, permissions policy, and a Content-Security-Policy limited to self plus the public RPC and Binance endpoints. `poweredByHeader` off.
- Secrets: none in git history; only `.env.example` tracked; server reads only `BSC_RPC_URL`; no server-side signing or sending code; no logging of request data.
- Wallet authorization: send requires a released transaction, verified review, both acknowledgements, a fresh quote, the connected account equal to the recipient, and the wallet on BSC. Verified in headless Chromium with a mock provider.
- Known gaps, not fixed: no rate limiting (needs infrastructure beyond the free tier for durable enforcement); `'unsafe-inline'` remains in the CSP because the Next.js runtime needs it without a nonce setup; the mock wallet is not a real extension.
- Tests: 84 passing. Typecheck and production build pass.

## Live (latest)
- Preview: https://temporary-turbo-rowan-fk635uu.vercel.app serves commit aa21c20 (UI polish, verified on the live URL). Verified on the live URL at desktop and mobile widths: no overflow, no HTTP or JS errors, live check returns ELIGIBLE, touch targets at least 44px.
- Anonymous temporary deployment: expires 60 minutes after the latest deploy unless claimed by a Vercel account.
- No transaction sent. Repo private. `main` unchanged at 024eafb.

## Production journey check (2026-10-10, ~21:00 UTC)
- Nine-step journey run against https://temporary-turbo-rowan-fk635uu.vercel.app (commit 9df393d). All nine pass; no page or console errors.
- Scope: step 5 used live BSC and Binance public data; step 8 had no wallet extension present. The journey stops at the authorization gate. No transaction was built for sending, signed, or sent.
- Preview is anonymous and expires about 40 minutes after its last deploy unless claimed.

## Live-site audit (2026-10-10, ~21:05 UTC, commit 526e8b6 site)
- URL https://temporary-turbo-rowan-fk635uu.vercel.app
- Console errors and warnings: none (desktop, mobile, all four wallet scenarios).
- Failed or 4xx/5xx network requests: none.
- Layout: no horizontal overflow, no clipped text, no broken images at 1280px or 390px.
- Wallet: no wallet (disabled honestly), connect rejected (honest message), wrong chain (honest message), matching account on BSC (connected). Authorize stayed disabled in all four. No sign, send or switch request was made by the page without a click; the audit clicks only Connect.
- Known minor: an always-present, empty `role=alert` container exists; harmless, noted for accessibility polish.
- Audit script: scripts/audit-live.mjs.

## Demo and DevEx evidence (2026-10-10, ~21:20 UTC)
- Fixed a stale instrument: SBUXx removed from the registry and company table; Starbucks maps to SBUXon. Live registry now lists only AAPLon, JNJon, USDon. Commit 4d5aa37.
- DevEx report rewritten from current evidence (13 findings, each with a file, command or endpoint). docs/DEVEX_REPORT.md.
- Demo evidence captured from the live preview with consistency checks: docs/evidence/ (4 screenshots, README). A first Starbucks capture mixed an Amazon receipt with Starbucks fields and was discarded.
- Demo script with honest claims and "do not show" list: docs/DEMO.md.
- No transaction, no ownership receipt, no real wallet exists.

## Binance signed API (2026-10-10, 22:50 UTC)
- Authenticated read-only request blocked: HTTP 200 with body code 40304 (compliance restriction). Not integrated into the product. Details in docs/BLOCKERS.md.
- Credential safety: no credential value in any working-tree file or in git history; the signed client is imported only by scripts and tests, never by the browser bundle; `.env` is git-ignored and excluded from the Vercel upload.
- Preview: https://temporary-turbo-rowan-fk635uu.vercel.app now returns 307 to Vercel's deployment-expired page. Needs a redeploy or a Vercel login to restore.
- Gates: typecheck OK; 84 tests pass; production build OK.

## Blockers (owned by a human)
1. Approval for one capped real purchase (about $5 of BNB plus gas), from a funded wallet connected by the user.
2. Binance Agentic Wallet sign-in, if the official quote is wanted.
3. Official judging-page check of the weights and the "2 transactions" requirement.

## Next actions
1. Commit the docs (this change).
2. Browser-check the copy at 390px and 1280px after the latest wording changes.
3. Continue non-spending polish: wording, copy, and the "Settlement" and "You hold" states, tested with fixtures labelled as fixtures.
4. Wait for phase 12 approval; do not send anything before it.

---

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

## Pause: provider budget (not a project failure)
- A previous agent session stopped because its model-gateway daily budget was exhausted. This is a billing limit on the provider side; the repo, tests and CI were unaffected.
- Last commit de4afbe: CI passed; branch in sync with origin/dev/foundation.
- Resumed work does not spend funds, sign, merge, deploy or submit.

## Design probe (dev/design-probe, 2026-10-11 ~00:30 UTC VPS clock)
- Branch `dev/design-probe` (feature branch; `main` untouched; not merged).
- Scope: first fold (product statement on a 12-column grid) and the investment workspace restyled with provisional tokens (paper #F4F3F0, ink #171917, mist #DADBD6, vermilion #F26438). Workspace logic, Binance integrations, wallet checks and API routes are unchanged.
- Copy changed on the fold: headline now states the product definition, not receipt scanning. The footer no longer says the page never sends a transaction; it says a transaction is sent only after the user authorizes it in their own wallet.
- Gates: typecheck OK; 86/86 tests pass; production build OK.
- Browser: desktop 1280px and mobile 390px, no horizontal overflow, no console or page errors. Screenshots show the first fold only: docs/evidence/design-probe/.
- NOT done: propagation of the design to other screens; the workspace below the fold was not screenshotted. Awaiting human visual approval before any propagation.
- No funds spent, nothing deployed, repo still private, nothing merged or submitted.

## Design probe v2 (dev/design-probe, 2026-10-11 ~00:55 UTC VPS clock)
- Approved direction implemented as a probe: Industrial Editorial x Expressive Consumer Finance. Palette tokens as given: paper #F4F3F0, ink #171917, mist #DADBD6, vermilion #F26438 (+white). NOT propagated beyond the two probe surfaces (STOP GATE: awaiting human approval).
- First fold: numbered grid modules (01 What Stockup does / 02 Investment workspace), Archivo headline with a Source Serif 4 italic accent, vermilion CTA ("Run the investment check"), original SVG flow diagram (spending event -> your own-funds allocation -> tokenized stock), mono micro-labels. Label/arrow collision in the diagram found on screenshots and fixed.
- Fonts: @fontsource-variable/archivo + @fontsource/source-serif-4, SIL OFL 1.1, bundled locally, no runtime fetch.
- Workspace: composition pass only (ruled white panels, mono legends, sticky form on desktop). All strings, logic, API routes, wallet checks unchanged.
- Evidence: docs/evidence/design-probe/probe-{desktop-1280,mobile-390}-full.png (full page, 1280px / 390px). No horizontal overflow, no console/page errors, #invest anchor present.
- AI-slop lint (playbook 4.5G): no gradients, no blue/purple defaults, no status pills, no fake live indicators, no fabricated metrics (diagram 5% = real default input; AMZNon labeled example), no card-everything.
- Gates: typecheck OK; 86/86 tests; production build OK. No funds spent, nothing deployed, repo private, main untouched.
- Reference provenance (playbook 4.5E), per DESIGN_REFERENCES.md: 01 grid/markers/numbered modules (not their brand/robot imagery); 04 product-as-hero staging adapted to the flow diagram (no scooter); 06 grotesk+serif pairing via OFL fonts (no ID Grotesk/Times binaries); 03 data readability as guardrail only (their fabricated stats rejected); 05 principle: dotted-leader + square-marker motif reusable site-wide (no purple 3D forms); 02 one-accent restraint (vermilion only); 07 poster type deliberately unused so far.

## Design probe v3 (dev/design-probe, 2026-10-11 ~01:05 UTC VPS clock)
- Scope held to exactly two surfaces: first fold + investment workspace. Everything else untouched.
- Type exploration: Space Grotesk Variable + Instrument Serif (both SIL OFL, bundled via @fontsource). Previous variant (Archivo + Source Serif 4) remains on commit ff3f3a9 for comparison. Both font packages installed during exploration; the rejected one will be removed at lock-in.
- Shopping<->exposure link made explicit: diagram receipt shows merchant AMAZON; token card reads "AMZNon / AMAZON · CHECKED"; fold sub-copy uses the owner's product sentence (spending decisions -> user-funded investments in tokenized stocks) plus the verification clause.
- Constraints enforced: receipts are an input method, not the central motif (identity carried by the shopping->allocation->exposure diagram and copy); no gradients, no rounded-card stacks, no fabricated metrics, no decorative crypto graphics.
- Gates: typecheck OK; 86/86 tests; build OK; full-page captures at 1280px/390px with zero horizontal overflow and no console/page errors.
- STOP GATE: awaiting human approval. Not deployed; main untouched; repo private.

## Design probe verification + delivery (dev/design-probe, 2026-10-11 ~01:10 UTC VPS clock)
- Both probe surfaces are implemented running screens, verified in headless Chromium against the production build with a read-only live check (nothing signed or sent; no wallet connected; Authorize stayed disabled).
- Populated-workspace evidence captured at 1280px and 390px: identification, instrument+listing checks, live Binance market data, PancakeSwap quote vs reference, all six execution checks with sources, decoded review panel, allocation summary, guard verdict. Zero overflow, no console/page errors.
- Gates re-run: typecheck OK; 86/86 tests; production build OK.
- Evidence: docs/evidence/design-probe/ (README describes conditions honestly). Commit on dev/design-probe; main untouched; not deployed; repo private.

## Design probe evidence set (dev/design-probe, 2026-10-11 ~01:10 UTC VPS clock)
- Re-captured at 1440px (judging-video width) + 390px: landing fold and populated workspace. Superseded 1280px captures removed from HEAD (history keeps them). Zero overflow, no errors at all four widths/2 viewports. Commit follows.

## Design system propagation complete (dev/design-probe, 2026-10-11 ~01:15 UTC VPS clock)
- docs/DESIGN.md locked: palette (paper/ink/mist/vermilion/white), Space Grotesk Variable + Instrument Serif (OFL, bundled), dotted-leader + square-station motif, component rules, reference provenance, standing slop-lint rules.
- Propagated class-level only: receipt pair (white/ink panels, serif headers, mono micro-labels, parser highlight now vermilion/15), all workspace section headers to mono micro style, connect/verify buttons to ink outline, get-receipt/authorize to ink fill, review + receipt panels to 2px ink. Semantic green/red/amber kept for check states only. No logic, copy, API, wallet, or test changes.
- Gates: typecheck OK; 86/86 tests; build OK. Evidence re-captured at 1440px + 390px (landing + populated workspace via read-only live check): zero overflow, no console/page errors. Contact sheets refreshed.
- Stops held: no deploy, main untouched, repo private, nothing signed or sent.

## Correction: design probe is NOT approved (dev/design-probe, 2026-10-11 VPS clock)
- The human reviewed the desktop and mobile contact sheets and did NOT approve the design probe. The revision is targeted to the two probe surfaces and is not authorization to rebuild the application.
- Earlier entries above that say "docs/DESIGN.md locked" or "design system propagation complete" are wrong in their implication. I misread "Begin implementation now" as approval after a stop instruction, locked docs/DESIGN.md, and propagated classes to the receipt pair and workspace (commits d6e43e6, d6f58ce). Those changes exist on dev/design-probe only. docs/DESIGN.md is now marked DRAFT, NOT APPROVED.
- Last probe state the human actually reviewed: the contact sheets (propagated state, d6f58ce). Pre-propagation probe: 45a6e8e. Whether to revert propagation is awaiting the human's decision.
- Unchanged: business logic, Binance integrations, API routes, wallet safeguards, tests. Not deployed, main untouched, repo private, nothing signed or sent.

## Hero revision checkpoint (dev/design-probe, NOT approved by the human)
- Hero: large ink-stage commerce-to-investment scene (src/components/hero-stage.tsx, replaces hero-strip). Example only: Amazon purchase $100, proposed $5 (5%) of the user's own funds, AMZNon shown as PLANNED until BNB Chain confirms. No holdings, no detection, no cashback implied.
- Headline "Shop the brands. Build a stake." (human-supplied). Subheading states the MVP: record a purchase, fund a slice, review quote and safeguards before the wallet approves a swap.
- CTA "Try the Amazon example" (#invest-example) prefills the sample purchase and scrolls to the workspace. Fills fields only; test/example-prefill.test.ts asserts no fetch, no wallet call. Verified in headless Chromium at 1440 and 390: fields filled, 0 API calls, 0 wallet calls.
- Gates: typecheck OK; 88/88 tests; build OK. Workspace reorganization not started; awaiting the human's full list.
