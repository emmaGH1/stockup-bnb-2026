# Blockers (record, then work around honestly)
| # | Blocker | Since (VPS clock) | Impact | Workaround in use |
|---|---|---|---|---|
| 1 | Approved Stockup 2.0 concept/MVP scope not available to the agent | 2026-10-10 ~08:00 | No product flow | Concept-neutral core + labeled dev fixtures |
| 2 | No Binance W3W API key/secret | 2026-10-10 ~08:30 | W3W signing and endpoints unverified live | `src/lib/fixtures/w3w.ts` (source:"fixture") |
| 3 | No funded wallet / spend approval | 2026-10-10 | No on-chain txs, so no tx evidence | None. Will not fake txs |
| 4 | Docker not installed on VPS | 2026-10-10 | Dockerfile untested | CI builds the app; Docker unverified |

Rule: fixture data is never presented as live and never counted as mainnet or W3W evidence.

## Attempt log (retry rule: stop after 2 different failed solutions)
| Blocker | Attempt 1 | Attempt 2 | Status |
|---|---|---|---|
| Tokenized-stock addresses | Search summary -> 5 full candidates | On-chain symbol() check: 3 passed, 2 failed (CRCLon, NVDAB), several truncated | Stopped for failed ones; 3 verified kept. Not retrying more searches for those. |
| Concept lookup | Searched VPS files and sessions | Checked GitHub account repos | Stopped. Needs human. |
| W3W live validation | Unauthenticated probe (401) | n/a, needs keys | Waiting on keys, not retrying. |
