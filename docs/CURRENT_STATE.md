# Current state
Last updated: 2026-10-10 ~09:00 UTC (VPS clock). Repo: private emmaGH1/stockup-bnb-2026, branch main.

## Verified (run this session)
- `tsc --noEmit` clean; `vitest` 5/5 pass; `next build` passes.
- Live BSC mainnet (chainId 56) reads via viem.
- `GET /api/assets` returned live on-chain data for AAPLon, JNJon, USDon (all status ok). `GET /api/token?address=zzz` -> 400.
- Asset registry src/lib/assets.ts: only addresses whose on-chain symbol() matched. Issuer authenticity NOT confirmed.

## Unverified / not done
- W3W API: signing scheme from a search summary, never tested live (no keys). Unauthenticated calls return 401.
- Dockerfile/docker-compose untested (docker not installed on VPS). CI workflow not yet observed running on GitHub.
- No product concept/flows, no designed UI, no demo, no on-chain transactions (need approval and funds).

## Blocked on human
Concept + MVP scope; W3W keys in .env on VPS; approval to spend for on-chain txs.

## Next action
If concept arrives: write docs/PROJECT.md and build the core flow. If W3W keys arrive: run live signed call and log DevEx findings. Otherwise: check GitHub Actions result for the latest push.
