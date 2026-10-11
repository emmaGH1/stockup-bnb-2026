# Security hardening: proposal (NOT IMPLEMENTED)

Status: **proposal only.** Nothing here is applied. Two changes touch shared files: the CSP lives in `next.config.ts`, and the UI scripts depend on the rendering path. Both need review before any change lands.

Evidence checked on 2026-10-11 against commit `fb2451f`, by building the app and reading the generated HTML.

## 1. Content-Security-Policy: `'unsafe-inline'`

**Current:** `script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'` (`next.config.ts`).

**What the built HTML contains** (`.next/server/app/index.html`, and the other pages):
- Three inline `<script>` blocks. They are Next.js runtime bootstrap, not app code: `globalThis["TURBOPACK"]` chunk registration, `self.__next_f` streaming data, and the RSC payload.
- Inline `style` attributes on elements (9 on the home page). These come from React components (for example `paper-pair.tsx` sets an opacity style). That file belongs to the UI agent.
- Inline `<style>` tags on the error and not-found pages only.

**Why `'unsafe-inline'` is still there:** removing it without nonces breaks the Next.js bootstrap. Next.js supports nonce-based CSP through a `proxy.ts` file that generates a nonce per request. It requires dynamic rendering. Not tested here.

**Proposed change (needs review):**
1. Add a per-request nonce in `src/proxy.ts` (or the root `proxy.ts`; this Next version uses the `proxy` file convention, per `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`). The bundled docs show `export function proxy(request)` that sets `script-src 'self' 'nonce-…' 'strict-dynamic'`, passes the nonce to the framework via an `x-nonce` request header, and needs dynamic rendering on every page. Drop `'unsafe-inline'` for scripts.
2. For styles: the bundled docs' example uses `style-src 'self' 'nonce-…'` with no `'unsafe-inline'`. That would block inline `style` attributes, and the home page has 9 of them, from React components such as `paper-pair.tsx` (opacity). Keep `style-src 'unsafe-inline'` until the UI agent moves static styles into classes; then decide whether the remaining dynamic styles need `'unsafe-inline'`. Do not copy the docs' style line verbatim.
3. Verify: build, load the page in headless Chromium with the policy in report-only mode first, and check the console for CSP violations on desktop and mobile widths before enforcing.

**Risk if left as is:** an injected script could run in the page. The page renders server data and user-typed receipt text. React escapes text by default, and no `dangerouslySetInnerHTML` exists in `src`, so the injection risk is limited, but the CSP would not stop it.

## 2. Rate limiting

**Current:** none. Routes accept any request up to the body limit (8 KB, `src/lib/http.ts`).

**Why it matters:** `/api/own` and `/api/plan` call BSC RPC and Binance public endpoints on every request. Without a limit, a caller can use the server to drive that traffic, and each `/api/own` run makes several outbound calls.

**Options, in order of preference:**
- **Platform rate limit** on the host (Vercel firewall or an equivalent edge rule) for `/api/*`. No code change, but needs the host account. Needs human approval and a Vercel login.
- **In-app limit with a shared store** (for example a KV counter keyed by IP, with a window). Needs the same store decision as `docs/PROPOSAL_SERVER_REVIEW_STORE.md`.
- **In-memory limit per instance** (a token bucket in module scope). Simple, but serverless instances do not share it, so it is only a partial control. Label it as such if used.

**Proposed values (to confirm):** 30 requests per minute per IP on `/api/own` and `/api/plan`; 60 per minute on `/api/settle` and `/api/receipt`; 429 with a plain message. The limits should be tested with a fake clock.

**Not decided:** which IP header to trust. Behind a proxy, `x-forwarded-for` can be spoofed unless the platform sets it. The host must be confirmed before the limit uses it.

## 3. Other items found during the review

- **Expected values from the client** on `/api/settle` and `/api/receipt`: covered by `docs/PROPOSAL_SERVER_REVIEW_STORE.md`.
- **Error detail:** routes return `e.message` for bad requests. Messages are plain, and nothing sensitive is in them, but a generic message would be safer for unexpected errors. Small backend change; I can do it after this review, with tests.
- **Logging:** no request data is logged (verified earlier). Keep it that way.

## What I can do now (my scope, reversible, no UI edits)

- Add tests for the error-detail change (item 3) once the human agrees.
- Write the rate-limit logic as a pure function with tests (fake clock), without wiring it into any route, so it can be reviewed.

## What needs a human or the UI agent

- The CSP change and the nonce `proxy.ts`: a shared config file and the rendering path. Review before any change.
- Inline style cleanup in `paper-pair.tsx` and other components: UI agent.
- Choice of rate-limit store and host: human decision, and it depends on the review-store decision.
- Vercel login and any host-side firewall rule: human action.

## Not verified

- Whether the Next.js nonce setup works with this version (Next 16.4) without breaking streaming, and whether dynamic rendering changes the cache behaviour of `/`. Needs a build and a browser check.
- Whether any real CSP violations occur in the live page; the current check only read the built HTML, not a browser console under the stricter policy.
