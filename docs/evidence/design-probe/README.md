# Design probe evidence (dev/design-probe)

Captured from the production build served locally (`next start`). Desktop 1440px (judging-video width) and mobile 390px. Zero horizontal overflow, no console/page errors at both widths.

- `probe-landing-desktop-1440-full.png` — first fold + empty workspace, full page.
- `probe-landing-mobile-390-full.png` — same at 390px.
- `probe-workspace-desktop-1440-full.png` — workspace populated by a READ-ONLY live check (`POST /api/own`): BSC reads, Binance public data, PancakeSwap quote + `eth_call`. Nothing signed or sent; no wallet connected; Authorize stayed disabled. Recipient is the placeholder `0x…0001`; the wallet-funds check read its real mainnet balance.
- `probe-workspace-mobile-390-full.png` — same at 390px.
- Live values (AMZNon $262.30, quote 0.019050, pool 4.365 BNB) are real mainnet data at capture time (~01:08 UTC 2026-10-11) and will drift.
