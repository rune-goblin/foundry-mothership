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
system, not a module. The service core is TypeScript, remade whole (the legacy remake,
R0–R7, complete); the UI layer above it (`module/ui/`) is still plain
JavaScript and Svelte, mid-migration.**

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
| Shared components | ✅ `module/ui/parts/` — build conversions out of these |
| Item sheets | ✅ every type — the 8 simple ones (`module/ui/item/`), `skill`, `class` |
| Windows | ✅ ApplicationV2 throughout — no `FormApplication` subclass left |
| Actor sheets | ✅ both — `module/ui/actor/` and `module/ui/creature/`, on the shared sections |
| Templates | ✅ `templates/` holds 6 chat cards; no dialog partials left — dialogs are Svelte, mounted through `dialogs/svelte-dialog.ts` |
| Runtime core | ✅ remade in TypeScript — `documents/`, `checks/`, `mutation/`, `rolls/`, `tables/`, `chat/`, `api/`; `actor/actor.js` and `mosh.js` are gone |

**Phase 4 is complete** — no `foundry.appv1.*` class remains. New code
has no v1 precedent to copy, so don't introduce one.

**2. TypeScript for tooling — and for every new runtime module.** `vite.config.ts`,
`vitest.config.ts`, `playwright.config.ts`, `scripts/*.ts`, `test/**/*.ts` **and
`module/**/*.ts`** are TypeScript, checked by `npm run check`. Node ≥22.18 strips types, so
scripts run under plain `node` with no `tsx`.

**The runtime core is TypeScript now, not migrated but remade** (the legacy remake, R0–R7;
`git log --grep='^R[0-9]'` has the record) — Vite compiles `.ts` into the same bundle.
`module/actor/actor.js`, `mosh.js`, `item/item.js` and the old `settings.js` are **gone**,
deleted at the R5 swap and replaced by `documents/`, `checks/`, `mutation/`, `rolls/`,
`tables/`, `chat/`, `api/` and their neighbours. Nothing was translated file-by-file; there is
no per-file `// @ts-check` migration. `module/ui/**` stays `.js`/`.svelte` — the sheets adopted
the services at R7. The design system landed on top of that, so the remaining UI work is the
last shared tier in `css/mothership.css`, not a JS→TS pass.

## Reference files — read the one that fits

- **`references/foundry-api.md`** — the `foundry.*` surface, `game.*`, hooks, documents,
  flags, settings, the packs runtime API.
- **`references/svelte-in-applicationv2.md`** — the pattern every window in this system now
  uses: the ApplicationV2 shell that mounts a Svelte 5 component, the document store, and what
  a conversion has to preserve.
- **`references/testing.md`** — the two tiers (vitest / Playwright), what each proves,
  commands, and how to check the harness is healthy before believing a green run.
- **`references/packs.md`** — compendium content: `scripts/packs.sh`, the JSON sources, the
  LevelDB lock, and why `packs/` is never committed.
- **`references/build.md`** — the Vite lib build, `npm run setup`'s symlink scaffold, and
  what does and does not ship.

## Essentials worth knowing without opening a file

**Identity.** System id `mothershiprpg` (renamed from `mosh`). It keys
settings (`game.settings.get('mothershiprpg', …)`), flags, and pack names
(`mothershiprpg.<pack>`). Foundry serves the system at `systems/mothershiprpg/…` — that is the
path templates and art use at runtime. The `.mosh` CSS classes and `Mosh.*` lang keys are
gone: the scope class is `.mothership` and the lang root `Mothership.*`. Never name anything
new `mosh` or `ms`.

**Public API.** `game.mothershiprpg` is the verb surface (`module/api/api.ts`) — `rollStat`,
`rollSkill`, `rollWeapon`, `rollPanic`, `rollRestSave`, `rollTable`, `modify`, `applyItem`,
`promptStress`/`promptSave`/`promptWound`, `rollItem`, … — what shipped macros and new content
call. The legacy names (`rollItemMacro`, `initRollTable`, `initRollCheck`, `initModifyActor`,
`initModifyItem`, `noCharSelected`) and the old actor methods survive as a deprecated shim
(`module/api/legacy.ts`) for macros already imported into worlds. **Changing either surface's
signature breaks something** — grep `packs/_source/` for the new verbs, `test/api-legacy.test.ts`
pins the old ones.

**Localization.** `lang/en.json` under `Mosh.*`, read with `game.i18n.localize/format`.
There is also a `pt-BR` translation; don't orphan keys.

**Derived data.** `MothershipActor.prepareDerivedData()` (`module/documents/actor.ts`) dispatches
to `_deriveCharacter`/`_deriveCreature`, which **mutate `this.system` in place** (armour mod/total,
net HP, bleeding — shared helpers both call). Consequence: when asserting *stored* data use
`doc.toObject().system`, not `doc.system`.

**The roll pipeline.** `module/rolls/` now — `actor.js`'s `parseRollString`/`parseRollResult` are
gone (the legacy remake, R0). `rolls/parse.ts`'s `parseRollSpec` turns `1d100[+]`/`[-]`
into a `RollSpec` (die, count, sign, advantage, aim) and a Foundry keep formula; `rolls/resolve.ts`'s
`resolveOutcome` is the pure function that turns an evaluated `Roll` into an `Outcome` — zero-based
dice, the 90+ auto-failure, doubles-as-criticals, advantage/disadvantage crit preference — without
touching the `Roll` itself. `checks/checks.ts` orchestrates a check end-to-end on top of both.
All are unit-tested — the tests are still the spec.

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
- **A killed e2e run leaves a data-dir lock, not an occupied session** (this entry used to say
  the opposite). `Config/options.json.lock` is a directory Foundry frees
  only on a clean exit, and freeing the port does not clear it. `start-test-env.sh` clears a stale
  one itself, so prefer `npm run test:e2e` over a hand-started server and kill with **`kill`**.
- **Foundry holds an exclusive LevelDB lock** on every pack it can see. `scripts/packs.sh`
  refuses to run while Foundry is open; that guard is deliberate.
