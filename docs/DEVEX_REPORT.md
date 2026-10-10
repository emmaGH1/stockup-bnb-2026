# Developer Experience log (feeds 25% criterion)
- 2026-10-10: BSC public RPC reachable, no auth. W3W API needs HMAC keys (X-OC-* headers) - key acquisition path: TBD.
- Signature scheme (timestamp+METHOD+path incl. /build+body, HMAC-SHA256, base64) taken from a search summary; docs pitfall: omitting /build prefix -> 40102. Unverified live (no keys).
- Unauthenticated POST to W3W returns 401.
- Search-grounded address lookups returned truncated/invalid addresses (e.g. 0xcac2bf017ebde4444) and two full-length ones that did not resolve as ERC-20 on BSC (CRCLon, NVDAB). Always verify symbol()/decimals() on-chain before use. 3 of 5 full candidates verified.
- Fixture-first development needed because response schemas for tokenized-securities status aren't discoverable without credentials; public docs summary gave request signing but no verified response shape.
