# Real-wallet test procedure (browser extension and mobile wallet browser)

Status: **procedure only. NOT EXECUTED.** Every test below needs a real wallet, and the spending or signing steps need explicit human approval (see `docs/MAINNET_TEST_PROCEDURE.md`). Nothing in this file is a claim that a wallet has been tested.

Current evidence: every wallet test so far used a **mock EIP-1193 provider** in headless Chromium. That shows the app's logic, not a real wallet's behaviour.

## What the app expects from a wallet

The browser flow (`src/components/own-flow.tsx`, wallet adapter `src/lib/wallet/provider.ts`) uses `window.ethereum` only:

| Step | Method | Purpose |
|---|---|---|
| Read state | `eth_accounts`, `eth_chainId` | Check the account and chain without asking the user |
| Connect | `eth_requestAccounts` | Only on an explicit click; shares the address, sends nothing |
| Switch | `wallet_switchEthereumChain` (0x38) | Only on an explicit click, when the wallet is on another chain |
| Authorize | `eth_sendTransaction` `{from, to, data, value}` | Only after both acknowledgements and a check within 100 s |

The complete list of JSON-RPC methods in the wallet code is: `eth_accounts`, `eth_chainId`, `eth_requestAccounts`, `eth_sendTransaction`, `wallet_switchEthereumChain`. The app never requests `personal_sign`, `eth_sign`, or any typed-data signature. The unit tests in `test/wallet.test.ts` check that the read and connect paths never request a signature or transaction.

## What is not known yet

- Whether each wallet injects `window.ethereum` inside its in-app browser, and on which page URLs.
- Whether a wallet with several injected providers picks the right one. The app does not use EIP-6963 discovery, so a page with more than one injected wallet may get the wrong provider. Untested.
- How each wallet displays `eth_sendTransaction` without `gas`, `gasPrice`, or `chainId` (the app sends none of these; the wallet fills them).
- Whether `wallet_switchEthereumChain` to BSC is accepted for an account that has never added BSC.
- Whether a wallet rejects a transaction whose `data` is large or whose `to` is a contract it has not seen.

## Wallets to test (one row per wallet and surface)

| Wallet | Surface | Why | Status |
|---|---|---|---|
| MetaMask | Desktop extension, Chrome | Most common injected provider | NOT TESTED |
| MetaMask | Mobile in-app browser (iOS and Android) | The main mobile surface | NOT TESTED |
| Trust Wallet | Mobile in-app browser | Common on BSC | NOT TESTED |
| Binance Web3 Wallet | Mobile in-app browser, if it exposes `window.ethereum` | Binance's own wallet; relevant to the judging context | NOT TESTED; confirm it injects a provider before testing |
| Any other wallet a judge uses | Desktop or mobile | Coverage | NOT TESTED |

A test passes for a wallet only if every case in the next section passes on that wallet and surface. Record the wallet version, OS, and surface in the result.

## Test cases

Use a **fresh wallet holding only the test amount**. Do not use any address from the repo or docs. Do not test on a funded wallet that holds other assets.

### W1. Detection
1. Open the deployed page in the wallet's browser (or with the extension installed).
2. Expect: the page shows a wallet control, not "No browser wallet found".
3. Fail: the page reports no wallet while the wallet is present, or reports a different wallet than expected.

### W2. Read without connecting
1. Load the page with the wallet already connected to an approved account on BSC.
2. Expect: the wallet line reads the account and BSC state, and **no connection prompt appears**.
3. Fail: a prompt appears on load, or the wallet line is wrong.

### W3. Connect (explicit click)
1. Click "Connect my browser wallet".
2. Expect: exactly one account prompt from the wallet; the page shows the address.
3. Reject the prompt: expect the page to say the connection was declined, and Authorize to stay disabled.
4. Fail: a second prompt, or a signature request, or the address shown differs from the wallet.

### W4. Wrong network
1. Set the wallet to Ethereum mainnet (chain 1) with the approved account.
2. Connect. Expect: the page says the wallet is on another network and that connecting again will ask it to switch.
3. Click connect again. Expect: a switch request to BSC. Approve it.
4. Reject the switch: expect "Switch your wallet to BNB Smart Chain (56) to continue." and nothing sent.
5. Fail: the page sends a transaction or a signature while the wallet is on another chain.

### W5. Account mismatch
1. Connect with an account that is not the review recipient.
2. Run the check, then click Authorize.
3. Expect: "Your wallet account … is not the recipient address on this review". Nothing sent.
4. Fail: any transaction request reaches the wallet.

### W6. Quote expiry
1. Run the check. Wait more than 100 seconds before clicking Authorize.
2. Expect: "This quote is too old to authorize. Run the check again." Nothing sent.
3. Fail: the transaction request reaches the wallet.

### W7. Review matches the wallet prompt (the key check)
Run only after the amount has been approved by the human. This case uses a real transaction request, so it is part of the spending test.
1. At the wallet's confirmation screen, compare each field with the review on the page:
   - network: BNB Smart Chain;
   - sender: the approved account;
   - destination: `0x10ED43C718714eb63d5aA57B78B54704E256024E` (PancakeSwap V2 router);
   - value: about 0.00666 BNB;
   - gas: small, well under 0.0001 BNB.
2. Expect: all match. Approve once.
3. Fail: any field differs. Reject. Nothing is sent. Record the difference.

### W8. Rejection
1. Reject the transaction prompt in the wallet.
2. Expect: "Transaction was not sent. Nothing was submitted." No hash shown.
3. Fail: a hash appears, or the page shows success.

### W9. Mobile layout and touch
1. On a phone, repeat W1 to W3 in the in-app browser.
2. Expect: the wallet control and Authorize are reachable and tappable (at least 44 px); the review panel scrolls into view.
3. Fail: a control is hidden, cut off, or unreachable.

## Evidence to record for each run

- Wallet name and version, OS, surface (extension or in-app browser), and the page URL (the deployed commit).
- For each case W1 to W9: pass, fail, or not run, with a short note and a screenshot where useful.
- For W7: a screenshot of the wallet confirmation screen (with the address masked if needed).
- Any transaction hash, and the settlement result from the app's "Verify settlement on-chain" step. Do not record a hash as successful unless settlement shows `settled` with 3 or more confirmations.

## What stops the test

- Any wallet prompt that asks for a signature the app did not request (`personal_sign`, typed data, or an unknown method): stop, reject, and report.
- Any field in W7 that differs from the review.
- More than one transaction prompt for a single click.
- Any unexpected balance change.

Stop, do not retry, and report to the human.

## Not covered by this procedure

- Binance Web3 Wallet's executable quote (`baw`): needs a human sign-in and is not used.
- Trading fees charged by any wallet or by Binance: not included in the fee figure.
- Anything after the transaction is mined: that is covered by the settlement check and `docs/MAINNET_TEST_PROCEDURE.md`.
