# Developer Experience log (feeds 25% criterion)
- 2026-10-10: BSC public RPC reachable, no auth. W3W API needs HMAC keys (X-OC-* headers) - key acquisition path: TBD.
- Signature scheme (timestamp+METHOD+path incl. /build+body, HMAC-SHA256, base64) taken from a search summary; docs pitfall: omitting /build prefix -> 40102. Unverified live (no keys).
- Unauthenticated POST to W3W returns 401.
