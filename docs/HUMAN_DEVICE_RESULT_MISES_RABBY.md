# Human device result: Mises Browser (Android) + Rabby extension, connection-only

Status: **HUMAN-REPORTED, PARTIAL. Not independently verified.**
Source: operator report in chat. Nothing on the VPS touched a device.

Preview: `https://stockup-bnb-preview-8mpsn4qvo-emmagh1s-projects.vercel.app` (release commit `92b25f0`).

## Reported results

| Item | Result |
|---|---|
| Preview opened in Mises past Vercel SSO | Reported yes. Method not stated. |
| Account-access prompt | Appeared. Approved by operator. |
| Switch to BNB Smart Chain, then reconnect | Reported done. |
| Wallet line after reconnect (verbatim) | `Connected to BNB Smart Chain (56) as 0x9202b7…2dd2.` |
| Address shown in Rabby | **Not yet reported.** Needed to compare with `0x9202b7…2dd2`. |
| Rabby BNB balance | **Not yet reported.** |
| Console P1 to P3 output, or "no console" | **Not yet reported.** |
| Other prompts after reconnect | **Not yet reported.** |

## What the wallet line does and does not show

- The connected text appears only when the wallet reports chain `0x38` and returns an account. The app shows the first 8 and last 4 characters of that account.
- It does **not** show which wallet provider is active. The app reads `window.ethereum` only, so provider identity (`isRabby`, `io.rabby`) is **UNVERIFIED** until a console run reports it.
- No signature, typed-data, approval or transaction prompt has been reported.

## Not covered

- Real-trade readiness. That needs a funded wallet the operator chooses and a separate approval.
- Any settlement or review path.
