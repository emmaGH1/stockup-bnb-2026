# Product differentiation (evidence-based; agent draft for human review)

## One line
Stockup lets a user turn a typed-in spending event into a small, own-funds investment in the tokenized stock of the company they paid, and **refuses to say it worked until the chain proves it**.

## What is different (each item is built and has a test or a live run)
| # | Differentiator | Evidence in repo |
|---|---|---|
| 1 | **No success claim without verified settlement.** A receipt is issued only for a mined, successful, final (>=3 confirmations) swap whose decoded calldata matches what the user authorized and whose token Transfer logs credit the user. | `src/lib/settle.ts`, `receipt.ts`; validated on a real mainnet swap; `test/claims.test.ts` |
| 2 | **Review is decoded from the transaction itself**, not from the page's variables. 9 tamper cases (recipient, minOut, path, router, value, deadline, selector, chain) are rejected. | `src/lib/review.ts`, `test/review.test.ts` |
| 3 | **Fail-closed eligibility.** Market status, fees, quote validity, guard and wallet funds must all pass; "unknown" blocks. The server withholds the unsigned tx otherwise. | `src/lib/checks.ts` |
| 4 | **Liquidity honesty.** Scanned all 458 BSC tokens on Binance's Ondo list: only 48 PancakeSwap V2 pools, 7 hold >= $5k. The product says "no route" for Starbucks instead of faking a trade. | `scripts/scan-liquidity.ts`, `docs/CURRENT_STATE.md` |
| 5 | **Live trading status incl. corporate-action halts** from Binance's public RWA endpoints, with unreachable = not tradable. | `src/lib/instruments.ts`, `marketdata.ts` |
| 6 | **Plain-language trust rules enforced by tests:** spending is manual/simulated; investment is user-funded, not cashback. | `test/claims.test.ts` |
| 7 | **Real developer-feedback findings** from actually building against Binance's stack. | `docs/DEVEX_REPORT.md` |

## What is NOT different (be honest with judges)
- "Link everyday spending to stock investing" is not a new idea; round-up and rewards-to-stock apps exist (e.g. Acorns; not researched in detail here). Our edge is **verifiable execution and refusal to overclaim**, not the concept.
- We do not see real purchases (no card/bank/merchant link). The spending event is typed in.
- Reward/cashback was deliberately removed per the human's rules.

## Gaps against the judging rubric (from a search summary; verify on the official page)
- **W3W API depth (25%):** we use Binance's public RWA endpoints (list, status, dynamic data). We do NOT use the signed REST API (no keys) or the Agentic Wallet `baw` quote/swap (needs human sign-in). This is the biggest gap.
- **On-chain execution (15%):** zero Stockup transactions executed. Needs human approval, funded wallet, cap.
- **Design/UX (15%):** page never inspected in a browser; no designed visual identity yet.
- **Bounties:** no Agentic Wallet use, no BNB Agent Studio (ERC-8004/8183, x402) use.

## Suggested judge story (60-90 s, only if the real swap happens)
1. Type "AMAZON.COM" and $100 -> Stockup identifies Amazon.
2. Invest $5 of own funds -> live Binance status, DEX quote vs Binance reference, fees, checks.
3. Review screen decoded from calldata -> authorize in own wallet.
4. "Verify settlement" -> receipt with BscScan links. Then show Starbucks refused honestly.
Memorable moment: the app says **no** (Starbucks, closed market, thin pool) as clearly as it says yes.
