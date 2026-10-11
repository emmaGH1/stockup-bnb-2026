# Mises Browser (Android) + Rabby extension: connection-only test

Status: **PREPARED, NOT RUN.** Nothing here is verified until a device run reports back.
Scope: connection and identity only. No signature, no transaction, no approval, no funding.

## Target

- **Test target:** the latest preview, deployed from release commit `92b25f0` (branch `dev/release-candidate`):
  `https://stockup-bnb-preview-8mpsn4qvo-emmagh1s-projects.vercel.app`
- **Do not test on** `https://stockup-bnb-preview.vercel.app`. That is the unintended production deployment and is out of scope.
- **Wallet:** Rabby **browser extension** inside Mises Browser on Android. This is not the Rabby Mobile app.

## What the app does (verified in code at `92b25f0`)

- Reads `window.ethereum` only. There is no EIP-6963 discovery, so the app cannot tell which wallet provider it is using. Provider identity must be checked outside the app (steps P1 and P2).
- Wallet methods in `src/lib/wallet/`: `eth_accounts`, `eth_chainId`, `eth_requestAccounts`, `wallet_switchEthereumChain`. The only `eth_sendTransaction` call sits behind the authorize gate, which this test must never reach.
- Wallet-line text the app shows:
  - "No browser wallet found." (no provider)
  - "Not connected. Connecting only shares your address. It never sends anything." (disconnected)
  - "Connected to BNB Smart Chain (56) as 0x…" (connected, chain 56)
  - "Your wallet is on another network. Connecting again will ask it to switch to BSC." (wrong chain)

## Hard rules for the tester

- **Allowed prompts:** one account-access prompt (`eth_requestAccounts`), and a network-switch prompt to BNB Smart Chain only if Rabby starts on another network.
- **Never approve:** any signature request (`personal_sign`, `eth_sign`, typed data), any `eth_sendTransaction`, any token approval, any `wallet_addEthereumChain` beyond BSC, or anything else.
- **Never tap:** "Authorize in my wallet", "Get ownership receipt", "Verify settlement on-chain", or any input that starts a trade.
- **Never** use the burn address `0x…dEaD`, or any address from the repo or docs, as a wallet. Use only your own Rabby account. Share only its public address.
- **Never** place a Vercel bypass value, token, or secret in a URL or a message.

## Preconditions

1. **Preview reachable in Mises.** The preview is behind Vercel SSO. If Mises shows a Vercel login page, record **BLOCKED (SSO)** and stop. Either sign in to Vercel in Mises with your own account, or make the Preview public yourself in the Vercel dashboard. Do not try to get past SSO any other way.
2. Rabby extension enabled in Mises. Account selected. Network set to **BNB Smart Chain (56)**.
3. Note whether Mises shows a JavaScript console or developer tools. Many Android browsers do not. See the no-console path below.

## Steps

**P1. Provider identity (read-only, before any tap).** If a console is available, paste:

```js
({ hasEthereum: !!window.ethereum,
   isRabby: !!window.ethereum?.isRabby,
   providers: window.ethereum?.providers?.length ?? 0 })
```

**P2. EIP-6963 announcements (read-only).** Paste:

```js
window.__announced = [];
addEventListener('eip6963:announceProvider', e => window.__announced.push(e.detail.info.rdns));
window.dispatchEvent(new Event('eip6963:requestProvider'));
setTimeout(() => console.log(JSON.stringify(window.__announced)), 500);
```

Expect `"io.rabby"` in the list. Record every `rdns` listed.

**P3. Chain and accounts before connecting (read-only, no prompt).** Paste:

```js
await window.ethereum.request({ method: 'eth_chainId' });   // expect "0x38"
await window.ethereum.request({ method: 'eth_accounts' });  // expect [] before connecting
```

**C1. Connect, once.** Load the preview. Before tapping anything, check the wallet line. It should show the disconnected text. No prompt should appear on load.

Tap **"Connect my browser wallet"** once.

- Expect one account-access prompt. Approve it.
- If Rabby is on another network, expect a switch prompt to BNB Smart Chain. Approve only that switch.
- Expect the wallet line to read "Connected to BNB Smart Chain (56) as 0x…", and the address shown to match your Rabby account.

**C2. Verify after connecting (read-only).** If a console is available, re-run the P3 lines. Expect `"0x38"` and `["<your address>"]`.

**B1. Balance (read-only).** Record the native BNB balance Rabby shows. You may send the public address to the agent for an on-chain cross-check. This test does not need any funds.

## No-console path

If Mises has no console, skip P1 to P3 and record:

- Identity: **UNVERIFIED (no console).** The app's wallet line cannot tell you which provider is active.
- Record what the wallet line shows, and whether Rabby's own screen lists the account and chain 56.
- Do not mark provider identity as passed.

## Acceptance

| Check | Pass condition |
|---|---|
| Reachable | Preview loads in Mises without the SSO page. |
| Provider identity | `io.rabby` announced (P2) **and** `isRabby` true (P1). If no console, recorded as UNVERIFIED, not PASS. |
| Connection | Wallet line shows connected, chain 56, with your address. |
| Chain | `eth_chainId` returns `"0x38"` (if console available). |
| Address | The address the app shows matches the Rabby account. |
| No extra prompts | Only the account-access prompt, plus a BSC switch if one was needed. |
| Balance | Recorded from Rabby. |

## Failure cases

| Symptom | Meaning | Action |
|---|---|---|
| Vercel login page | SSO blocks the preview | **BLOCKED (SSO).** Stop. |
| "No browser wallet found." | No `window.ethereum` in Mises | Record P1 output if available. Stop. Do not claim Rabby worked. |
| `isRabby` false, another `rdns` listed | Another wallet owns `window.ethereum` | **FAIL identity.** Record the `rdns`. |
| Wrong network text, switch refused | Rabby not on chain 56 | Switch Rabby to BSC manually and retry C1. Record both states. |
| Any signature, typed-data, approval or transaction prompt | Outside this test | **Reject. Stop.** Record the exact text. |
| Prompt appears on page load | Unexpected | Reject any prompt that is not the account request. Record it. |

## Evidence to return

- Mises Browser version, Android version, Rabby extension version.
- Whether a console was available, and the P1 to P3 output if it was.
- Whether the preview loaded without SSO.
- The wallet-line text before and after connecting.
- The number of prompts, and the exact text of each.
- The address shown, and the chain shown.
- The balance Rabby reports.
- Any rejected prompt, verbatim.

Until those results come back, this test is **unverified**.
