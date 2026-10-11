# Design probe evidence (dev/design-probe)

Captured from the production build served locally (`next start`), desktop-first plus 390px mobile.

- `probe-desktop-1280-full.png`, `probe-mobile-390-full.png` — first fold + empty workspace, full page.
- `probe-workspace-desktop-1280-full.png`, `probe-workspace-mobile-390-full.png` — workspace populated by a READ-ONLY live check (`POST /api/own`): BSC reads, Binance public data, PancakeSwap quote + `eth_call`. Nothing was signed or sent. The recipient used is the placeholder `0x…0001`; the wallet-funds check read its real mainnet balance. No wallet extension was connected; the Authorize button stayed disabled and no transaction was built for sending.
- Live values in the captures (AMZNon $262.30, quote 0.019050, pool 4.365 BNB) are real mainnet data at capture time (~01:05 UTC 2026-10-11) and will drift.
- Checks: zero horizontal overflow, no console/page errors at both widths.
