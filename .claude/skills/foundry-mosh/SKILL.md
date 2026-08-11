---
name: foundry-mosh
description: >-
  Authoring the MoSh Foundry VTT **system** (Mothership RPG) — targeting Foundry v14 APIs
  only (ApplicationV2 / DialogV2 / DataModel — never the v1 namespace), with Vite, vitest
  and a Playwright harness. Use whenever working in this repo: system.json, the module/
  esmodule, sheets and windows, hooks, settings, DataModels, compendium packs, the Vite
  build, or the test tiers. Trigger even when the user only mentions Foundry, a sheet, a
  compendium, ApplicationV2, Svelte, or system.json — don't wait to be named.
---

# MoSh — Foundry system authoring

Conventions and APIs for the MoSh Mothership system. Adapted from the runegoblin
`foundry-pf2e` skill; the differences are called out because they matter — **this is a
system, not a module, and its runtime code is still plain JavaScript mid-migration.**

## Two rules that override defaults

**1. v14 only — no v1 APIs in new code.** Everything under `foundry.*`. Never bare
`Application` / `FormApplication` / `Dialog` / `duplicate` / `mergeObject` — those globals
are `@deprecated since v13 until v16`. Windows are **ApplicationV2**, dialogs **DialogV2**,
structured data `foundry.abstract.TypeDataModel` + `defineSchema()`.

**But read the state of play before you write.** Existing code is mid-migration:

| Surface | State |
|---|---|
| DataModels | ✅ done — all 13 types, `module/data/{actor,item}-models.js` |
| Dialogs | ✅ DialogV2 throughout |
| Namespacing | ✅ `foundry.utils.*`, `foundry.documents.collections.*` |
| Svelte | ✅ wired into vite, `npm run check`, vitest — runes mode forced on |
| Shared components | ✅ `module/ui/parts/` — build conversions out of these, see `MODERNIZATION.md` §20 |
| Item sheets | ✅ the 8 simple types (`module/ui/item/`) and `skill` (`module/ui/skill/`) |
| **Sheets** | ❌ 6 classes still `foundry.appv1.sheets.*` with `getData`/`activateListeners` |
| **Windows** | ❌ 4 still the bare `FormApplication` global with `_updateObject` |
| **Templates** | ❌ 27 Handlebars `.html` files |

Converting those is phase 4 (see `MODERNIZATION.md`). Don't add new v1 code; when you
*touch* a v1 class, prefer converting it whole over extending it.

**2. TypeScript for tooling; the runtime is still JS.** `vite.config.ts`,
`vitest.config.ts`, `playwright.config.ts`, `scripts/*.ts` and `test/**/*.ts` are
TypeScript, checked by `npm run check`. `module/**/*.js` is plain JS and **not**
type-checked (`checkJs: false`). Converting it is phase 5 — flip `// @ts-check` per file as
you go. Node ≥22.18 strips types, so scripts run under plain `node` with no `tsx`.

## Reference files — read the one that fits

- **`references/foundry-api.md`** — the `foundry.*` surface, `game.*`, hooks, documents,
  flags, settings, the packs runtime API.
- **`references/svelte-in-applicationv2.md`** — the phase 4 workhorse: the ApplicationV2
  shell that mounts a Svelte 5 component, and how to convert one of this system's AppV1
  sheets into it without losing behaviour.
- **`references/testing.md`** — the two tiers (vitest / Playwright), what each proves,
  commands, and how to check the harness is healthy before believing a green run.
- **`references/packs.md`** — compendium content: `scripts/packs.sh`, the JSON sources, the
  LevelDB lock, and why `packs/` is never committed.
- **`references/build.md`** — the Vite lib build, `npm run setup`'s symlink scaffold, and
  what does and does not ship.

## Essentials worth knowing without opening a file

**Identity.** System id `mothershiprpg` (renamed from `mosh`; `MODERNIZATION.md` §18). It keys
settings (`game.settings.get('mothershiprpg', …)`), flags, and pack names
(`mothershiprpg.<pack>`). Foundry serves the system at `systems/mothershiprpg/…` — that is the
path templates and art use at runtime. The `.mosh` CSS classes and `Mosh.*` lang keys are
internal and were deliberately kept.

**Public API.** `game.mothershiprpg` holds the macro entry points (`rollItemMacro`, `initRollTable`,
`initRollCheck`, `initModifyActor`, …). Compendium macros call these, so **changing a
signature breaks shipped content** — grep `packs/_source/` before you do.

**Localization.** `lang/en.json` under `Mosh.*`, read with `game.i18n.localize/format`.
There is also a `pt-BR` translation; don't orphan keys.

**Derived data.** `MothershipActor.prepareDerivedData()` dispatches to
`_deriveCharacter` / `_deriveCreature` / `_deriveShip`, which **mutate `this.system` in
place** (armour mod/total, net HP, bleeding). Consequence: when asserting *stored* data use
`doc.toObject().system`, not `doc.system`.

**The roll pipeline.** `parseRollString` translates `1d100[+]`/`[-]` into a Foundry keep
formula; `parseRollResult` (≈400 lines) resolves zero-based dice, the 90+ auto-failure,
doubles-as-criticals, and advantage/disadvantage crit preference. Both are unit-tested —
if you change either, the tests are the spec.

**Authoritative docs.** https://foundryvtt.com/api/ (pick the v14 build). The installed
app at `/Applications/Foundry Virtual Tabletop.app/Contents/Resources/app/public/scripts/foundry.mjs`
is the ground truth — grep it rather than guessing about an API.

## Gotchas that have already cost time

- **Check whether a "source" is actually the source.** `scss/` was dead for 17 months while
  `css/mosh.css` was hand-edited; `_macros/` duplicated the pack sources. Both were deleted.
  Before building from any input, verify it produces what ships.
- **`css/mosh.css` is hand-authored, not compiled.** There is no SCSS step. As sheets become
  Svelte components their styles should migrate into scoped `<style>` blocks.
- **`packs/` is build output** — never commit it. Sources are `packs/_source/**/*.json`.
- **`template.json` is inert but kept deliberately** — it is the oracle the DataModel
  equivalence tests compare against. Changing a schema means changing both, on purpose.
- **A killed e2e run leaves the GM session occupied** and the next run hangs 30s then fails
  in `globalSetup`. Fix: `lsof -ti:30005 | xargs kill -9`, then wait for the port to actually
  free — a fixed `sleep` is not enough.
- **Foundry holds an exclusive LevelDB lock** on every pack it can see. `scripts/packs.sh`
  refuses to run while Foundry is open; that guard is deliberate.
