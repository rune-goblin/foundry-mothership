# Design system — context handover

**Status:** reviewed and verified 2026-08-14; execution started the same day. Every measurable
claim was re-measured independently; corrections are applied in place and the review ledger is
§7. The open questions in §5 now carry decisions. **§8 is the execution protocol and the
progress ledger — the authoritative state; start there to resume.** This document exists to
brief a fresh session cold, so it restates what a reader would otherwise have to rediscover.

**What this is.** MoSh's CSS never went through the ApplicationV2/Svelte migration. It is still
the AppV1-era community stylesheet, and it leaks into the rest of Foundry. The fix is a design
token layer adapted from **live-tokens**, plus MoSh's own components built on top — not ported
from live-tokens.

**Where it sits.** This is the only plan file: the finished plans — the PSG core (S1–S8), the
legacy remake (R0–R7, `bbfe33c` 2026-08-13), the architecture review and its evidence, and the
run-to-the-end protocol — were deleted 2026-08-15; `git show <commit>:docs/plans/<file>`
recovers any of them. This plan carries what the PSG core called S9: the CSS dissolution and
the Svelte architecture audit. Every sheet is already on the typed services, so nothing here
waits on behaviour work — decision 4.

---

## 1. The audit — what is actually wrong today

Measured 2026-08-14 against `css/mosh.css` (2,043 lines) and 52 `.svelte` files.

### 1.1 The stylesheet is unlayered, so it outranks all of Foundry

Foundry v13+ declares a cascade layer order and reserves slot 8 for systems:

```
@layer reset, variables, elements, blocks, applications,
       compatibility, layouts, system, modules, exceptions;
```

**Every** top-level block in `foundry2.css` sits inside an `@layer` — verified, zero exceptions.
`css/mosh.css` contains no `@layer` at all. Unlayered CSS beats all layered CSS regardless of
specificity, so our 2,043 lines currently sit *above* `exceptions`, the highest-priority slot in
the application. We are not participating in the cascade; we are sitting on top of it.

This is the single structural fact that explains every symptom below.

### 1.2 Thirty-six rules are not scoped to our surfaces

| Site | Rule | Blast radius |
|---|---|---|
| `css/mosh.css:509` | `.sheet nav.sheet-tabs { background: black; color: white }` | Every sheet in the world — journals, core dialogs, other modules' windows |
| `css/mosh.css:154` | `p { margin: 0em 0 }` | Bare element selector, unlayered, beats core typography everywhere |
| `css/mosh.css:160-167` | `.window-app .window-content { background: #fff }` | `.window-app` is the AppV1 frame. `init.ts:131` unregisters the v1 sheets and no `foundry.appv1` class remains in this system, so these rules now reach **only other packages'** v1 windows |
| `css/mosh.css:225-344` | `.grid-1col` … `.grid-12col`, `.flex-group-center`, `.flex-between` | Verbatim Boilerplate System template, unscoped, claiming generic global names |

### 1.3 580 of 2,043 lines (28%) are dead

67 class names appear in no component, template, test, pack source, or Foundry core.
**One false positive found on review: `sbt-*` is not uniformly dead** — `SheetHeader.svelte`
actively uses `sbt-profile` and `sbt-crew-name`. Treat the 580/67 figures as approximate and
re-run the dead-class audit as a script before deleting anything (§4.5 step 2).

- `sbt-*` (except the `SheetHeader` survivors), `ship-stats-grid`, `ship-sbt-stats-grid` —
  Shipbreaker's Toolkit, cut with the ships
- `tox-tinymce`, `tox-editor-container`, `tox-edit-area` — TinyMCE, replaced by ProseMirror in v13
- `css/mosh.css:745-790` — a W3Schools dropdown, comments and all ("*The container `<div>` -
  needed to position the dropdown content*"), carrying `-webkit-box-flex` / `-ms-flex`
  autoprefixer output from roughly a decade ago
- `grid-5col` … `grid-12col`, `rollh1`, `rollh2`, `rollmods`, `stresstext`, `transponder`, …

### 1.4 No tokens, and one invalid declaration

`grep -c 'var(--'` over `css/mosh.css` returns **0**. Every colour is a hardcoded literal. The
shells *do* opt into Foundry's theme system — `classes: ['mosh', …, 'themed', 'theme-light']` in
all six `*App.js` files — so we request a theme and then ignore it.

`css/mosh.css:2007` — `color: none !important`. `none` is not a colour; the declaration is
discarded.

Six `!important` total, which is low. That is worth protecting (§4.4).

### 1.5 Svelte's styling model is unused

1 of 52 components has a `<style>` block: `module/ui/parts/Editor.svelte`, three lines.

`test/ui-parts.test.ts` documents the hybrid honestly — the primitives emit global class names
from `css/mosh.css` and the test pins every one of them "because the stylesheet is a contract no
compiler checks." That test is the workaround for the missing design system. When components own
their styles, its reason to exist goes away.

### 1.6 The palette is small — which makes this tractable

**46** distinct colour literals across the whole sheet (re-measured; the first audit said ~30).
The top five dominate — `white` ×50, `#111` ×37, `grey` ×23, `black` ×21, `#fff` ×10 — plus one
red family (`rgb(117,0,0)` ×3 / `#aa0200` ×1); the rest is a long tail of single-use values,
which is exactly what a token pass exists to kill. **Three** typefaces, not two: **Chakra Petch**
(display) and **Barlow** (text), self-hosted in `fonts/` under SIL OFL 1.1, plus **Font Awesome
6 Pro**, used at `css/mosh.css:589` for the active-tab chevron — which is why the
`:not([class*="fa-"])` exclusion in the font rule (§2.3) is load-bearing. Border radii cluster on
10px / 15px / 21px but 24 distinct values are in play; the migration should collapse the tail
onto the three focal sizes.

This maps onto a token set cleanly. The migration is bounded.

---

## 2. What live-tokens is

`/Users/mark/Documents/repos/motionproto-repos/live-tokens` — `@motion-proto/live-tokens` v0.47.1,
MIT, Svelte 5 + Vite 8.

### 2.1 The architecture worth adopting

A **two-layer token system**, documented in `src/system/styles/CONVENTIONS.md` (185 lines, and
the best single artifact in the repo — read it first).

**Layer 1 — theme tokens** (`src/system/styles/tokens.css`, 696 lines, **500 distinct token
names** across 512 definitions — the first audit said 539). Category-first naming; every token
starts with a category prefix that says what kind of value lives at the key:

| Category | Holds |
|---|---|
| `--color-*` | Primitive palette, ramps 100–950 |
| `--surface-*` | Fills/backgrounds, 7-step elevation |
| `--border-*` | Border colours, 4-step emphasis |
| `--text-*` | Text colours, 5-step hierarchy |
| `--font-*` / `--font-size-*` / `--font-weight-*` | Families, t-shirt size scale, numeric weights |
| `--space-*` | Spacing, value encoded in the name (`--space-8` = 8px) |
| `--radius-*`, `--shadow-*`, `--ring-*`, `--border-width-*` | T-shirt scales |
| `--duration-*`, `--ease-*`, `--z-*` | Motion, stacking |

(CONVENTIONS.md also lists an `--opacity-*` category, but `tokens.css` defines none — the law
and the file disagree there. The file also carries categories the table above omits:
`--heading-*`, `--body-*`, `--eyebrow-*`, `--icon-*`, `--gradient-*`, `--blur-*`. Take the
categories MoSh needs, not the full inventory.)

Colour categories partition into **families** — `neutral`, `canvas`, `brand`, `accent`,
`success`, `warning`, `danger`, `info`, `special`, `alternate` — each with a scale suited to its
role. Two scale shapes only (t-shirt, numeric); inventing a third is prohibited.

**Layer 2 — component tokens.** Named `--<componentId>-<part>[-<state>][-<element>]-<property>`.
State comes before property. No abbreviations (`bg` → `surface`, `fg` → `text`, no shortened
component IDs). Each component declares its own slots and aliases them to theme tokens, then its
styles read **only its own tokens**:

```css
--button-primary-surface: var(--surface-brand-high);
--button-primary-text: var(--text-primary);
--button-primary-radius: var(--radius-xl);
```

That indirection is the whole point: a component never reads a raw palette value, and retheming
happens entirely at the alias layer.

### 2.2 What we would not take

| Path | Why not |
|---|---|
| `src/editor/**` | The live token editor UI — pages, overlay, docs, component-editor. Not wanted in a Foundry system. |
| `src/demo/**`, `src/app/site.css` | Demo and landing content. `site.css` is *bare element selectors* (`h1`, `p`, `a`) — actively hostile inside Foundry. |
| `src/system/components/**` | 26 components (Button, Card, Dialog, Table, …). See §3. |
| `src/live-tokens/data/component-configs/**` | Bound 1:1 to those components. |
| `themeFileApi` Vite plugin, `_active.json` / `_production.json` | The runtime editing loop. Rewrites token files from a running dev server. Out of scope. |
| `src/system/styles/fonts.css` + fonts | MoSh already self-hosts Chakra Petch + Barlow. |
| `tokens.generated.css` | Editor output. Note it targets `:root:root` — a specificity hack that is meaningless once we scope to `.mothership`. |

**Do not `npm install` the package.** Its `files` array ships `src/editor`, `src/demo` fixtures,
eight preset theme JSONs, a CLI, and `.claude/skills`. Vendor `tokens.css` and `CONVENTIONS.md`,
adapt, and record the upstream version in a comment.

### 2.3 Its Foundry incompatibilities, precisely

| live-tokens does | Inside Foundry this means |
|---|---|
| `:where(*:not([class*="fa-"])) { font-family: var(--font-sans) }` (`tokens.css:5`) | Restyles the **entire VTT**. Must become `.mothership :where(*:not([class*="fa-"]))`. |
| Declares all Layer 1 tokens on `:root` | Adds 539 names to the global namespace. Mostly inert, but see the collision below. |
| Declares component tokens in `:global(:root)` inside every component `<style>` | Wrong scope in Foundry, and defeats the point of a scoped stylesheet. Must land on the sheet root. |
| Bare class names — `.button`, `.badge`, `.count` | Collide with core and with every module. Must be namespaced. |
| `<style lang="scss">` in 17 of 26 components, plus `_padding.scss` / `_slot-prose.scss` mixins | MoSh **deleted its SCSS tree deliberately**; `CLAUDE.md` records "there is no SCSS step". See §4.3. |
| `createEventDispatcher` in `Button.svelte` | Deprecated in Svelte 5. MoSh forces runes mode on (`svelte.config.js`), which rejects it. |

### 2.4 The token collision — the one that bites

Comparing all 500 live-tokens names against all 398 Foundry definitions (both counts
re-verified against the installed v14 build) gives exactly **two** exact-name collisions.
Both are load-bearing:

```
--font-sans      foundry2.css:263   body { --font-sans: "Signika", ui-sans-serif, sans-serif }
--font-serif     foundry2.css:264   body { --font-serif: "Amiri", serif }
```

Foundry aliases `--font-body` and `--font-h1` … `--font-h6` off `--font-sans`. So:

- Redefining `--font-sans` on `:root` changes **every heading and body font in the whole VTT**.
- *Not* defining it, while a component reads `var(--font-sans)`, silently renders in **Signika**.

There is no third option that leaves the name alone and gets the right font. This is the concrete
form of "Foundry is greedy" — and it is why the scope root and the prefix are the first two
decisions, not details.

Everything else clears: `--color-*`, `--surface-*`, `--text-*`, `--border-*`, `--space-*`,
`--radius-*` have zero overlap. Foundry's font-size scale is numeric (`--font-size-24`), the
token scale is t-shirt (`--font-size-lg`) — no overlap by construction.

---

## 3. What ReignMaker proved, and what it cost

`/Users/mark/Documents/repos/pf2e-reignmaker` — a **module**, 235 Svelte components,
`src/styles/variables.css` (444 lines, 322 tokens).

It does **not** depend on live-tokens. It hand-rolled the same vocabulary independently: **153**
of its 322 token names match live-tokens exactly (re-measured; the first audit said 156), and
the category-first shape is identical. Two codebases converging on the same naming is the
strongest evidence available that the vocabulary is right.

**What it got right:**

- **Zero collisions with Foundry** across all 322 tokens. The category-first vocabulary is
  Foundry-safe in production, not just in theory.
- **The ID-scoped zero-specificity font fallback** — the Foundry-safe adaptation of the live-tokens
  universal rule (`src/styles/variables.css:9-12`):
  ```css
  :where(#pf2e-reignmaker),
  :where(#pf2e-reignmaker *:not([class*="fa-"])) {
    font-family: var(--font-sans-rm);
  }
  ```
  Note `--font-sans-rm`. It hit the §2.4 collision and solved it by suffixing. Independent
  confirmation that the collision is real and that renaming is a workable answer.
- **Class namespacing.** `src/styles/form-controls.css:3` — "*Namespaced with `rm-` prefix to
  avoid Foundry conflicts*". The `rm-` class prefix is universal; the `#pf2e-reignmaker` ID
  scope is not — many selectors are bare `.rm-select` etc. The prefix survived where the
  scoping discipline slipped, which is an argument for prefixed class names as the durable half
  of the defence.

**What it cost:**

- **240 `!important`** across `src/`.
- **Zero `@layer`.** Specificity is fought with an ID selector and `!important` instead.

That trade is the lesson. ReignMaker predates the v13 layer system and beats Foundry by brute
force. MoSh should not copy that half.

**MoSh's structural advantage:** ReignMaker is a module mounting one app window, so a single ID
scope works. MoSh is a **system** — it owns layer slot 8, and its surfaces are many windows plus
chat cards. Different problem, better tools.

---

## 4. The proposal — for Fable to critique, not to accept

### 4.1 The scope root: `.mothership`

The scope class is **`.mothership`**, renamed from `.mosh` as part of this work — Mark wants
"mosh" gone, and `mothership` matches the system id. Not `ms`: in CSS that token already means
two things — the `-ms-` vendor prefix and the millisecond unit — so `.ms` classes and `--*-ms`
token suffixes misread in exactly the files this plan touches.

The rename is cheap because every MoSh surface already carries the old class, and steps 3 and 5
rewrite every selector anyway:

- All seven ApplicationV2 shells: `classes: ['mosh', …]` (ClassSheetApp inherits from
  ItemSheetApp)
- All six chat card templates: `templates/chat/*.html` line 1 is `<div class="mosh" …>`

Chat cards render **inside Foundry's chat log**, outside any MoSh window — so a window-only scope
would miss them. The scope class covers both; that pattern is load-bearing, keep it. During
migration the surfaces carry both classes — `['mothership', 'mosh', …]` — and `mosh` is dropped
when the last `.mosh` selector dies in step 5. The CLAUDE.md line "the `.mosh` CSS classes …
are kept" is superseded by this decision and updates when the drop lands.

**One gap:** dialogs use `macro-popup-dialog` only (`module/dialogs/svelte-dialog.ts:71`), not
the scope class. Adding `mothership` to that array is prep work item 1 — without it no dialog
can read a token. (An earlier draft claimed the `.macro-popup-dialog` radio styling duplicates
rules under `.mosh`; review found no `.mosh` radio/checkbox styling exists — the dialog rules
are the only ones, so they stay until dialogs are restyled.)

### 4.2 Proposed file shape

```
css/
  tokens.css      NEW  Layer 1, adapted from live-tokens. Scoped, layered.
  mothership.css  css/mosh.css, RENAMED; SHRINKS to @font-face + branding (#logo, #pause)
                  + chat cards. The rename touches module/index.js:3 (the import) and
                  vite.config.ts:25 (the dev-server rewrite).
module/ui/
  parts/*.svelte       Each owns its styles in a scoped <style>.
```

with every rule that is not `@font-face` wrapped:

```css
@layer system {
  .mothership { /* Layer 1 tokens */ }
  .mothership :where(*:not([class*="fa-"])) { font-family: var(--font-sans-mothership); }
}
```

`@font-face` stays outside — it is not a cascade participant.

Component tokens land on the sheet root (`.mothership`), never `:root`.

### 4.3 Build the components; do not port them

MoSh needs 6 primitives it already has names for — `ItemList`/`ItemRow`/`ItemCell`,
`CircleStat`, `PipTrack`, `MainStat`, `Field`, `Tabs`. live-tokens ships Button, Card, Dialog,
Table, SideNavigation, SegmentedControl, Tooltip. The overlap is close to zero, and the ported
ones would arrive with `createEventDispatcher`, SCSS, and `:global(:root)` to strip.

Take the **discipline** (two layers, the naming law, the alias indirection). Write the components.

**SCSS.** live-tokens components need `sass` for `lang="scss"` and its `themed-padding` mixin.
MoSh deleted `scss/` on purpose. Stay pure CSS and use **native CSS nesting**, which removes
the reason SCSS was there. The browser floor is confirmed safe: Foundry v13's stated minimums
are **Chromium 122 / Firefox 127 / Electron 33** (release 13.336 notes; v14 states no bump, and
the installed v14 app ships Electron 41 / Chromium 146). `@layer` needs Chrome 99 and Foundry's
own core CSS depends on it; native nesting needs Chrome 112 (Chrome 120 for the relaxed
no-`&` syntax); `:where()` needs Chrome 88. All clear the floor. Safari is officially
unsupported by Foundry and constrains nothing.

### 4.4 Verification — the gap that must close first

This work has always required screenshot verification. **There is no visual baseline today:**
`playwright.config.ts:22` sets `screenshot: 'only-on-failure'` and no spec calls
`toHaveScreenshot()`. The 124 e2e specs boot a real headless Foundry, so the harness for a
visual-regression gate exists — the baselines do not.

**Capture baselines before touching a single rule.** Every step below is otherwise unverifiable,
and §1.1 guarantees that layering the sheet *will* change what wins.

Also protect the two green numbers: `!important` count (6) and unlayered-rule count (target 0).
Both are one-line greps and both are exactly the metrics that rot silently — ReignMaker's 240 is
what that rot looks like at scale.

**Make the guards tests, not habits** — the same philosophy that produced `ui-parts.test.ts`:

- A vitest spec over `css/` asserting the `!important` ceiling, zero style rules outside
  `@layer` (excepting `@font-face`), and — once step 5 completes — no colour literals outside
  `tokens.css`.
- The **token collision guard** (decision 1): intersect our defined `--*` names with the names
  defined by the Foundry build the e2e harness boots, and fail on any overlap. The intersection
  is exactly what this review computed by hand; a Foundry upgrade that mints a colliding name
  should break a test, not a sheet.
- The **dead-class audit as a checked-in script**, run before any deletion — the one-off audit
  already produced one false positive (`sbt-*`, §1.3).

### 4.5 Suggested order

| Step | Risk | Notes |
|---|---|---|
| 0 | — | Screenshot baselines for all 6 window types + 6 chat cards |
| 1 | none | The class rename (§4.1): add `mothership` to all seven shells, six chat templates, and `svelte-dialog.ts` CLASSES, keeping `mosh` alongside until step 5 retires it |
| 2 | none | Delete the dead lines; remove `.window-app` rules; fix `color: none !important`. **First re-run the dead-class audit as a checked-in script** — review caught `sbt-profile`/`sbt-crew-name` alive in `SheetHeader.svelte` inside the claimed-dead `sbt-*` family |
| 3 | **real** | Wrap the sheet in `@layer system`; scope the 36 global rules under `.mothership`. This deliberately changes what beats core — the baselines earn their keep here |
| 4 | none | Land `css/tokens.css`; nothing consumes it yet |
| 5 | per-component | Dissolve `css/mosh.css` component-by-component into scoped `<style>` blocks |
| 6 | none | Retire `test/ui-parts.test.ts`'s class-name pinning as each primitive stops depending on global CSS |

Steps 2 and 4 are independent of 3 and can land in either order.

### 4.6 Nothing keeps the name — the full mosh retirement

Mark's direction (2026-08-14): **every existing `mosh` identifier migrates to `mothership`**,
not only the new naming. The measured inventory, and where each surface lands:

| Surface | Measured | Migrates in |
|---|---|---|
| `.mosh` CSS class | 193 selectors in `css/mosh.css`; `classes` arrays in 7 shells; `<div class="mosh">` in 6 chat templates plus `Tabs.svelte`, `SkillPicker.svelte`, `BonusOption.svelte`; pins in `test/ui-parts.test.ts` | Steps 1, 3, 5 (§4.1 — both classes during transition, `mosh` dropped when the last selector dies) |
| `Mosh` lang root key | Root key in `lang/en.json` and `lang/pt-BR.json`; **461** `Mosh.*` references across `module/` and `templates/` | **Done 2026-08-14.** Root key renamed to `Mothership`, every reference swept (including the escaped `Mosh\.` regex forms in `test/init.test.ts` and `test/lang-keys.test.ts`), the stale `Mosh.macro.*` comment in `content/books/psg/macros.ts` deleted. Verified: `npm run check` clean, 753 vitest specs green, `grep -r 'Mosh\.'` returns 0. Found in passing: `itemRoll.html` localizes `Mothership.MajorRepair`/`MinorRepair`, keys the PSG cut removed from both lang files — a dead ship-era template branch, left for the template cleanup |
| `Mosh*` class symbols | `MoshCharacterSheet`, `MoshCreatureSheet`, `MoshClassSheet`, `MoshItemSheet`, `MoshSkillSheet` (`module/init.ts:14-18` and their defining files) | Same unit as the lang keys or its own — pure rename to `Mothership*`, matching the existing `MothershipActor`; verified by `npm run check` |
| `css/mosh.css` filename | Imported at `module/index.js:3`; dev-server rewrite at `vite.config.ts:25`; named in ~14 comments | With step 3 (§4.2) — rename to `css/mothership.css` in the same unit that layers it |
| "MoSh" prose | `CLAUDE.md`, the `foundry-mosh` skill, `docs/plans/*` | Final cleanup once the code is clean, so docs describe what exists |
| Test references | 25 `mosh` references across 10 test files | Each follows the surface it pins — no test edits ahead of the code they verify |

Worlds and shipped content are unaffected: the lang keys and class names never leave the
system's own files — `packs/_source/` carries zero `Mosh.*` references — and the system id
`mothershiprpg`, the only externally visible name, already changed.

### 4.7 The literal→token map — DS8's migration guide

Minted in DS6 (2026-08-15). When a component's styles dissolve, each literal snaps to its
token; neighbours collapse onto the ramp step listed. Per-site judgment stays with the DS8
executor under the baseline diff.

| Ramp step | Value | Absorbs |
|---|---|---|
| `--color-neutral-100` | `#f1f1f1` | |
| `--color-neutral-200` | `#e3e3e3` | `rgb(230,230,230)`, `rgb(226,226,226)`, `#ddd` |
| `--color-neutral-300` | `#bbbbbb` | `#c5c5c5`, `#b9b9b9` |
| `--color-neutral-400` | `#9e9e9e` | `#999`, `#9a9a9a` |
| `--color-neutral-500` | `#808080` | `grey`, `gray`, `rgb(129,129,129)` |
| `--color-neutral-600` | `#707070` | `rgb(112,112,112)`, `#777`, `rgb(100,100,100)` |
| `--color-neutral-700` | `#5c5c5c` | `rgb(92,92,92)` |
| `--color-neutral-800` | `#444444` | `#494949`, `#3d3d3d`, `rgb(56,56,56)`, `#363636` |
| `--color-neutral-850` | `#222222` | `#202020`, `rgb(25,25,25)`, `rgb(22,22,22)`, `#1a1915` |
| `--color-neutral-900` | `#111111` | |

Danger: `rgb(255,113,113)`→200, `rgb(151,100,100)`→300, `#aa0200`→400, `rgb(117,0,0)`→500.
Accents: `green`/`#18520b`→`--color-success-500`, `orange`→`--color-warning-500`.
Spacing snaps 3→2|4, 5→4|6, 7→6|8, 9→8|10, 11→12, 15→16. Radii (renamed in DS6b onto
live-tokens' nine-name scale): the 2–4px tail→`--radius-sm` (3px), 10/15/21→`--radius-md`/`-lg`/
`-xl`, `3em`/`100px` pills→`--radius-full`, `50%` circles stay literal (geometry, not scale).

Semantic aliases are preferred over raw ramp reads wherever a role exists. DS6b replaced DS6's
semantic singles with live-tokens' family tiers, so the roles are `--surface-<family>-<tier>`
(lowest→highest), `--border-<family>-<tier>` (faint→strong), `--text-<family>-<tier>`
(base→disabled), and the neutral text hierarchy `--text-primary`/`-secondary`/`-tertiary`/
`-muted`/`-disabled`/`-inverted`. Each tier reads the ramp step live-tokens chose for it, and
those choices were made against a dark ground: no surface tier holds white or `#f1f1f1`, so the
sheet's paper reads `--color-white` and its insets `--color-neutral-100` until a design decision
inverts the tiers. Components alias through their own Layer-2 tokens (§2.1) either way.

---

## 5. The decisions — resolved 2026-08-14

1. **Prefix or scope? → (c), the hybrid.** Keep the live-tokens vocabulary; rename only the two
   names Foundry defines, as `--font-sans-mothership` / `--font-serif-mothership` — **suffix,
   not prefix**, so category-first grep (`--font-*`) keeps working; ReignMaker's
   `--font-sans-rm` made the same choice under the same pressure. The alternatives lose:
   (a) a project prefix on everything buys nothing that the `.mothership`-scoped definition site
   doesn't already provide and forfeits the shared vocabulary; (b) is silently fragile the day
   Foundry mints a colliding name. The
   residual (c) risk — Foundry adding a colliding token in v15 — is handled by a **collision
   guard**: a check that intersects our defined token names with the installed Foundry build's
   and fails on any overlap (§4.4). That turns the one silent failure mode into a loud one.

2. **~~Instantiate the subset, not the inventory.~~ Superseded 2026-08-15 — carry the rich
   vocabulary; the stark look becomes values, not a trimmed vocabulary.** Mark's direction: the
   current black-and-white theme must stay *changeable* through the full live-tokens language,
   so MoSh vendors most of the 500-name Layer 1 inventory — full colour ramps for all families,
   the surface/text/border tiers, the complete typography set (sizes, weights, line heights,
   letter spacing, composite heading/body/code styles), spacing, the live-tokens radius scale,
   shadows, motion, and the utility tokens. Cuts are Mark's, marked in
   `docs/plans/token-inventory.md` (eyebrow, overlays, gradients pre-marked ❌ from his answer;
   the rest awaits his pass). The stark theme is expressed by the *values* — mostly at the
   semantic alias layer — so re-theming is an edit, not a build-out. DS6's 67-token set was
   landed under the old decision and is widened in DS6b, reconciling the few names that differ
   (`--text-inverse`→`--text-inverted`, the semantic `--surface-*`/`--border-*` singles onto
   live-tokens' family tiers, our focal radius/space/size values instantiated onto the full
   scales). Authoring stays a **static vendored `tokens.css`** — no theme-JSON build step now;
   Vite already carries it to release, and the live-tokens editor pipeline can bolt on later
   without rework (Mark: a build-to-release pipeline is acceptable if ever needed — ReignMaker
   works that way).

3. **No *runtime* theming machinery — but re-themability is now a goal (revised 2026-08-15).**
   `theme-light` stays pinned and no user-facing theme switcher ships; re-theming is a
   design-time act. What changed: it is no longer hypothetical — the full vocabulary (decision 2
   as revised) exists precisely so the stark theme can be swapped by editing values at the
   Layer-2 alias layer and the semantic tiers, with no vocabulary work. Components must
   therefore hold the alias discipline strictly: any component reading a raw palette ramp
   directly forfeits the retheme point.

4. **Sequencing: the R7 question is moot — R7 landed** (`bbfe33c`, 2026-08-13; the legacy
   remake is complete, R0–R7). Every component is already
   on the typed services, so step 5 is unblocked and nothing here interleaves with behaviour
   work. The surviving principle: behaviour and presentation never share a commit unit. The
   execution ledger (§8) carries the order.

5. **Split `test/ui-parts.test.ts`.** Keep the interactive-behaviour specs permanently; retire
   each primitive's class-name pin in the same unit that moves its styles into a scoped
   `<style>` block — the pin exists because the stylesheet is an unchecked contract, and scoping
   dissolves that reason component by component.

6. **Native CSS nesting, pure CSS.** Settled — the floor is confirmed (§4.3): Foundry v13's
   minimum Chromium 122 clears even relaxed nesting (120), and core already requires `@layer`.
   No SCSS returns to the repo.

---

## 6. Reading order for a cold start

1. `live-tokens/src/system/styles/CONVENTIONS.md` — the naming law, 185 lines
2. `live-tokens/src/system/styles/tokens.css:1-60` — the Layer 1 shape
3. `live-tokens/src/system/components/Button.svelte` — the Layer 2 alias pattern, and every
   Foundry incompatibility in §2.3 in one file
4. `pf2e-reignmaker/src/styles/variables.css:1-15` — the ID-scoped `:where()` fallback
5. `pf2e-reignmaker/src/styles/form-controls.css:1-20` — namespacing discipline under pressure
6. `css/mosh.css:125-230` — what we have now: branding, the bare `p`, the Boilerplate grid
7. `test/ui-parts.test.ts:1-10` — the comment explaining why the current hybrid needs a test

---

## 7. Review ledger — 2026-08-14

Five independent verification passes re-measured every checkable claim: the `css/mosh.css`
audit, the repo integration facts, the live-tokens repo, the ReignMaker repo, and the browser
floor. Verdict: **the document's structural findings and its proposal survive review intact**;
the corrections below are applied in place above.

**Confirmed exactly:** 2,043 lines, zero `@layer`, zero `var(--`, six `!important`,
`color: none` at line 2007, the four §1.2 rule sites, one `<style>` block in 52 components, all
shells carrying `mosh`/`themed`/`theme-light` (seven shells, counting `ClassSheetApp` via
inheritance, not six), all six chat templates opening with `class="mosh"`,
`svelte-dialog.ts:71` missing `mosh`, `screenshot: 'only-on-failure'` with zero
`toHaveScreenshot`, Foundry's layer-order declaration with **zero** unlayered rules (a
brace-depth scan; the unindented ProseMirror vendor block sits *inside* `@layer compatibility`),
398 Foundry custom properties, the `--font-body`/`--font-h*` aliasing off `--font-sans`, the
exact two-name collision {`--font-sans`, `--font-serif`}, the disjoint font-size scales,
ReignMaker's 322 tokens / 240 `!important` / zero `@layer` / zero Foundry collisions, and every
reason not to `npm install` live-tokens.

**Corrected:** live-tokens defines 500 distinct names, not 539, and no `--opacity-*` category
(§2.1); the ReignMaker vocabulary overlap is 153, not 156, and its ID scoping is partial
(§3); the palette is 46 literals, not ~30, with Font Awesome 6 Pro a third active family and a
24-value radius tail (§1.6); `sbt-*` is partially alive in `SheetHeader.svelte` (§1.3); the
`.macro-popup-dialog` radio styling is not a duplicate — no `.mosh` equivalent exists (§4.1).

**Unresolved measurement note:** grepping `test(`/`it(` finds 658 vitest and 109 e2e specs
against the documented 701/124 run counts; dynamic cases (`test.each`, loops) plausibly account
for the gap. Trust the runner's numbers.

**Settled:** the browser floor (§4.3) — `@layer`, native nesting (both syntaxes), and
`:where()` all clear Foundry v13's stated minimums, and core CSS already requires `@layer`.

**Addendum 2026-08-15 — §1.1's mechanism corrected.** The installed v14 defaults a system
stylesheet into the cascade: the server's view builder injects manifest styles as
`@import "…" layer(system)` when the manifest declares no layer (verified in
`dist/server/views/view.mjs` — `layer === undefined ? "system" : layer` — and rendered by
`templates/views/layouts/main.hbs`; `test/e2e/system-loads.spec.ts:23` had already recorded
this). So in production our 2,043 lines sit in **slot 8**, not above `exceptions`. Every §1.2
symptom stands — slot 8 still outranks core's `elements`/`blocks`/`applications`, and the
unscoped selectors still reach foreign surfaces — but DS7's `@layer system` wrap is a
cascade no-op versus core (it nests our rules into the `system.system` sub-layer). The wrap
still earns its place: the **Vite dev server** loads our CSS through the esmodule graph as
unlayered `<style>` tags, so dev currently renders with different cascade priority than
production; the explicit wrap converges the two. DS7's risk therefore concentrates in the
`.mothership` scoping, not the layering. One transitional guarantee, recorded for DS7/DS8:
while the built sheet mixes wrapped and unwrapped rules, direct-in-layer rules beat
`system.system` rules — harmless today because the only wrapped rules are `tokens.css`'s
custom properties, which conflict with nothing; DS7 wraps the remainder in one unit.

**Addendum, same day:** the scope class and token suffix renamed from `mosh` to `mothership` at
Mark's direction — `ms` was rejected for its two established CSS meanings (§4.1, decisions
1–2). Mark then widened the scope: **every** existing `mosh` identifier migrates — CSS class,
lang root key, `Mosh*` symbols, the `css/mosh.css` filename, and eventually the prose name.
The measured inventory and unit boundaries are §4.6; CLAUDE.md and the `foundry-mosh` skill no
longer describe `.mosh`/`Mosh.*` as kept.

---

## 8. Execution — the protocol and the ledger

This plan executes across sessions with no shared memory: **the plan is the state.** One
orchestration session (Fable) runs the ledger; each unit is delegated to an executor subagent,
reviewed as a diff, gated, committed with its ledger row update, and only then does the next
unit start. This section is self-contained on purpose — the earlier run-to-the-end protocol was
written for one plan (and deleted with it), not as standing law; what applies here is restated
here in full.

**Recovery:** if the orchestration session is lost, resume any fresh session with:

> Read `docs/plans/design-system.md` in full. Execute the next `pending` unit from the §8
> ledger, following the §8 protocol. Stop at the unit's gate — do not start the next unit.

An interrupted unit shows `in-progress` with no commit; diff the working tree against the
unit's description before continuing.

### Rules for every delegated unit

1. **Base check first.** `git log --oneline -1` — confirm HEAD is the ledger's last commit
   before writing anything.
2. **Visual work is verified visually.** Once DS3's baselines exist, no unit that changes a
   stylesheet or a `<style>` block lands on green greps alone — the orchestrator reviews the
   screenshot diff and accepts or rejects each pixel change deliberately.
3. **Executors never run `npm run test:e2e` or `playwright`.** One Foundry, one data dir, one
   port — the orchestrator runs that tier serially, and it cannot run at all while the desktop
   Foundry is open.
4. **The class names in `test/ui-parts.test.ts` are pinned contracts.** A unit that renames or
   retires one updates the pin in the same diff, names the change in its report, and never
   works around a pin to get green.
5. **Components read their own Layer-2 tokens only** (the §2.1 alias discipline). No raw
   palette values in component styles; after DS6 lands, no new colour literals outside
   `tokens.css`.
6. **No new `!important`; no rule outside `@layer`** except `@font-face`. The DS6 guard tests
   enforce both — a unit never weakens a guard to pass it.
7. **Behaviour and presentation never share a commit unit.**
8. **Executors do not edit `CLAUDE.md`, the skill, or this plan** except their own ledger row.
   The orchestrator writes the record.
9. **Report what you could not verify**, explicitly, alongside files changed and exact
   `npm run check` / `npm test` output.

### The gate — before a unit's commit

1. Read the diff in full; assume the report is optimistic; re-verify its factual claims.
2. `npm run check` · `npm test` · `npm run build`.
3. `npm run test:e2e` serially, for any unit that changes what renders.
4. For stylesheet units: the baseline diff review (rule 2).
5. Mutation-check any new guard or spec — break the behaviour it claims to cover, watch it fail.
6. Commit with the ledger row update in the same commit.

### Model policy

Assignment is by hazard, not size. **Sonnet** takes mechanical units with greppable
done-conditions and no visual risk. **Opus** takes anything with judgment in it — deletion
calls, cascade changes, per-component restyling. **Fable (the orchestrator)** designs the token
set (decision 2), accepts baselines, reviews every diff, runs e2e, and commits.

### Progress ledger — the authoritative state

| Unit | Model | Status | Commit | Notes |
|---|---|---|---|---|
| DS1 — lang keys `Mosh.*` → `Mothership.*` | Fable (direct) | done | `61e2e42` | Root key + 461 refs + escaped regex forms + stale `Mosh.macro.*` comment. check clean · 753 vitest · grep 0. e2e not run (Foundry open — rule 3's constraint); rides the next e2e-gated unit. Found: `itemRoll.html`'s dead `MajorRepair`/`MinorRepair` branch (§4.6). |
| DS2 — symbols `Mosh*` → `Mothership*` | Sonnet | done | `cb52121` | The five sheet classes, **plus the nine TypeDataModel classes the §4.6 inventory missed** — the `Mosh[A-Z]` done-condition caught them. The models took a `Model` suffix (`MothershipItemModel`, …, matching their `*-models.js` filenames) because `MothershipItem`/`MothershipActor` already name the document classes. 13 files, 51 lines. Gate: check clean · 753 vitest · build green · grep `Mosh[A-Z]` = 0 (incl. `content/`). e2e not run (pure rename, renders nothing differently; Foundry open). Commit hash backfilled at DS4. |
| DS3 — visual baselines | Opus authors · Fable accepts | done | | `test/e2e/visual-baselines.spec.ts`: 16 tests, **17 baselines** — 7 windows (character sheet ×2 tabs, item sheet ×2 types) + 6 cards + the skill-check dialog; `maxDiffPixels: 0`, element screenshots, rigged dice, masked timestamps, fonts awaited. Two hard-won determinism fixes: (1) the e2e world now boots with **`safeMode` armed on every setup** (`scripts/setup-test-env.ts`) — the cloned Data dir had flip-timer (+ the two licence-excluded modules) *enabled*, and any module CSS/overlay poisons pixels; (2) the spec's teardown closes only `hasFrame` apps — closing everything in `foundry.applications.instances` deletes Foundry's own frameless UI (Sidebar/Hotbar/…), which is what actually failed 3 of 16 in run 1. **Known issue flagged for a follow-up unit: all 15 other e2e spec files run the same unfiltered close loop** and currently pass only because nothing asserts on the interface DOM afterward. Gate: runs A and B byte-identical (shasum over all 17), orchestrator reviewed the images. Plain 126-spec e2e also green earlier at `fcc391a` (discharges DS1's deferred e2e). **DS5 and DS7 unblocked.** |
| DS4 — scope class everywhere | Sonnet | done | | Re-measured: **16 edit sites**, not 18 — six `classes:` arrays (Class/Skill sheets inherit ItemSheetApp's), the `svelte-dialog.ts` CLASSES const, six chat templates, three Svelte roots. `mothership` added first, `mosh` kept; the Tabs pin in `test/ui-parts.test.ts:479` updated in the same diff (rule 4). Nothing selects `.mothership` yet, so no visual change by construction. Gate: check clean · 753 vitest · build green. Noted for DS9: `MOUNT_CLASS = 'mosh-dialog-root'` (`svelte-dialog.ts:73`). |
| DS5 — dead CSS dies | Opus | pending | | After DS3. Checked-in audit script first (the one-off audit false-positived `sbt-*`, §1.3); then delete the dead lines, the `.window-app` rules, `color: none`. `sbt-*` survivors are renamed in DS8's SheetHeader unit, not here. Gate: baselines unchanged. |
| DS6 — `tokens.css` + guards | Fable designs · Opus authors | done | | **67 tokens** in `css/tokens.css`, custom properties only (no style rules — the font fallback rule waits for DS7's baseline review), imported ahead of `mosh.css` in `module/index.js`; no dev-server rewrite needed (tokens.css travels the esmodule graph, verified live). `test/css-guards.test.ts`: `!important` ceiling 6, unlayered-zero for tokens.css (the mosh.css twin is `it.skip` until DS7 — un-skipped it fails on 248 preludes today, so it is real), collision guard vs the installed build's `foundry2.css` (`FOUNDRY_APP` resolution as in `start-test-env.sh`, visible skip off-machine, size floors against silent parser death). All guards mutation-checked by executor and orchestrator independently. Gate: check clean · 756+1skip vitest · build green; dist opens with `@layer system{.mothership{`. §4.7 records the literal→token map for DS8. |
| DS6b — widen Layer 1 to the rich vocabulary | Fable maps · Opus authors | done | | **402 tokens** (Mark's marks: 398 kept of 500 — cut code, eyebrow, shadow scale, ring-focus, motion, z, icon-size, blur, scale, dot-size, overlay, columns, page, shimmer; + 4 MoSh additions `--font-icon`, `--shadow-glow`, `--shadow-glow-soft`, `--ring-danger`). Stark values: neutral ramp = measured greys; danger/success/warning interpolated in OKLCH through byte-exact measured anchors; alternate/canvas/brand/accent/info/special vendored verbatim as replaceable swatches. Suffix policy final: only `--font-sans-mothership`/`--font-serif-mothership` (Foundry uses `--font-monospace`/`--font-awesome`, so `--font-mono`/`--font-icon`/`--font-display` are free). Renames (0 consumers): `--text-inverse`→`--text-inverted`, semantic singles→family tiers, radius onto the nine-name scale (sm 3 · md 10 · lg 15 · xl 21 · full 999). **Parked design call (§4.7): the vendored tier→step choices assume a dark ground — no surface tier holds white; decide tier inversion at DS8's first component.** Guards: collision ∅ over 402∩398, `ours` floor raised 50→350, mutation-checked. `token-inventory.md` deleted. Gate: check clean · 756+1skip · build green. |
| DS7 — layer and scope the sheet | Opus | pending | | After DS3, DS4, DS6. Wrap in `@layer system`; scope the 36 global rules under `.mothership`; rename `css/mosh.css` → `css/mothership.css` (`module/index.js:3`, `vite.config.ts:25`, ~14 comments). Corrected risk profile (§7 addendum 2026-08-15): the `@layer` wrap is a cascade no-op vs core in production (the sheet already rides `layer(system)` via the server's import default) but converges dev with prod; the risk lives in the `.mothership` scoping. Gate: full e2e + baseline diff review, rule 2 at full strength. |
| DS8 — dissolution, per-component series | Opus per unit | pending | | After DS6, DS7. One component (or coherent group) per commit: styles into scoped `<style>`, reading its own Layer-2 tokens; its `ui-parts` pin retired in the same diff (rule 4); fork-era class names it owns renamed (`sbt-*` in `SheetHeader`). R7 landed 2026-08-13, so nothing here waits on behaviour work. This row accumulates one note per landed component. |
| DS9 — retire `mosh`, sweep the prose | Sonnet + orchestrator | pending | | Last. Drop `mosh` from every `classes` array; final grep proves zero `mosh` in code; then the prose — CLAUDE.md, the `foundry-mosh` skill, docs — says `mothership` everywhere it described the old names. |

Dependencies: DS2 and DS4 any time; DS3 before DS5 and DS7; DS6 before DS7; DS6b before DS8;
DS7 before DS8; DS9 last. DS1, DS2, DS4, DS6 are done.
