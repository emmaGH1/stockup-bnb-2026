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
| On-chain DEX price for AAPLon | PancakeSwap V2 reserves: AAPLon/USDT ~ $1.64 total liquidity, AAPLon/WBNB ~ dust | PancakeSwap V3 pools (fees 100/2500): quote tokens held ~ $6-23, some pools liquidity=0 | Stopped 2026-10-10. Pools are effectively empty, so spot price (~364 USDT) is unreliable/manipulable and is NOT shown in the UI. Need W3W price API or the issuer's own price source. |
| Deeper-liquidity tokenized stock | Ondo API api.gm.ondo.finance (documented address endpoint): HTTP 403 with and without browser UA; docs list no stock addresses | Enumerate PancakeSwap V2 factory: 3,405,242 pairs, infeasible to scan | Stopped 2026-10-10 15:2x UTC. Needs W3W tokenized-securities lookup (keys) or an address list from the human. |
| SBUXx route | Added SBUXx 0x5667…262c (single search result; on-chain symbol matched) | Checked PancakeSwap V2 pairs vs WBNB/USDT/USDC: none exist | Stopped. Reward is computed; conversion returns `no_route`. Need a venue (W3W swap / other DEX) for SBUXx. |
| Find a real historical swap tx to validate the settlement verifier | `getLogs` on the AMZNon token over 4k-400k blocks: public RPC returns LimitExceeded | `getLogs` on the V2 pair over 1k-block windows: same LimitExceeded | Stopped. The public BSC RPC bans getLogs at any width tried. Use a different source (explorer/indexer) or a sample hash you provide. |

## Binance Web3 signed API: authenticated access (2026-10-10)
| Attempt | Method | Result | Outcome |
|---|---|---|---|
| 1 | Signed GET via `src/lib/w3w.ts` (prehash includes `/build`, per official docs) | HTTP 200, body `code 40304` "Service not available due to compliance restriction" | Blocked by a compliance gate, not a signature error |
| 2 | Diagnostic variant with `/build` omitted from the prehash (not the documented rule; used only to test the signature) | HTTP 401, `code 40102` Invalid signature | Expected: this variant is wrong per docs. Not a valid retry. |

Stopped under the retry rule. Did not change IP, proxy or VPN, which the docs list as separate compliance controls (40302, 40303). Needed from the human: check that the key is approved for API access and that the account's jurisdiction is supported; contact Binance support with code 40304 and endpoint `/build/api/v1/dex/balance/supported/chain`.
