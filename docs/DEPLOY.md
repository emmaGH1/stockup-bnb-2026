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
