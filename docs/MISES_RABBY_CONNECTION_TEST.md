# Mises Browser + Rabby extension: connection-only test (device-run)

Status: **PREPARED, NOT RUN.** Nothing here is verified until a device run reports back.
Scope: connection and identity only. No signature, transaction, approval or funding.

## What the app does (verified in code, HEAD of dev/core-engineering)

- The app reads `window.ethereum` and nothing else. It does **not** use EIP-6963 discovery, and it does not show which wallet provider it is using.
- Wallet methods in `src/lib/wallet/` are `eth_accounts`, `eth_chainId`, `eth_requestAccounts` and `wallet_switchEthereumChain`. No signing method exists.
- Wallet-line strings: "No browser wallet found." (no provider), "Not connected. Connecting only shares your address. It never sends anything." (disconnected), "Connected to BNB Smart Chain (56) as 0x…" (connected on chain 56), "Your wallet is on another network…" (wrong chain).

**Consequence:** if another wallet is installed alongside Rabby, the app will use whatever `window.ethereum` is. The app cannot tell you which one that is. Provider identity therefore has to be checked on the device, outside the app. Steps P1–P3 do that.

## Preconditions

1. Preview reachable in Mises. The preview is behind Vercel SSO. If Mises shows a Vercel login page, record **BLOCKED (SSO)** and stop. Do not work around it.
2. Rabby extension enabled in Mises, on **BNB Smart Chain (56)**.
3. A dedicated test account in Rabby. Share only its **public address** with the agent. Never a seed phrase or private key.

## Steps

**P1. Provider identity (before any tap; read-only).** Open the browser console in Mises if available. Paste:

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

Expect `"io.rabby"` in the list. Record every rdns listed.

**P3. Chain and accounts before connecting (read-only, no prompt).** Paste:

```js
await window.ethereum.request({ method: 'eth_chainId' });   // expect "0x38"
await window.ethereum.request({ method: 'eth_accounts' });  // expect [] before connecting
```

**C1. Connect, once.** Load the preview. Confirm the wallet line before tapping. It should show the disconnected text, and no prompt should appear on load. Then tap **"Connect my browser wallet"** once.

- Expect one account-access prompt (`eth_requestAccounts`). Approve it.
- Expect the wallet line to read "Connected to BNB Smart Chain (56) as 0x…", and the shown address to match the Rabby account.

**C2. Verify after connecting (read-only).** Re-run the P3 `eth_chainId` and `eth_accounts` lines. Expect `"0x38"` and `[ "<your address>" ]`.

**Stop rule.** If any signature, typed-data, approval or transaction prompt appears, **reject it, stop, and record its exact text.** Do not approve it.

**B1. Balance.** Record the native BNB balance shown in Rabby. The agent can cross-check it on-chain after you send the public address. That check is a read-only public RPC call. The trade later needs at least 0.00866445 BNB, but this connection-only test does not need funds.

## Acceptance

| Check | Pass condition |
|---|---|
| Provider identity | `io.rabby` is announced (P2) **and** `window.ethereum.isRabby` is true (P1). If not, record the actual provider and mark identity **FAIL**. |
| Connection | Wallet line shows connected, on chain 56, with the test address. |
| Chain | `eth_chainId` returns `"0x38"`. |
| Address | The address the app shows equals the Rabby account. |
| No extra prompts | Only the single account-access prompt appeared. |
| Balance | Recorded from Rabby, and from public RPC once the address is supplied. |

## Failure cases to record

| Symptom | Meaning | Action |
|---|---|---|
| "No browser wallet found." | `window.ethereum` missing | Record P1 output; stop. Do not claim Rabby worked. |
| Vercel login page | SSO blocks the preview | BLOCKED (SSO). Stop. |
| Wrong chain text | Rabby not on chain 56 | Switch in Rabby and retry C1; record both states. |
| `isRabby` false, another rdns present | Another wallet owns `window.ethereum` | FAIL identity; record the rdns. Do not treat as Rabby. |
| Signature or transaction prompt | Outside this test | Reject. Stop. Record the text verbatim. |

## Report back

Send the text of P1, P2 and C2, the wallet-line text after connecting, the number of prompts, the address, and the balance. Those results are the device evidence. Until then this test stays unverified.
