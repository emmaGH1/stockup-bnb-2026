# Design probe evidence (dev/design-probe) — revision 2

**Status: Revision 2 APPROVED by the human as the final hackathon design baseline (2026-10-11 ~07:49 UTC (VPS clock)).** These captures show that baseline (commit `a688418`).

Captured from the production build served locally (`next start`), 1440px desktop and 390px mobile. Zero horizontal overflow, no console or page errors.

- `revision2-fold-desktop-1440.png`, `revision2-fold-mobile-390.png`, `revision2-contact-sheet-fold.png` — first fold. Example only: Amazon purchase $100, proposed $5 (5%) of the user's own funds, AMZNon shown as PLANNED.
- `revision2-workspace-desktop-1440-full.png`, `revision2-workspace-mobile-390-full.png` — workspace after the example CTA and a READ-ONLY live check (`POST /api/own`: BSC reads, Binance public data, PancakeSwap quote + `eth_call`). Nothing signed or sent. A placeholder recipient `0x…0001` was typed; no wallet extension was connected; Authorize stayed disabled; zero wallet requests were made.
- Live values (AMZNon price, quote, balance of the placeholder address) are real mainnet reads at capture time (~03:55 UTC 2026-10-11) and will drift.
- Earlier first-revision captures were removed from HEAD; git history keeps them.
