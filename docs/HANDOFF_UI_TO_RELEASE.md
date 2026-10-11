# UI handoff to the release integration agent (2026-10-11 ~07:49 UTC (VPS clock))

**Branch:** `dev/design-probe`, pushed to origin. UI Revision 2 (`a688418`) is approved by the human as the final design baseline. Last code commit: `3861cdc`. Everything after it is docs and evidence only (check `git log 3861cdc..origin/dev/design-probe`).
**I did not modify any other worktree.** `dev/release-candidate` (`901e2c1`) was only read. Nothing was merged, deployed or sent.

## What `3861cdc` changes (src/app/page.tsx, src/components/own-flow.tsx, src/components/paper-pair.tsx, test/workspace-flow.test.ts)
1. After a check the result card scrolls into view on every screen size (was phones only); reduced-motion users get an instant jump.
2. The guard line under a blocked result no longer says "All pre-trade checks passed" (it contradicted "Not eligible"). It now says price impact and pool depth are within limits.
3. The two acknowledgement checkboxes are 24 px with 44-48 px labels (were 13 px).
4. The form's "Connect my browser wallet" is hidden only while the review panel's own "Connect wallet to authorize" is shown. One `connect()`, one `sign()`; the authorize gating line is unchanged and is asserted by a test.
5. The development notice and the empty receipt panel no longer assume the user pasted a receipt. The notice still contains "cannot verify" and every required disclosure (tests assert this).

Untouched: `src/lib/*`, `src/app/api/*`, `package.json`, the lockfile, the hero, the palette, the typography, the layout.

## Dry-run merge into `dev/release-candidate` (901e2c1), done in a throwaway worktree that was then deleted
- One conflict, `docs/CURRENT_STATE.md`, an append-only log. Resolution: keep both sides (drop only the conflict markers).
- `src/components/own-flow.tsx` auto-merged: your reviewToken change (`reviewTokenFor`, `reviewErrorText`, `isAuthorizationExpired`, `EXPIRED_AUTHORIZATION`) is still present after the merge.
- Merged result: no change to src/lib, src/app/api, dependencies, hero, palette or typography versus 901e2c1. typecheck clean; **192 of 192 tests** (186 + 6 new); production build compiles.
- The current tip also adds docs and evidence files, so it will conflict on `docs/CURRENT_STATE.md` the same way and nowhere else I know of.

## Do not change, and why
- Keep `REVIEW_TOKEN_REQUIRED` off: the token lives in component state only, so a reload under enforcement would make settle and receipt unrecoverable (docs/BLOCKERS.md, "OUTSTANDING RELEASE ISSUE").
- Do not reintroduce a second always-visible connect button next to the review panel without updating test/workspace-flow.test.ts.

## Known gaps (unchanged by this handoff)
No real-wallet test (all browser checks used a mock wallet and a placeholder recipient). No Stockup transaction has run, so no settlement or ownership receipt has been seen live. Three of the four blocked-state screenshots in docs/evidence/release-checks/ were checked in the DOM but not viewed by eye. The Vercel project holds an older export (`1be4ac8`) behind login, with the signing secret set for Preview only.
