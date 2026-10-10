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

## Update 15:30 UTC: guarded swap planner (new)
- `POST /api/plan` builds an UNSIGNED PancakeSwap V2 BNB->token swap, runs a pre-trade guard (session, price impact, pool depth) and an eth_call simulation. Server holds no key, sends nothing, caps at 0.05 BNB.
- Verified live: calldata simulates OK against mainnet state (0.0001 BNB -> AAPLon, eth_call). Guard correctly BLOCKS the same trade: pool holds ~0.00057 BNB, impact 14.97%.
- JNJon has no WBNB pool on Pancake V2. USDon rejected as unsupported.
- 14/14 tests. Session input is still fixture data.
- Open decision: executable route exists, but these tokens' DEX liquidity is too thin for safe trades. Not retreating; options in report.

## Update 15:45 UTC: Spend to Own (product name received)
- `POST /api/own` works end to end on live chain data: $100 Apple Store spend -> $2 reward -> 0.00266 BNB (live WBNB/USDT $751) -> AAPLon plan.
- Live result: guard BLOCKED conversion (impact 82.42%, pool 0.00057 BNB), outcome `held_reward`. Honest, correct, and the demo-blocking fact.
- 17/17 tests. Concept mechanics are the agent's interpretation of the name only.
- Next: page UI for the flow; decide liquidity route (W3W swap or deeper-pool token).

## Update ~15:35 UTC: first UI
- `/` now renders the Spend to Own form (client component `src/components/own-flow.tsx`) calling `POST /api/own`; shows reward split, guard verdict and live pool facts. Page served and form text confirmed in HTML; NOT yet checked in a real browser.
- Pharmacy (JNJon) returns "no WBNB pool" (honest error, surfaced as alert).
- Liquidity scan: Ondo API 403 twice, V2 factory has 3.4M pairs; stopped per retry rule (see BLOCKERS.md).

## Update ~15:45 UTC: product definition recorded + wallet step
- Human's definition recorded verbatim in docs/PROJECT.md. Reward rates / conversion mechanic remain agent interpretation.
- UI: "Use my browser wallet address" (eth_requestAccounts) and a "Sign in my wallet" button that exists ONLY when the server returned a tx (guard passed + simulation OK), requires an explicit confirm checkbox, and sends via the user's own wallet (eth_sendTransaction on chain 56). The server holds no key.
- Today the guard blocks every conversion, so the sign button never appears in practice. The sign path is UNTESTED in a browser and has sent nothing.
- 17/17 tests, build passes.

## Update ~16:05 UTC: journey step 1, $100 Starbucks purchase
- Starbucks added (3% placeholder rate, SBUXx). $100 purchase -> $3 reward -> 0.0039928 BNB equivalent (live WBNB/USDT). Verified via /api/own.
- SBUXx has NO Pancake V2 pool, so API returns outcome `no_route` with the reward intact and a plain explanation; UI shows an amber panel. Apple still `held_reward` (thin pool).
- Page default merchant is now Starbucks. 18/18 tests. Still no transaction, no browser check, session data fixture.

## Update ~16:25 UTC: journey step 2, company identification
- `src/lib/company.ts`: raw merchant string -> public company/ticker. Whole-word alias matching on a HAND-CURATED table (4 companies); no fuzzy guessing; ambiguous and unknown inputs are reported, not guessed. Not backed by a card network or market-data vendor.
- `/api/own` now takes `merchant` (free text) and returns `identification` + outcome (`identified` path continues; `unidentified`/`no_token` stop with nothing calculated or sent).
- Verified live: "STARBUCKS #4411 SEATTLE WA" and "Sq *Starbucks" -> SBUX; "WHOLE FOODS MKT" -> AMZN (public, no token); unknown diner -> not_found; "APPLE AMAZON MARKETPLACE" -> ambiguous.
- UI: free-text merchant field + "Identified company" panel. 25/25 tests. Not browser-checked. Conversion still `no_route` for SBUXx.
