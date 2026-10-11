# Release-candidate checks (run from dev/design-probe on 2026-10-11 ~07:00-07:30 UTC VPS clock)

Target: release candidate `dev/release-candidate` @ `901e2c1` (UI by the core agent), tested on a throwaway `git archive` copy under /tmp. Nothing was deployed; no transaction was signed or sent; the design is NOT approved by the human.

## Screenshots (390px, 2x then halved)
- `auth-mobile-390-acknowledgements-rc-901e2c1.png` - the two confirmation warnings, "Connect wallet to authorize", the disabled Authorize button, and the "your wallet will show its own confirmation" note.
- `auth-mobile-390-authorize-enabled-rc-901e2c1.png` - after connect and both acknowledgements: Authorize is solid ink and enabled. It was NOT pressed.
- `review-panel-mobile-390-design-probe-a688418.png` - the review panel (amounts, addresses, fees, expiry, calldata fingerprint), from the design-probe build. The reviewToken change only touched request logic, not this markup.
- A third frame (panel top) was measured but not viewed, so it is not included.
- Earlier design captures: `../design-probe/`.

## Results
| Check | Result |
|---|---|
| typecheck / tests / build on 901e2c1 | clean / 186 of 186 / compiles |
| reviewToken issued for a released trade | yes, 900 s window, `reviewBound: true` |
| UI sends the token on settle | yes (token-optional and enforced servers) |
| Browser lowers `minOutWei` after the check | 400 "The details differ from the check. Run the check again." |
| Browser drops the token, `REVIEW_TOKEN_REQUIRED=1` | 400 "This check is out of date. Run the check again." |
| Authorize after the review window | blocked, nothing sent, "This check has expired. Run the check again." |
| Enforced server API (direct): no token / wrong-key token / garbage token | 400 required / 400 invalid / 400 invalid |
| Signing secret in server logs | 0 occurrences |
| Mobile authorization section | no overflow; smallest text 12 px; Connect and Authorize 44 px tall; all three confirmation warnings visible; WCAG AA contrast: 0 failures; every control named; keyboard focus visible on both acknowledgements and Authorize |
| Wallet methods the page requested | `eth_requestAccounts`, `eth_chainId` only |

## Limits (read before relying on this)
- Mock wallet, not a real extension. Placeholder recipient `0x…0001` (holds BNB; it shows the flow, not a funded wallet of ours).
- The settle call in the contract test used a fake transaction hash, so it returned `not_found`: it proves the token path, not a real settlement.
- The expiry case changed the response timestamp in the test.
- Not tested: reload recovery (cannot work under the current design; see docs/BLOCKERS.md), real-wallet signing, tab order across the whole page, screen readers, text zoom, desktop authorization section.
- The deployed Vercel project runs an older export (1be4ac8) behind login, with the signing secret set for Preview only. These checks were local.
