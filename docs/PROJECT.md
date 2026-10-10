# Stockup 2.0: Spend to Own

## Human-provided definition (verbatim, 2026-10-10)
> Stockup is a consumer fintech application that connects everyday purchases to investments in tokenized shares of the companies people shop with.

Name: "STOCKUP 2.0 - SPEND TO OWN". Anything below beyond these two statements (reward rates, the reward-to-stock conversion mechanic, the merchant list) is the AGENT'S INTERPRETATION until the human confirms it.

## Binding product rules (from the human, 2026-10-10)
1. The purchase is a receipt the user pastes or types. Stockup does not connect to cards, banks or merchants and cannot verify the receipt is real.
2. The investment is the user's own money. There is no merchant cashback or reward.
3. Never claim a trade succeeded unless settlement was independently verified from the chain.
These are enforced by `test/claims.test.ts`.

## Human product definition (verbatim)
> Stockup is a consumer fintech application that connects everyday purchases to investments in tokenized shares of the companies people shop with.

Product line: "Stockup converts a familiar shopping receipt into an investment journey."

## Journey (as specified by the human)
1. The user records a purchase (pasted receipt text, confirmed by the user).
2. Stockup identifies the associated publicly traded company (curated alias table).
3. The user invests a percentage of the spend from their own funds (default 5%).
4. Stockup finds a genuinely supported tokenized-stock instrument (Binance's BSC list, verified on-chain).
5. It retrieves live market data and, if available, an executable quote.
6. It checks market status, fees, quote validity and execution eligibility.
7. The user reviews and authorizes the transaction in their own wallet.
8. A supported route executes on BSC mainnet, and Stockup verifies settlement.
9. The user sees an ownership receipt linked to on-chain evidence.

## Implemented (dev/foundation)
See docs/IMPLEMENTATION.md for phase status and docs/CURRENT_STATE.md for verified results.

## Not implemented
- Real card, bank or merchant data; receipt authenticity checks; OCR.
- Binance signed REST API and the Agentic Wallet quote (needs credentials or sign-in).
- A real Stockup transaction (needs the human's explicit approval, a funded wallet and a cap).
- User accounts, persistence, notifications.
