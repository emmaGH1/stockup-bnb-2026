# Stockup 2.0: Spend to Own

## Human-provided definition (verbatim, 2026-10-10)
> Stockup is a consumer fintech application that connects everyday purchases to investments in tokenized shares of the companies people shop with.

Name: "STOCKUP 2.0 - SPEND TO OWN". Anything below beyond these two statements (reward rates, the reward-to-stock conversion mechanic, the merchant list) is the AGENT'S INTERPRETATION until the human confirms it.

## Binding product rules (from the human, 2026-10-10)
1. The purchase is a **manually entered or simulated spending event**. Stockup does not connect to cards, banks or merchants.
2. The investment is **user-funded** (the user's own wallet). It is **NOT merchant cashback**; there is no reward in this product.
3. **Never claim a trade succeeded unless settlement was independently verified** from the chain. "Submitted" is not "settled"; receipts exist only for verified, final settlements.
These rules are enforced by tests (`test/claims.test.ts`).

## Implemented (dev/foundation)
- `src/lib/spend.ts`: own-funds investment sizing from the manually entered spend (default 5%).
- `POST /api/own`: spend -> company -> instrument -> live data -> checks -> reviewed unsigned tx.
- Guard blocks conversion on closed/halted session, high price impact, thin pool. Nothing is signed or sent.

## Not implemented
- Real card/merchant recognition, user accounts, wallet connect/signing UI, Binance W3W integration, live session data.
- A designed UI. Real execution is blocked by thin liquidity (see CURRENT_STATE.md).

## Journey as specified by the human (2026-10-10)
1. User records a $100 Starbucks purchase. (built)
2. Stockup identifies Starbucks as the associated publicly traded company. (built, curated alias table)
3. User chooses to invest 5% of the spend ($5) using their OWN funds. (built: `computeInvestment`; independent of the merchant reward)
Later steps: not yet received.

Correction: earlier drafts had a merchant reward converted into stock. That concept was REMOVED; the investment is the user's own money and no reward exists.
