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

## OUTSTANDING RELEASE ISSUE: reviewToken does not survive a page reload (recorded 2026-10-11)
**Status: open. Needs a human decision. Not fixed, deliberately.** Applies to the release candidate `dev/release-candidate` (`901e2c1`, UI by the core agent).

| Item | Detail |
|---|---|
| Behaviour | `own-flow.tsx` keeps the check result, the `txHash` and the `reviewToken` only in React component state (`useState`). A reload, a closed tab or a navigation discards all three. |
| Why it is this way | `docs/UI_REQUEST_CONTRACT.md` line 45 forbids `localStorage`, `sessionStorage`, cookies and URLs for the token: "Component state only." That is a deliberate security choice. |
| Where the contract contradicts itself | The same file, verification step 3, expects "Reload the page, then open an old settled receipt: settle and receipt still succeed." Component state cannot satisfy that once enforcement is on. |
| Impact today | None while `REVIEW_TOKEN_REQUIRED` is unset. Settle and receipt then run in legacy mode with the browser's values. The reload case works without a token. |
| Impact if `REVIEW_TOKEN_REQUIRED=1` | A user who sends a swap and reloads cannot verify settlement or get an ownership receipt. The server answers 400 "review token is required", which the UI shows as "This check is out of date. Run the check again." Running the check again cannot recover it, because a new check produces a new token for a different expectation. Their transaction would remain valid on-chain, but the app could not confirm it. |
| Also affected | Rotating `REVIEW_HMAC_SECRET` between a trade and its receipt has the same effect under enforcement. |
| What was tested | Token issued on a released trade, sent on settle, rejected when the browser tampers with `minOutWei` or drops the token (enforced mode), and authorization blocked after the review window. Reload recovery was NOT tested, because it cannot work under the current design. |

### Decision required (owner / core engineering). No option has been implemented.
| Option | Effect | Cost |
|---|---|---|
| A. Keep legacy mode for this release (recommended for the deadline) | Leave `REVIEW_TOKEN_REQUIRED` unset. Reload recovery works. Settle and receipt still check the chain against the browser's values. | The signed binding is issued and verified when the UI sends it, but is not mandatory. |
| B. Allow `sessionStorage` for the token | Reload within the tab recovers. | Reverses a written security rule, and a script running on the page could read the token. Needs the owner's explicit approval and a CSP review. A closed tab still loses it. |
| C. Server-side lookup by transaction hash | Recovery from any browser. | New server state or a KV store. A new API contract. Not feasible before 2026-10-11 12:00 UTC without an account. |

### Constraints that stay in force
- The API contract is unchanged. No security rule has been weakened by this note.
- `REVIEW_TOKEN_REQUIRED` stays off until the owner chooses and the chosen option is built and tested.
- The release-candidate worktree was not edited by the UI agent.
