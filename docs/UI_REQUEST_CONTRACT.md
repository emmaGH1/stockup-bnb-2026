# UI request contract: the reviewToken integration

**For the UI agent.** This file specifies the change the browser must make to use the signed review token.
The backend (this repo) is done and tested. **No UI file has been changed by the backend agent.**
Implement the change in `src/components/own-flow.tsx` (and nowhere else in the visual layer).

Backend commit this contract describes: `697fe8e` on `dev/core-engineering`.

---

## 1. What the server now does

### `POST /api/own` (the check)
When a trade is released (`outcome: "ready_to_sign"`) and the server has `REVIEW_HMAC_SECRET`, the response
includes three new fields. They are added to the existing response, and nothing is removed.

| Field | Type | Meaning |
|---|---|---|
| `reviewToken` | string \| null | Opaque signed token for this released trade. `null` when not bound. |
| `reviewExpiresAt` | number \| null | Unix seconds. The window for **starting a new authorization**. |
| `reviewBound` | boolean | `true` when a token was issued. `false` means the server has no signing secret. |

`settleParams` is unchanged. `reviewToken` is only returned for a released trade. For every other outcome
(`not_eligible`, `held`, `no_route`, `over_limit`, `no_token`, `unidentified`) it is `null` and `reviewBound` is `false`.

### `POST /api/settle` and `POST /api/receipt` (after the transaction)
Both accept an optional `reviewToken` in the body, next to the existing fields.

- **With a token:** the chain is checked against the **signed** values. The browser's `valueWei`, `minOutWei`,
  `quotedOutWei`, `token` and `recipient` must match the signed ones exactly. A mismatch is refused before any chain read.
- **Without a token:** legacy mode. The request is accepted with the browser's values. This keeps the current UI
  working. The server can be switched to refuse these requests (see section 5).

### Expiry
The 15-minute `reviewExpiresAt` limits **starting a new authorization only**. It does **not** limit verifying a
transaction that is already on chain. A token signed a day ago still verifies a settled transaction.

---

## 2. What the UI must change

### Step 1: keep the token from the check
After `POST /api/own` returns `outcome: "ready_to_sign"`:
- Store `reviewToken` and `reviewExpiresAt` in component state, next to `settleParams`.
- **Do not** put the token in `localStorage`, `sessionStorage`, a cookie, or a URL. Component state only.
- If `reviewBound` is `false`, store `null`. The UI keeps working in legacy mode.

### Step 2: send the token on settle and receipt
Add `reviewToken` to the existing request bodies. Keep every existing field.

```json
{
  "txHash": "0x…",
  "token": "0x…",
  "recipient": "0x…",
  "valueWei": "…",
  "minOutWei": "…",
  "quotedOutWei": "…",
  "reviewToken": "<value from the check>"
}
```

- Send `reviewToken` only when it is a non-empty string. When it is `null`, omit the field.
- Do not change the amounts. Send exactly the values the check returned (`settleParams`).

### Step 3: show the new errors in plain language
These are the responses the server can now return (HTTP 400, JSON `{ "error": "…" }`):

| Server `error` | Show the user |
|---|---|
| `review token is required` | "This check is out of date. Run the check again." |
| `review token is invalid` | "This check could not be confirmed. Run the check again." |
| `request does not match the signed review: …` | "The details differ from the check. Run the check again." |

Do not show the raw server text beyond these. For a 500 the body is:

```json
{ "error": "The server could not complete this request. Nothing was sent." }
```

Show "Stockup could not check this right now. Nothing was sent." Nothing about the server's configuration is ever returned.

### Step 4: apply the 15-minute window only to authorization
**Important:** the server does **not** refuse an authorization after `reviewExpiresAt`. The window is enforced by the UI
only. The swap itself is still limited by the on-chain 120-second deadline, so an old check cannot execute later.
Do not describe the 15-minute window as a server-side control.
- The **authorize** button may be used only while `Date.now() / 1000 < reviewExpiresAt`. After that, show
  "This check has expired. Run the check again." and do not send the transaction.
- **Settle and receipt** must work after `reviewExpiresAt`. Do not gate them on the clock. A user who returns
  later to a settled transaction must still see the settlement and the receipt.

### Step 5: keep the existing guards
- Keep the 100-second client-side guard on authorize. It is a usability guard. The server and the chain enforce
  the real limits.
- Keep the connected-account and BSC checks and the wallet call exactly as they are.

---

## 3. What is NOT part of this contract
- No change to the wallet call (`eth_sendTransaction`), the review panel, the acknowledgements, or the wallet prompt.
- No change to calldata or on-chain checks. They run unchanged after the token check.
- The signing secret is never sent to the browser. The token is opaque; the UI must not parse or edit it.
- No new UI visuals. Use the existing message components.

---

## 4. Verification the UI agent should run
1. After a check that returns `ready_to_sign`, the stored `reviewToken` is non-null, and the settle request includes it.
2. Change the browser's `minOutWei` in state to a lower value, then submit: the server refuses with
   `request does not match the signed review: minimum output differs`, and the UI shows the plain-language message.
3. Reload the page, then open an old settled receipt: settle and receipt still succeed (no clock on verification).
4. Wait past `reviewExpiresAt`, then press authorize: it is refused in the UI and nothing is sent.

## 5. Rollout order
1. **UI ships steps 1 to 3.** The browser sends `reviewToken` when it has one. Legacy requests still work.
2. **Verify on the live server** that `/api/own` returns a non-null `reviewToken` for a released trade. This
   requires a funded recipient and a human-approved test. It has **not** been done.
3. **Only then** set `REVIEW_TOKEN_REQUIRED=1` on the host. Setting it earlier refuses every legacy request,
   including the ones the UI currently sends.

## 6. Current status (be precise)
- **Implemented and tested in the backend:** token issuance on a released trade; token verification and binding on
  settle and receipt; the expiry rule; generic 500s; the error messages above.
- **Tested with unit and route tests:** 161 tests pass across 27 files, including 14 route tests that call the real handlers.
- **NOT verified live:** a released (`ready_to_sign`) trade receiving a token from the live server.
- **NOT done:** the UI change itself. Until it ships, the live product runs in legacy mode and no token is sent.
- **Not enforced:** `REVIEW_TOKEN_REQUIRED` is unset.
