# Deployment preparation (NOT a deployment)

Status: **not deployed**. Public deployment needs the human's explicit approval (AGENTS.md gate).

## What is ready
- Production build: `npm run build` passes; `npm start` serves on `PORT` (default 3000).
- Container: `Dockerfile` (node:22-alpine, `npm ci`, `npm run build`, `npm start`). Not built here: Docker is not installed on this VPS.
- CI on GitHub: typecheck, tests, build on every push to `dev/foundation`.

## Environment (set on the host, never committed)
| Variable | Needed? | Notes |
|---|---|---|
| `BSC_RPC_URL` | optional | defaults to `https://bsc-dataseed.binance.org`. Public RPC refuses wide `getLogs`; this app does not use `getLogs` on the request path. |
| `W3W_API_KEY`, `W3W_API_SECRET` | only for the signed W3W API | not used by any current route. |

No secret is required for the current build. Binance public endpoints need no key.

## Before any public URL
1. Human approval to deploy, and to make the repo public if the host needs it.
2. Decide hosting: Vercel (needs an account and a linked repo) or this VPS behind a reverse proxy (needs TLS and a domain).
3. Re-run the nine-step browser journey (`/tmp/shots/journey.mjs` pattern) against the deployed URL.
4. Confirm the page's development banner text is still accurate for the audience.

## Known limits that must appear in any public demo
- Binance trading fees are not included in the fee figure.
- Only AMZNon is open and liquid while markets are closed (weekend). Disney reopens on Monday.
- The wallet path has been tested with a mock provider, not a real extension.
- No Stockup transaction has been sent, so no ownership receipt exists yet.

## Deployed: temporary public preview (2026-10-10, ~20:46 UTC)
- URL: https://temporary-turbo-rowan-fk635uu.vercel.app
- Type: Vercel **anonymous temporary deployment**, no account, no paid plan. It **expires after 60 minutes** unless claimed by an account owner.
- Created with: `vercel deploy --temporary --yes --non-interactive` (Vercel CLI 63.1.2, installed in /tmp, not in the repo).
- Security checks run before deploy: git history scan for keys/tokens/mnemonics (none); tracked env files (only `.env.example`); production dependency audit (0 vulnerabilities); server reads only `BSC_RPC_URL`; no server-side signing or sending code.
- Verification: `/` and `/api/assets` return 200. The nine-step browser journey passes against this URL (see docs/CURRENT_STATE.md).
- Not a permanent production deployment. Making it durable needs a Vercel account claim (`claimUrl` in the deploy output) and the owner's approval.
- No transaction has been sent from this deployment. The app cannot send one: it has no key and only builds unsigned transactions for the user's own wallet.

## Redeployed: commit 7eaa407 (2026-10-10, ~20:55 UTC)
- Same temporary preview URL: https://temporary-turbo-rowan-fk635uu.vercel.app (anonymous; expires 60 min after the most recent deploy unless claimed).
- Verified on the live URL: security headers present; malformed recipient rejected with 400; nine-step journey passes.
- Uploaded files exclude `HANDOFF.md`, `.env*` (except the example), `scripts/`, `test/`, `docs/`, `.github/` (see `.vercelignore`).
- Still not: a permanent production deployment, a claimed account, a custom domain, or a public repo.

## Deployed-site check: desktop and mobile (2026-10-10, ~21:05 UTC)
- URL: https://temporary-turbo-rowan-fk635uu.vercel.app serving commit 9df393d.
- Desktop (1280x900) and mobile (390x844), headless Chromium, live BSC:
  - no horizontal overflow; no HTTP 4xx/5xx; no page or console errors;
  - the live check returns ELIGIBLE on both (about 0.8-1.3 s);
  - touch targets: "Read receipt" and "Use a sample" raised to 44 px minimum; no control under 32 px.
- Known visual gaps for a later polish pass: on mobile the review panel is long and "Authorize" sits far down the page; the two receipts stack with extra space. Not blocking.

## Redeployed: commit aa21c20 (2026-10-10, ~21:15 UTC)
- Same preview URL: https://temporary-turbo-rowan-fk635uu.vercel.app (anonymous; expires after the latest deploy unless claimed).
- Changes: empty alert regions no longer rendered; receipts drop the fixed minimum height on phones; shorter development notice (same obligations); on phones the review panel scrolls into view after a successful check; the wallet hint names the connect control.
- Verified on the live URL: nine-step journey passes; six-section live audit clean (console, network, layout, wallet states).

## Permanent deployment preparation (2026-10-10, 23:50 UTC)
- `vercel.json` sets `"regions": ["iad1"]`: one region, the Vercel default. Vercel's docs state Hobby projects may use a single region, and a larger list fails the build before the build step.
- Not deployed. Permanent deployment needs `vercel login`, which the CLI reports as logged out.
- Repository visibility remains PRIVATE, per the human's instruction. NOTE: the hackathon's published rules (search summary; verify on the official page) require a public repository for submission. Making the repo public needs separate approval.
