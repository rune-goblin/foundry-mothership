# Layer 1 token inventory — keep or cut

Mark's decision sheet for widening `css/tokens.css` to the live-tokens vocabulary
(direction 2026-08-15: the stark theme becomes *values*, not a trimmed vocabulary).
Parsed from `@motion-proto/live-tokens` v0.47.1 `tokens.css` — 500 names, nothing invented.

**✅ = keep · ❌ = remove.** Everything is ✅ by default; flip any row to ❌.
The three ❌ rows below are pre-marked from your earlier answer — flip back to keep.
The two Foundry collisions (`--font-sans`, `--font-serif`) arrive suffixed
`-mothership` per decision 1; the collision guard verifies the rest mechanically.

This file is temporary: once marked, the result folds into `design-system.md`
(decision 2 rewrite + the DS6b unit) and this file is deleted.

## Colour palette — `--color-*` (113)

Ten families × 11-step ramps (100–950), plus three invariants.

- ✅ `--color-neutral-*` (11) — the grey ramp
- ✅ `--color-alternate-*` (11) — second neutral, warm-tinted
- ✅ `--color-canvas-*` (11) — page-ground family
- ✅ `--color-brand-*` (11) — primary brand colour
- ✅ `--color-accent-*` (11) — secondary accent
- ✅ `--color-special-*` (11) — highlight family
- ✅ `--color-success-*` (11)
- ✅ `--color-warning-*` (11)
- ✅ `--color-info-*` (11)
- ✅ `--color-danger-*` (11) — the blood red lives here
- ✅ `--color-white`, `--color-black`, `--color-transparent` (3)

## Surfaces — `--surface-*` (70)

7-step elevation (`lowest → highest`) per family, all ten families.

- ✅ `--surface-neutral-*` (7)
- ✅ `--surface-alternate-*` (7)
- ✅ `--surface-canvas-*` (7)
- ✅ `--surface-brand-*` (7)
- ✅ `--surface-accent-*` (7)
- ✅ `--surface-special-*` (7)
- ✅ `--surface-success-*` (7)
- ✅ `--surface-warning-*` (7)
- ✅ `--surface-info-*` (7)
- ✅ `--surface-danger-*` (7)

## Borders — `--border-*` (63)

- ✅ `--border-width-*` (13) — 0 through thick, numeric
- ✅ `--border-<family>-*` (50) — 5-step emphasis (`faint/subtle/default/strong/…`) × ten families

## Text colours — `--text-*` (51)

- ✅ `--text-primary/secondary/tertiary/muted/disabled/inverted` (6) — the neutral hierarchy
- ✅ `--text-<family>-*` (45) — 5-step hierarchy × nine families

## Typography (81)

- ✅ `--font-display/sans/serif/mono` (4) — families; `sans`/`serif` ship as `-mothership`
- ✅ `--font-size-*` (11) — t-shirt scale xs→…
- ✅ `--font-weight-*` (9) — thin→black
- ✅ `--line-height-*` (6)
- ✅ `--letter-spacing-*` (5)
- ✅ `--heading-xl/lg/md/sm-*` (20) — composite heading styles (family/size/weight/line-height/letter-spacing each)
- ✅ `--body-md/sm-*` (10) — composite body styles
- ❌ `--code-*` (5) — composite code style
- ❌ `--eyebrow-*` (6) — composite eyebrow/overline style *(pre-marked from your answer)*

## Spacing — `--space-*` (17)

- ✅ `--space-0…128` + `--space-full` (17) — value-in-the-name scale

## Radius — `--radius-*` (9)

- ✅ `--radius-none…4xl` + `--radius-full` (9) — kept per your follow-up ("keep live-tokens' radius scale")

## Shadows & focus (9)

- ❌ `--shadow-none…2xl` (6)
- ❌ `--ring-focus-sm/md/lg` (3)

## Motion (38)

- ❌ `--duration-75…1000` (7)
- ❌`--ease-*` (31) — linear + in/out/in-out families

## Utility (33)

- ❌`--z-*` (7) — base/dropdown/sticky/overlay/modal/popover/tooltip
- ❌ `--icon-size-*` (10)
- ❌ `--blur-*` (6)
- ❌ `--scale-*` (5) — transform-scale steps
- ❌ `--dot-size-*` (5)

## Overlays & gradients (13)

- ❌ `--overlay`, `--overlay-low/high` (3) *(pre-marked from your answer)*
- ✅  `--gradient-1…4`, `--gradient-angle-*`, `--gradient-stop-*` (10) *(pre-marked from your answer)*

## Page layout (8)

Live-tokens' demo-site scaffolding — the categories with no obvious MoSh surface.

- ❌ `--columns-count/max-width/gutter/margin` (4)
- ❌`--page-bg`, `--page-bg-attachment` (2)
- ❌ `--shimmer-on/off` (2) — loading-shimmer toggle
