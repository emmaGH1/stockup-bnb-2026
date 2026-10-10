# Developer Experience Report: Binance Web3 / BNB Chain tokenized stocks
Status: agent-written from direct experience in this repo, 2026-10-10. Verifiable: each finding names the file, command or endpoint that shows it. Mark-ups for the human to review before submission.

## Summary
Building a tokenized-stock product on Binance's stack is possible without credentials for market data, but the executable path is gated. Discovery took the most effort. The public endpoints we needed were found only in a skills repository, not in the main docs we searched first.

## Findings
| # | Area | Finding | Evidence | Severity |
|---|---|---|---|---|
| 1 | Discovery | The keyless RWA endpoints (token list, per-asset status, dynamic data, meta) live in `binance/binance-skills-hub` (`binance-tokenized-securities-info/SKILL.md`), not in the docs we searched first. Finding them removed the need for guessed addresses. | `src/lib/instruments.ts`, `scripts/probe-binance-public.ts` | High (positive) |
| 2 | Discovery | Web search summaries returned a wrong Starbucks token (SBUXx, from a third-party page). The official list names SBUXon. Our first version of the product used the wrong token until the list was checked. Fixed in commit 4d5aa37. | `docs/CURRENT_STATE.md`; `git show 4d5aa37` | High |
| 3 | Discovery | Of 458 BSC tokens on the Ondo list, only 48 have PancakeSwap V2 pools and 7 hold at least $5k. Liquidity varies widely; several listed tokens have no pool at all. | `scripts/scan-liquidity.ts` | High |
| 4 | Auth | Binance Web3 signed REST requests need HMAC keys (X-OC-* headers). Unauthenticated calls return HTTP 401 with code 40101. We could not test a signed call without keys. | `curl` probe, 2026-10-10 | High |
| 5 | Auth | The signing format we implemented (timestamp + METHOD + path incl. `/build` + body, HMAC-SHA256, base64) came from a search summary, not a verified spec. Unit-tested against our own copy of the formula only. | `src/lib/w3w.ts` | Medium |
| 6 | Quote API | The executable quote (`baw market-order quote`) requires an interactive Binance App sign-in. Without it the CLI returns `NOT_LOGGED_IN` (code 10003000). A server or CI cannot obtain an executable Binance quote without a human pairing step. | `docs` run in `/tmp/baw`, 2026-10-10 | High |
| 7 | Data | The dynamic endpoint returns `stockInfo.price` as null outside trading hours for some tickers (e.g. AAPL) and as a value for others (AMZN). `volume24h` is documented as US-stock volume, not on-chain volume. | live responses | Low |
| 8 | Docs | The live list response includes `assetType`, `d` and `lastUpdateTime`, and market status includes an `offhours` object. None are in the skill doc's response tables. | live responses vs. SKILL.md | Low |
| 9 | Schema | Field schemas were consistent with the skill doc for the four endpoints we use. Our probe checks those fields on every run. | `scripts/probe-binance-public.ts` (4/4 pass) | Positive |
| 10 | Fees | Binance Web3 Wallet trading fees are not shown in any endpoint we read; we could not include them in the fee estimate. | `src/lib/checks.ts` | Medium |
| 11 | Ownership | Token ≠ share: each token represents a multiplier of underlying shares (1.0 for most, higher after splits). The list supplies the multiplier; we use it for shares-approx in receipts. | `src/lib/receipt.ts` | Positive |
| 12 | Issuer | Verifying issuer authenticity is hard from chain data alone. Identical 824-byte bytecode across Amazon, Apple, Disney and PDD tokens shows one template, not one issuer. We rely on Binance's listing. | `docs/CURRENT_STATE.md` | Medium |
| 13 | Price | DEX spot on V2 pools for these tokens is unusable at scale (AAPLon pool ~$2). An official price source is needed for a credible quote. | `docs/BLOCKERS.md` | High |

## What this means for Binance
- Keyless discovery and market-status endpoints are a strong developer experience once found. Documenting them in the main API docs would remove the discovery detour (finding 1).
- The executable quote is the largest gap for builders: an agent or a server cannot get a Binance quote without a human sign-in (finding 6).
- A published response schema for the signed W3W API would let us verify our signing rather than trust a summary (finding 5).
