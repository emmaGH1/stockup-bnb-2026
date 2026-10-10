# Demo script (60–90 seconds, honest version)

Live URL: https://temporary-turbo-rowan-fk635uu.vercel.app (temporary; see docs/DEPLOY.md)

1. **The idea (10 s).** "A receipt for what you bought, a receipt for what you own." Paste a shopping receipt, or use the sample.
2. **Read and confirm (15 s).** Press Read receipt. Stockup shows what it read and says it cannot verify the receipt. The user confirms the merchant and the amount.
3. **Identify the company (10 s).** Amazon maps to Amazon.com (AMZN) and the tokenized instrument AMZNon, checked against Binance's listing and the on-chain symbol.
4. **Check the trade (20 s).** Live Binance market data, a PancakeSwap quote compared with Binance's reference price, fees, and a checklist. Any unknown blocks the trade.
5. **Review before authorizing (15 s).** The transaction is decoded from calldata: BNB sent, minimum tokens, recipient, router, expiry. The user must tick two boxes and connect their own wallet.
6. **The honest no (10 s).** Starbucks: the market is closed and there is no pool, so the investment is not eligible. Stockup says so and sends nothing.

**Say clearly:**
- The receipt is pasted or typed, and Stockup cannot verify it is real.
- The investment is the user's own money. There is no cashback.
- No transaction has been sent in this demo. A success is claimed only after on-chain settlement is verified. Stockup has not yet executed a transaction, so no ownership receipt exists.
- The wallet path was tested with a mock wallet, not a real extension.

**Do not show:** a success state, an ownership receipt, a transaction hash, or any claim that a trade happened.
