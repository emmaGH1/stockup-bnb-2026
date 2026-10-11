# Small-value mainnet test procedure (DRAFT, NOT APPROVED, NOT EXECUTED)

Status: **proposal for the human's approval.** Nothing in this document has been run against a funded wallet. Every step that spends funds or signs requires explicit approval from the human before it starts. Nothing here is a claim that a trade has happened or succeeded.

Prepared 2026-10-11 ~01:00 UTC from read-only data. Re-check everything live on the day of the test; numbers below go stale within minutes.

---

## 1. Purpose

Prove, on BSC mainnet with the smallest practical amount, that one real purchase can go through the full pipeline:
receipt text -> company -> instrument -> live status -> quote -> checks -> review -> the user's own wallet signs -> settlement verified on-chain -> ownership receipt issued.

This is the first real execution the project has ever attempted. Its outcome decides whether the product can claim anything about real trades.

## 2. Approvals required before any step (the human must say yes to each)

| # | Approval | Why |
|---|---|---|
| A1 | Spend up to **0.0067 BNB** (about $5 at ~$750/BNB) of the user's own BNB on the trade, plus gas | Real funds leave the wallet |
| A2 | Use **one named wallet** the human controls (address to be given) | The recipient and signer must be the same account |
| A3 | Sign **one** transaction in that wallet | Only the user's own signature can authorize it |
| A4 | Allow the agent to run the **read-only** verification steps after the transaction | No funds move; settlement is read from the chain |

No broadcast, signing, or spend happens without A1 to A3. The agent never holds a private key.

## 3. Wallet

- **Type:** a browser wallet extension or mobile wallet browser that injects `window.ethereum` (EIP-1193), set to BNB Smart Chain (chain ID 56).
- **Recommended for this test:** a fresh wallet holding only the test amount, so no other funds are exposed.
- **Address:** to be provided by the human (A2). Do **not** use any address from the repo, docs, or earlier test scripts. The address `0x1234…7890` holds real BNB and belongs to someone else. The throwaway address generated earlier is unfunded and must not be used.
- **Before starting:** confirm the wallet shows BNB Smart Chain, the address matches the one given in A2, and the wallet is not connected to any other dapp you don't recognize.

## 4. Asset

| Field | Value (read-only, 2026-10-11 00:58 UTC) |
|---|---|
| Company | Amazon (AMZN) |
| Token | AMZNon (Ondo tokenized Amazon) |
| Contract | `0x4553cFe1C09f37f38b12dC509F676964e392F8Fc` |
| Listing | Binance Web3 BSC tokenized-stock list (1,366 entries checked); symbol matches on-chain |
| Multiplier | 1 token = 1 share (list value; not a claim of direct share ownership) |
| Live status | `openState: true`, `marketStatus: offhours`, `reasonCode: TRADING` |
| Pool | PancakeSwap V2 WBNB/AMZNon, about 4.36 BNB of WBNB liquidity |

**Live status must be re-checked on the test day.** If it is not `TRADING` and open, do not run the test.

Amazon is chosen because it is the only liquid token open at the time of writing. Disney (DISon) is the fallback once it reopens, and only after its own check.

## 5. Required balance

| Item | BNB | Notes |
|---|---|---|
| Trade value (`valueWei`) | 0.00666445 | Matches the quote for $5 at the current BNB price. Changes with price. |
| Gas, estimated | ~0.0000104 | 207,680 units x 0.05 gwei. Actual gas may be higher. |
| Gas reserve (code's floor) | 0.002 | The wallet check requires this much beyond the trade. |
| **Minimum balance the wallet must hold** | **about 0.0087 BNB** | Trade + the reserve. The code's check is `balance >= trade + max(gas, 0.002)`. |

Recommended: fund the wallet with **0.01 BNB** so the check passes with margin and a leftover remains for any retry, and so the test does not spend more than the authorized amount. Leftover BNB stays in the wallet.

**Hard cap:** the server refuses any trade above 0.05 BNB. This test uses about 0.0067 BNB, far below that.

## 6. Fees

- PancakeSwap V2 pool fee: 0.25% of the trade, about $0.0125 on a $5 trade. This is included in the output, not charged separately.
- Gas: about $0.008 at 0.05 gwei and ~$750/BNB (estimate; the wallet shows the final figure).
- Price basis: the $5 trade value implies about $750 per BNB from the quote. Re-check on the test day.
- **Not included:** Binance Web3 Wallet trading fees. We have no source for them, so the fee figure shown to the user is **incomplete** and must be labelled that way.

## 7. Expected output and bounds

- Expected tokens: about **0.0190287 AMZNon** (from the live quote).
- Minimum accepted by the on-chain transaction: **0.0188384 AMZNon** (1% slippage). The transaction reverts if the pool gives less.
- Expected price impact: 15 bps (fee-free) and 40 bps including the pool fee. The guard allows up to 300 bps.

Any quote that differs materially from these at signing time must not be signed. Re-run the check.

## 8. Execution steps

1. **Re-check everything** (read-only): live status is `TRADING`/open; gas price; the quote is fresh; the guard and simulation pass; the wallet has the required balance. If any check fails, stop. Nothing has been spent.
2. **Enter the receipt text** in the app exactly as the sample receipt, or type a $5 merchant amount, and confirm the spending event.
3. **Run the check** in the app. Confirm it reports `ready_to_sign`, that the review shows the **same** recipient address as the wallet, and that the BNB value and minimum match section 7.
4. **Connect the wallet** using the app's connect button. Confirm the connected account equals the recipient and the chain is BSC (56).
5. **Tick both acknowledgements** and click **Authorize in my wallet** within 100 seconds of the check. If it has been longer, re-run the check.
6. **At the wallet's confirmation screen**, check before approving:
   - the network is BNB Smart Chain;
   - the sender is the address from section 3;
   - the amount is about 0.00666 BNB and the gas is small (well under 0.0001 BNB);
   - the destination is the router `0x10ED43C718714eb63d5aA57B78B54704E256024E`, not an unknown contract.
   If anything differs, **reject** in the wallet. Nothing is sent.
7. **Approve once.** Do not click twice. Note the transaction hash shown.
8. **Verify settlement** (read-only): the app's "Verify settlement on-chain" must report `settled` with at least 3 confirmations. A `mismatch` or `reverted` result means failure and must be reported as such.
9. **Get the ownership receipt** only after step 8 reports `settled` with 3 or more confirmations. The receipt must show the tx hash, token, received amount and gas, all checked on-chain.
10. **Record the result** in `docs/CURRENT_STATE.md`: transaction hash, block, received amount, gas paid, and the settlement state, with the BscScan links. Mark it as a real test, not a demonstration.

## 9. Failure handling

| Situation | Action |
|---|---|
| Check does not reach `ready_to_sign` | Stop. Nothing spent. Record the blocker. |
| Wallet shows a different recipient, chain, or router | Reject in the wallet. Nothing sent. |
| Quote older than 100 s at signing | Re-run the check. Do not sign the old one. |
| Transaction not mined after a few minutes | Look up the hash. Do not send another. |
| Transaction reverted on-chain | Report it as reverted. Only gas was spent. Do not retry automatically. |
| Settlement `mismatch` | Stop and report. Do not issue a receipt. |
| Any unexpected balance change | Stop and report. |

**Never retry automatically.** A second attempt needs a new approval.

## 10. What counts as success

- Transaction status `success`, sent from the approved wallet to the V2 router.
- Settlement verified on-chain as `settled`, with at least 3 confirmations.
- Tokens received by the approved wallet, at least the minimum.
- Ownership receipt issued only after the above.

Anything less is **not** a successful trade and must not be described as one.

## 11. Afterwards

- The tokens stay in the approved wallet. The test does not sell.
- AMZNon is an Ondo tokenized exposure to the stock, not direct share ownership. Say this in the report.
- The asset was `offhours` / `TRADING` at 00:58 UTC on 2026-10-11 (open, outside normal US hours). Re-check status on the test day; the market may close or pause before then, and the test must not run if it is not open.

## 12. Not in this procedure

- No Binance sign-in, no `baw` quote. The official Binance quote is not used.
- No second transaction. The "two transactions" judging rule is unverified and is not part of this test.
- No deployment, no repo visibility change, no merge.

---

**Decision requested:** approve A1 to A4 and give the wallet address for A2. Until then this document is a proposal only.
