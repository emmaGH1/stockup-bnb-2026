# Proposal: server-held review, so settlement checks against what the server promised

Status: **proposal only.** Nothing here is implemented. It changes the request shape that the browser sends, so the design agent must review the UI side before anything is built.

## Problem

`/api/own` builds the expected values for a trade: the token, the recipient, the value, the minimum output and the quote. It returns them to the browser as `settleParams`. The browser sends them back to `/api/settle` and `/api/receipt`, which verify the chain against whatever the client supplied.

Input validation (`src/lib/settle-input.ts`) rejects malformed and internally inconsistent values. It does not stop a client from sending a weaker expectation that is still consistent. Example: a client that lowers `minOutWei` to the transaction's real minimum, or sets a recipient that matches a swap sent by someone else's wallet. The sender check (`tx.from` equals the recipient) closes the "someone else's swap" case, but the client still chooses the amounts.

So the backend does not know what it promised. That is the gap.

## Proposed change (backend)

1. **Store the expectation on the server at build time.** When `/api/own` releases a transaction (`review` verifies and `tx` is non-null), it writes an entry keyed by a random `reviewId`:
   - `token`, `recipient`, `valueWei`, `minOutWei`, `quotedOutWei`, `createdAt`, `expiresAt` (created + 15 minutes), and the `calldataDigest` from `review`.
   - The entry is written only for a released transaction. A held or refused check creates no entry.
2. **Return only the `reviewId`** in `settleParams` (or a new `reviewId` field). The amounts can stay in the response for display, but the server ignores them when verifying.
3. **`/api/settle` and `/api/receipt` take `{ txHash, reviewId }`.** They look up the stored expectation and verify the chain against it. Unknown or expired IDs are refused. A `reviewId` can be used once to issue a receipt, to stop replay for a second address.
4. **Keep the existing validator** for the stored values, and keep the sender check.

## Storage

The app is serverless (Vercel, one region). An in-memory map does not survive across instances, so it cannot be the only store. Options, in order of preference:

- **A small KV store** (e.g. Vercel KV or Upstash Redis) with TTL. Needs an account and a credential. **Needs human approval** to create.
- **Signed, self-contained token** instead of a store: the server returns `reviewId` as the expected values plus an HMAC over them, using a server secret. The server verifies the HMAC on settle. No storage, but needs one secret in the environment (`REVIEW_HMAC_SECRET`). A secret must never be committed.
- **Local-only in-memory map** for the demo server only, labelled as non-durable.

The signed-token option needs no new account and is the smallest change. It still needs a human to decide where the secret lives.

## What this does not fix

- A **receipt is still only as strong as the chain**. The server proves what the chain shows; it cannot prove the purchase was genuine (the spend is typed or pasted).
- Replay across addresses is covered only if the receipt is single-use. The receipt endpoint is currently idempotent (same tx gives the same receipt ID), so it would need a use marker.
- Rate limiting is still missing.

## Required from the design agent (UI side, not mine)

- `own-flow.tsx` sends `{ txHash, reviewId }` instead of the full `settleParams`. The UI shows the same values from the review; only the request body changes.
- Handle the new "expired review" error with a plain-language message and a "check again" action.
- Nothing else in the UI should change.

## Tests I would add (if approved)

- Settle or receipt with a tampered `minOutWei` and a valid `reviewId`: uses the stored value, so a lower minimum does not help.
- Unknown `reviewId`: refused.
- Expired `reviewId` (past 15 minutes): refused.
- Reused `reviewId` for receipt: refused on second use.
- HMAC variant: a modified `reviewId` payload fails verification.
- A held or refused quote creates no review entry.

## Decision needed from the human

1. Approve the signed-token approach (no new account; needs `REVIEW_HMAC_SECRET` set on the host), or a KV store (needs an account).
2. Approve the request-shape change for the design agent to implement on the UI side.
3. Confirm 15 minutes as the review lifetime (the quote itself expires at 120 seconds, so the review window is for the settle step only).
