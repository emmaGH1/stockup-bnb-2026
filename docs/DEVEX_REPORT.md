# Developer Experience log (feeds 25% criterion)
- 2026-10-10: BSC public RPC reachable, no auth. W3W API needs HMAC keys (X-OC-* headers) - key acquisition path: TBD.
- Signature scheme (timestamp+METHOD+path incl. /build+body, HMAC-SHA256, base64) taken from a search summary; docs pitfall: omitting /build prefix -> 40102. Unverified live (no keys).
- Unauthenticated POST to W3W returns 401.
- Search-grounded address lookups returned truncated/invalid addresses (e.g. 0xcac2bf017ebde4444) and two full-length ones that did not resolve as ERC-20 on BSC (CRCLon, NVDAB). Always verify symbol()/decimals() on-chain before use. 3 of 5 full candidates verified.
- Fixture-first development needed because response schemas for tokenized-securities status aren't discoverable without credentials; public docs summary gave request signing but no verified response shape.
- Tokenized-stock tokens (AAPLon) exist on BSC but PancakeSwap V2/V3 liquidity is dust (~$2-25), so on-chain DEX pricing cannot stand in for a price API. Builders need an official price/oracle endpoint; this is a real finding for the feedback report.

## Structured findings so far (2026-10-10)
| # | Area | Finding | Severity |
|---|---|---|---|
| 1 | Onboarding | Obtaining W3W API key/secret requires the Binance developer portal; no keyless sandbox found, so integration testing is blocked until a human creates a project. | High |
| 2 | Auth | Signing = base64(HMAC-SHA256(timestamp+METHOD+path incl. /build+body)). Omitting `/build` reportedly causes 40102. Unverified live. | Medium |
| 3 | Discovery | No obvious official machine-readable list of tokenized-stock contract addresses; search results gave truncated or non-resolving addresses (3 of 5 full ones verified). | High |
| 4 | Liquidity | AAPLon PancakeSwap pools hold ~$2-25; DEX price is unusable, an official price endpoint is needed. | High |
| 5 | Token behavior | Tokenized stocks are 18-decimal ERC-20s with symbols like AAPLon; market sessions/halts are not visible on-chain, so an off-chain status source is required. | Medium |
| 6 | Docs | Response schemas for tokenized-securities status were not discoverable without credentials. | Medium |
