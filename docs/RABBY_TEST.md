# Rabby wallet test on BNB Smart Chain (chain 56): procedure

Status: **PREPARED, NOT EXECUTED.** No wallet is funded or connected. Running this spends real BNB and needs explicit approval for each gate in section 2.

## 1. What is known, and what is not

| Item | Status |
|---|---|
| The app uses `window.ethereum` only (`src/components/own-flow.tsx`, `src/lib/wallet/provider.ts`). No EIP-6963 discovery. | Verified in code |
| The app never requests `personal_sign`, `eth_sign` or typed-data signatures. The only methods are `eth_accounts`, `eth_chainId`, `eth_requestAccounts`, `eth_sendTransaction`, `wallet_switchEthereumChain`. | Verified in code |
| The app does not call `wallet_addEthereumChain`. BSC must already exist in the wallet. | Verified in code |
| Rabby injects `window.ethereum` in the **mobile in-app browser** (dApp browser). | **UNVERIFIED.** Must be checked on the device. |
| Rabby supports EIP-6963 announcements. The app ignores them, so a multi-wallet page could pick another provider. | **UNVERIFIED** against Rabby's own docs. The only source was a search summary. |
| BNB Smart Chain is built into Rabby, so no manual network add is needed. | **UNVERIFIED** on the device. |
| Rabby's pre-sign security checks and how it displays the transaction. | **UNVERIFIED.** Record exactly what the screen shows. |

Do not treat any unverified row as a pass. Record what the device actually does.

## 2. Gates (each needs your explicit approval)

| Gate | What is needed | Why |
|---|---|---|
| G1. Funding | Approval to send **up to about $8 of BNB** to one dedicated test address | Real funds leave your account |
| G2. Address | The **Rabby address** (public address only, never a seed phrase or private key) | The recipient and signer must be the same account |
| G3. Reachable URL | A URL the phone can open that serves this build | The VPS is not reachable from the phone. A public URL is a public release, which needs approval (see `docs/MAINNET_TEST_PROCEDURE.md`) |
| G4. Transaction | Approval for **one** swap of about 0.00666 BNB plus gas, with one signature in Rabby | Real trade |

Stop at any gate you have not approved.

## 3. Amounts (recheck on the day)

| Item | BNB | Basis |
|---|---|---|
| Trade value | 0.00666445 | `$5` investment from the quote of `2026-10-11` |
| Gas (estimate) | about 0.0000104 | 207,668 units at 0.05 gwei |
| Gas reserve (code floor) | 0.002 | Wallet check: `balance >= trade + max(gas, 0.002)` |
| **Minimum balance the app requires** | **0.00866445** | |
| Funding at about $8 | about 0.0107 at about $750/BNB | Leaves about 0.002 BNB (about $1.50) spare |

The BNB price moves. Recheck the price and the quote before G1. If $8 is below the minimum at the day's price, the test does not run.

## 4. Steps (after G1 to G4)

1. **Check the environment:** the release build is served at the URL from G3. Live status for AMZNon is `TRADING`. Quote is fresh.
2. **Rabby setup:** open the dApp browser in Rabby mobile. Confirm the network is **BNB Smart Chain (56)**. Confirm the account is the G2 address and its balance is at least 0.00866445 BNB.
3. **Load the app** in the Rabby dApp browser. Record whether `window.ethereum` is present (the page shows "No browser wallet found" if not).
4. **Read without connecting:** the wallet line must show the account only after you tap connect. Nothing prompts on load.
5. **Run the check** with the sample receipt, $100 spend, $5 investment. Expect `ready_to_sign`. Record the review's recipient, value and minimum.
6. **Connect:** tap "Connect my browser wallet". Expect one account prompt. Approve it.
7. **Tick both acknowledgements** and tap "Authorize in my wallet" within 100 seconds of the check.
8. **At Rabby's confirmation screen,** compare with the review:
   - network BNB Smart Chain;
   - sender = the G2 address;
   - destination = `0x10ED43C718714eb63d5aA57B78B54704E256024E` (PancakeSwap V2 router);
   - value about 0.00666 BNB;
   - gas well under 0.0001 BNB.
   Record every warning Rabby shows, verbatim. **Any unexpected warning is a stop.** Reject if anything differs.
9. **Approve once.** Record the hash.
10. **Verify settlement** with the app's "Verify settlement on-chain". Only `settled` with 3 or more confirmations counts as a success. Anything else is reported as it is.
11. **Get the receipt** only after `settled`.

## 5. Stop conditions

- The app shows no wallet, or the account differs from the review recipient.
- Rabby shows a request for a signature, an approval, or any method other than the transaction in step 8.
- More than one transaction prompt for one tap.
- The balance changes by more than the trade value plus gas.
- Any field differs. Reject. Nothing is sent. Do not retry automatically.

## 6. Scope limits (what this test does NOT prove)

- The legacy path only. The live UI does not send `reviewToken` yet, and `REVIEW_TOKEN_REQUIRED` stays unset. This test does not exercise enforcement.
- Mobile Rabby only, unless the desktop extension is also tested. Other mobile wallets are not covered.
- No claim about Rabby's internal risk engine beyond what the screen shows.
- Binance trading fees are not included in the fee figure.
- The ownership token is an Ondo exposure, not direct share ownership.

## 7. Evidence to record

- Rabby app version, OS, and the dApp browser URL (the deployed commit).
- Result of each step 2 to 11 as pass, fail or not run, with a screenshot of the confirmation screen (address masked).
- The transaction hash and the settlement output, with the BscScan link.
- Any warning from Rabby, verbatim.

## 8. Security rules

- Send only the **public address** for G2. Never share a seed phrase, private key or screenshot of one.
- Use a dedicated wallet holding only the test amount.
- The app never holds a key. Signing happens only in Rabby.
