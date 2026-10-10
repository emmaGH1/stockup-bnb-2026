# Stockup 2.0: Spend to Own

## Human-provided definition (verbatim, 2026-10-10)
> Stockup is a consumer fintech application that connects everyday purchases to investments in tokenized shares of the companies people shop with.

Name: "STOCKUP 2.0 - SPEND TO OWN". Anything below beyond these two statements (reward rates, the reward-to-stock conversion mechanic, the merchant list) is the AGENT'S INTERPRETATION until the human confirms it.

## Interpreted concept
A purchase at a merchant earns a reward. Part of the reward converts into the tokenized stock of that merchant, so everyday spending builds ownership.

## Implemented (dev/foundation)
- `src/lib/spend.ts` merchant rules (our own config, not real merchant data) and reward math.
- `POST /api/own`: spend -> reward -> live BNB/USD -> guarded swap plan -> `ready_to_sign` or `held_reward`.
- Guard blocks conversion on closed/halted session, high price impact, thin pool. Nothing is signed or sent.

## Not implemented
- Real card/merchant recognition, user accounts, wallet connect/signing UI, Binance W3W integration, live session data.
- A designed UI. Real execution is blocked by thin liquidity (see CURRENT_STATE.md).
