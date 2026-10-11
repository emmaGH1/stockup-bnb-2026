# Stockup

**Shop the brands. Build a stake.**

Stockup turns a purchase into a deliberate, small investment. You type or paste what you bought. Stockup identifies the public company behind the merchant and proposes putting a share of the amount, from your own wallet, into a tokenized stock on BNB Smart Chain. Nothing is bought until you review the exact transaction and sign it in your wallet.

Every step is checked before Stockup claims anything. Instruments are matched against Binance's BSC tokenized-stock list and confirmed on chain. Market status, pool liquidity, price impact and gas are read live. The transaction is decoded from its calldata and compared with what you were shown. A trade is reported as settled only after the chain confirms it.

## Status

Judge-facing app: https://stockup-bnb.vercel.app/ (production deployment `stockup-bnb-preview-n4qbs7agy`, Vercel deployment ID `dpl_6ZbMCbhzLauApf5rY9fxxZX5NGKA`). Anonymous access works with no login. The page and the purchase-to-checks flow return as designed.

Source: `cd066cb` (on `main`). Vercel records no git provenance for this deployment, so the commit is established by the deployment process, not by a Vercel-recorded commit.

- Typecheck and production build pass on a clean install. 199 tests pass across 31 files.
- Rabby, as a browser extension in Mises Browser on Android, connected to Stockup on BNB Smart Chain (chain 56). This is human-reported. No transaction or signature was requested or approved.
- One real-money swap has been executed and verified on chain (see On-chain evidence). It was made on 2026-10-11 by the project owner's own wallet, after the Vercel-recorded commit. No ownership receipt has been issued yet.

## What Stockup does not do

- It does not read cards, bank accounts or merchant records, and it cannot verify that a receipt is genuine.
- It does not detect purchases automatically and has no merchant integration.
- It has no cashback or rewards. The investment is paid from your own wallet.
- It does not guarantee returns.
- It does not report a trade as successful before on-chain settlement is verified.

## How it works

1. **Purchase.** You enter the merchant and amount. A pasted receipt is an optional shortcut.
2. **Company.** The merchant is matched against a curated list of public companies. Ambiguous or unknown merchants stop the flow.
3. **Instrument.** The ticker must appear on Binance's BSC tokenized-stock list, and the on-chain symbol must match.
4. **Checks.** Market status, pool liquidity, price impact, fees, gas and balance are read live. Any unknown check blocks execution.
5. **Review.** The server builds an unsigned PancakeSwap V2 swap and decodes it to confirm the router, path, recipient, minimum output and deadline.
6. **Wallet.** Your wallet signs. The app never holds a key and never sends a transaction itself.
7. **Settlement.** Stockup checks the sender, router, path, recipient and token transfers, and requires three confirmations. An ownership receipt is issued only for a final, settled transaction on a listed token.

## Safety model

- **Server.** It contains no signing or broadcasting code. Each trade is capped at 0.05 BNB.
- **Review token.** When a trade is released, the server issues an HMAC-SHA256 token that binds the wallet, token, router, amounts and quote. The token's 15-minute window applies only to new authorization. Verifying a settled transaction does not depend on it.
- **Wallet calls.** The browser requests account access, chain reads, a switch to BNB Smart Chain, and one transaction after two explicit confirmations. It never requests a signature.
- **Disconnect.** Stockup can forget a connection. Revoking access happens in the wallet.

## Ownership and exposure

A token is an Ondo tokenized exposure to the stock, listed by Binance. It is not a direct share and carries no shareholder rights. The share figure on a receipt is an approximation, computed from Binance's listed multiplier. Ondo and Binance terms, and any regional restrictions, apply. This project does not verify those terms.

## On-chain evidence

One real BNB to AMZNon swap on BNB Smart Chain, signed by the project owner's own wallet through the PancakeSwap V2 router:

- Transaction: `0x7028edb828c79b924aaf7b577ee86225e3fd9323430c27f812f8ceeb8d9be8b6` ([BscScan](https://bscscan.com/tx/0x7028edb828c79b924aaf7b577ee86225e3fd9323430c27f812f8ceeb8d9be8b6))
- Block 127014828. Sender and recipient: `0x9202B786dc0f1D0B1ce7314DbFBFC21283d32dD2`. Token: AMZNon `0x4553cFe1C09f37f38b12dC509F676964e392F8Fc`.
- Sent 0.00667905 BNB. Received 0.018924097 AMZNon (minimum accepted 0.018734856). Gas 0.0000104 BNB.
- Verified read-only through the deployed `/api/settle` route: state `settled`, 594 confirmations at check time (2026-10-11 ~11:56 UTC). It matched the router, path, recipient and amounts.
- This is one transaction, not two. Whether it meets any judging requirement is for the judges to decide. It was made after the form was submitted.
- Exposure is to Ondo's tokenized Amazon stock, not direct share ownership. Not financial advice.

## Verified

- Binance public RWA endpoints return the fields the code reads.
- On a live $5 AMZNon quote, the guard and transaction simulation pass. Price impact is 15 bps excluding the pool fee and 40 bps including it.
- Forged, tampered and modified review tokens are rejected. A genuine token reaches the on-chain lookup.
- Settlement verification refuses a transaction from the wrong sender, router, path, recipient or amount.

## Not verified

- Only one real trade exists (above). Further trades, and an ownership receipt for it, have not been done.
- No device run has covered a signature, a transaction or a balance check.
- Vercel does not record the source commit of the production deployment.
- Binance trading fees are not included in the fee figure.
- Issuer identity rests on Binance's listing and an on-chain symbol match.

## Known limits

- The settlement and receipt routes take expected amounts from the client. When a review token is sent, they are checked against the signed values. Without a token they run in legacy mode, and `REVIEW_TOKEN_REQUIRED` is still unset.
- There is no rate limiting, and the Content-Security-Policy still allows `unsafe-inline`.

## Run locally

```bash
npm ci
npm run typecheck
npm test
npm run build
npm start
```

`REVIEW_HMAC_SECRET` is needed only on a server that issues signed review tokens. Never commit it. `.env.example` lists the variables.

## Repository map

- `src/lib/`: business logic, including company matching, instruments, market data, quote and guard, checks, review, settlement, receipts and the review token.
- `src/app/api/`: `/api/own` (full check), `/api/plan`, `/api/settle`, `/api/receipt`, `/api/assets`, `/api/token`. None sends a transaction.
- `src/components/own-flow.tsx`: the browser flow.
- `test/`: unit and route tests.
- `docs/`: technical notes. [JUDGE_FLOW.md](docs/JUDGE_FLOW.md) lists the checks a reviewer can reproduce.
