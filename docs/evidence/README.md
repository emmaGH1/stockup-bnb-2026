# Demo evidence (captured from the live preview)

Source: https://temporary-turbo-rowan-fk635uu.vercel.app serving commit 4d5aa37.
Captured 2026-10-10 ~21:16 UTC with headless Chromium (no real wallet extension).

| File | What it shows | Result shown |
|---|---|---|
| 01-landing-desktop.png | Landing page, empty state | no receipt yet |
| 02-checked-desktop.png | Amazon sample receipt, live check | ELIGIBLE; review panel shown; nothing sent |
| 03-review-mobile.png | Review panel at 390px, 2x | decoded transaction; Authorize disabled until wallet connected |
| 04-starbucks-no-route-desktop.png | Starbucks receipt, live check | NOT ELIGIBLE: market closed; no WBNB pool; nothing sent |

Consistency: each screenshot was captured from a single run; the receipt text, read-back, form and company were checked against each other in the DOM before capture. A first Starbucks capture showed an Amazon receipt beside Starbucks fields; it was discarded and retaken.

Not shown here: any transaction, any Stockup ownership receipt, any real wallet. None exists yet.
