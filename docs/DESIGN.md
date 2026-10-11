# Stockup 2.0 — design system (APPROVED BASELINE: UI Revision 2)

**Status: approved.** On 2026-10-11 ~07:49 UTC (VPS clock) the human formally approved Stockup UI Revision 2 (design-probe commit `a688418`) as the final hackathon design baseline. Earlier versions of this file said "not approved"; that was correct at the time and is superseded by this approval. Scope of the approval: the visual design shown in Revision 2. It does NOT approve a merge to `main`, a deployment, any transaction, making the repository public, or the hackathon submission; each of those still needs its own explicit approval. Small targeted fixes made after Revision 2 (commit `3861cdc`: desktop scroll-to-result, guard-line wording, larger acknowledgement checkboxes, one connect control near the review panel, typed-purchase wording) were requested separately and sit on top of the approved baseline; no hero, palette, typography or layout change was made in them.

Probe: `dev/design-probe` (fold + workspace), evidence in `docs/evidence/design-probe/`. Direction (human-stated): Industrial Editorial × Expressive Consumer Finance. Revision is targeted to the two probe surfaces; it is not authorization to rebuild the application.

## Palette (owner-supplied, provisional)
| Token | Value | Use |
|---|---|---|
| paper | #F4F3F0 | page background |
| ink | #171917 | text, rules, primary panels, gravity buttons |
| mist | #DADBD6 | dividers, quiet fills |
| vermilion | #F26438 | ONE accent: square markers, single CTA per zone, notice rule, motif squares |
| white | #FFFFFF | cards, fields, panels |

Semantic states keep green/red/amber for pass/fail/unknown only — never decorative.

## Type (SIL OFL, bundled via @fontsource — no runtime fetch)
- Grotesk (UI + display): Space Grotesk Variable — `font-sans`.
- Editorial accent: Instrument Serif 400 + italic — `font-serif`, display moments and receipt headers only.
- Micro-labels: monospace, uppercase, tracking ~0.12–0.14em, 10–11px, ink/60.
- Fold headline: 5xl–7xl, bold, leading ~0.95, tracking tight; serif italic carries one word.

## Motif
Dotted leader + square station (echoes receipt dotted totals and ticker notation). Used in: hero flow diagram, module markers (size-2 vermilion squares), receipt leaders. Never as random decoration.

## Layout
- Container `max-w-6xl`, 12-column fold grid, generous vertical rhythm.
- Zone breaks: 2px ink rules; module separators: 1px ink/30.
- Desktop-first composition (judging video), mobile stacks cleanly; zero horizontal overflow required at 390px.

## Components
- Primary CTA: `bg-vermilion text-ink`, square corners, no gradients. One per zone.
- Gravity actions (authorize): `bg-ink text-white`.
- Secondary: `border border-ink` outline.
- Panels: `bg-white border border-ink/30`; review/authorize panel: `border-2 border-ink`.
- Fields: `bg-white border border-ink/40`, vermilion focus outline.

## Provenance (playbook 4.5E) — borrowed vs rejected
01 grid/markers/numbered modules — yes; brand/robot imagery — no. 02 one-accent restraint — yes; purple/cards — no. 03 data readability — yes; fabricated stats/dashboards — no. 04 product-as-hero staging — yes (flow diagram); scooter imagery — no. 05 repeatable original motif — yes; purple 3D forms — no. 06 grotesk+serif pairing principle — yes; ID Grotesk/Times binaries — no. 07 poster type — unused so far.

## Slop lint (4.5G) standing rules
No gradients; no default blue/purple; no status pills or fake live dots; no fabricated metrics/testimonials; receipts are an input method, never the central identity; no decorative crypto graphics; sharp corners; every number sourced or labeled as example.
