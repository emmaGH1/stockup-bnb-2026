# UI request contract for the signed review token (for the UI agent)

Status: **backend ready, UI not changed.** This file is a specification for the UI agent to implement in
`src/components/own-flow.tsx`. The backend agent does not edit UI files.

## What the backend does today (additive, compatible)

- `/api/own` will attach `reviewToken` and `reviewExpiresAt` to a released trade, once wired (the issuing
  function `issueReviewToken` exists and is tested; wiring into `own.ts` is a separate, reviewable step).
- `/api/settle` and `/api/receipt` accept an optional `reviewToken` in the body.
  - With a token: the chain is checked against the signed values. Browser amounts must match them exactly.
  - Without a token: accepted in legacy mode, unless the server sets `REVIEW_TOKEN_REQUIRED=1`.
- Expiry (15 minutes) applies to **new authorization** only. A settled transaction stays verifiable after the window.

## What the UI must change

1. **Store the token from the check response.** After `/api/own` returns `outcome: "ready_to_sign"`, keep
   `reviewToken` in component state next to `settleParams`. Do not put it in `localStorage` or a URL.
2. **Send it on every settle and receipt request.** Add it to the existing bodies:

   ```json
   { "txHash": "0x…", "token": "0x…", "recipient": "0x…", "valueWei": "…", "minOutWei": "…",
     "quotedOutWei": "…", "reviewToken": "<value from /api/own>" }
   ```

   Keep the existing fields. The server compares them with the signed values and refuses any mismatch.
3. **Handle the new errors in plain language.**

   | Server message (400) | Show the user |
   |---|---|
   | `review token is required` | "This check is out of date. Run the check again." |
   | `review token is invalid` | "This check could not be confirmed. Run the check again." |
   | `request does not match the signed review: …` | "The details differ from the check. Run the check again." |

   Do not show the raw server text beyond these. A 500 with the generic message means the server could not
   complete the request; show "Stockup could not check this right now. Nothing was sent."
4. **Do not require expiry for verification.** Only the authorize button uses the 15-minute window. If the user
   opens a settled transaction later, the settlement and receipt calls must still succeed.
5. **Keep the 100-second client-side quote guard** on the authorize button. It is a usability guard; the server
   and the chain enforce the real limits.

## Rollout order

1. UI agent ships steps 1 to 3 (the browser sends `reviewToken` when it has one).
2. Backend wiring of `reviewToken` into `/api/own` is verified on the live server.
3. Only then set `REVIEW_TOKEN_REQUIRED=1` on the host. Setting it earlier refuses every legacy request.

## What is not in this contract

- No change to the wallet call (`eth_sendTransaction`), the review panel, or the acknowledgements.
- No change to the calldata or the on-chain checks. Those run unchanged after the token check.
- The signing secret is never sent to the browser. The token is opaque to the UI.

## Verification the UI agent should run

- Settle and receipt requests include `reviewToken` after a check, and succeed with a settled transaction.
- A changed amount in the browser state (for example a lower minimum) is refused with the message above.
- Reloading the page and opening a settled receipt later still works.
