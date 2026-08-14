# MoSh — project rules

The unofficial **Mothership** system for Foundry VTT. A Foundry **system** (not a module):
`system.json` is the manifest, `module/index.js` the esmodule (css + `init.ts`), built by Vite to
`dist/mothershiprpg.{js,css}`, plus compendium content built from JSON in `packs/_source/`.

**Detailed conventions live in the `foundry-mosh` skill** (`.claude/skills/foundry-mosh/`) —
the v14 API surface, Svelte-in-ApplicationV2, the test tiers, packs, and the build. Consult
it for any of those; it loads on demand so this file stays short. Here: only the hard rules
and what is specific to this repo.

Code style: global `~/.claude/CLAUDE.md` — comment only the non-obvious *why*.

## Where the project is

**The goal: our own implementation of Mothership 1e, complete and faithful to the Player's
Survival Guide, containing nothing else — then extend one book at a time.** The Warden's
Operations Manual is next; the Shipbreaker's Toolkit brings ships back.

**The plan is `docs/plans/psg-core.md`** for content and sheets — read that for what to do next.
**`docs/plans/legacy-remake.md`** is the sibling plan for the runtime core: `module/actor/actor.js`
and the macro half of `module/mosh.js` were remade as typed services rather than refactored
(R0–R6 done, R7 — the sheets adopting them — pending); its own progress ledger is authoritative
for that work, and it superseded psg-core's S9 item "the `actor.js` split". `docs/plans/architecture.md`'s
phases 1–3 are further back still (Decisions 1–4 there stand; 5–7 do not). `docs/plans/evidence.md`
holds the measurements; `docs/plans/run-to-the-end.md` holds how a unit is delegated and gated
(its ten standing rules and review gate are current; its *wave order* is superseded by both plans'
own ledgers). **Git history is the record of what happened** — `git log -S"<symbol>"` finds the
commit that introduced or removed anything, with the diff and the reasoning attached. Durable
knowledge belongs in a test, in a comment at the site, or in the Gotchas below; not in a prose log.

**Ships, the Calm/android panic variants and all unsourced content were cut** and live on
master's own history at ancestor `11eee67` (the archive refs were trimmed 2026-08-13 — a label
on an ancestor preserves nothing history doesn't; `git show 11eee67:<path>` recovers any cut
file). Nothing was destroyed; ships return as an
additive book tier. **Do not re-add content without a book behind it.**

**Port, verify, ship, and record the compromise.** Conversions deliberately keep AppV1-era
shapes so each carries no visual risk; a Svelte best-practices audit is queued as S9.
Don't fix component architecture piecemeal mid-phase — note it there instead.

| Done | Not done |
|---|---|
| Vite build, TS tooling, CI | the Svelte best-practices audit — S9 |
| DataModels for the 9 surviving types | |
| Packs generated from the book, 0e removed | |
| Svelte 5 wired into build, check, vitest | |
| **Every item sheet on ApplicationV2 + Svelte** | |
| **The creature sheet, on shared sections** | |
| **The character sheet — no AppV1 class, no sheet template left** | |
| Shared components in `module/ui/parts/`, sections in `parts/sections/` | |
| 0e / `firstEdition` rules removed | |
| `creature-settings` on ApplicationV2 | |
| The PSG cut — 13,337 lines removed | |
| **274 documents generated from the PSG** | |
| Both class adjustments are real `SchemaField`s | |
| **The character generator, on a draft store** — no `FormApplication` left | |
| **Conditions preselect the roll they name** | |
| **The runtime core remade — `actor.js`/`mosh.js` gone for typed services** | the sheets designed around them, not just compiled against — R7 |

## Hard rules (override defaults)

- **v14 only in new code.** Everything under `foundry.*`. No bare `Application` /
  `FormApplication` / `Dialog` / `duplicate` / `mergeObject` — those are deprecated with a
  **v16** removal. New windows are ApplicationV2, dialogs DialogV2, data
  `foundry.abstract.TypeDataModel`. Existing v1 code is mid-migration: don't add to it;
  when you touch a v1 class, prefer converting it whole.
- **TypeScript for tooling, and for the runtime core.** `*.config.ts`, `scripts/*.ts`,
  `test/**/*.ts` **and `module/**/*.ts`** are checked by `npm run check`. Node ≥22.18 runs `.ts`
  scripts directly — no `tsx`/`ts-node`.
  **`docs/plans/legacy-remake.md` decision 2, landed R0–R5:** the runtime core was remade in
  TypeScript, not migrated — `actor/actor.js`, `mosh.js`, `item/item.js` and the old `settings.js`
  are **gone**, deleted at the R5 swap, replaced by typed modules under `module/` (`documents/`,
  `checks/`, `mutation/`, `rolls/`, `tables/`, `chat/`, `api/`, …). Nothing was translated
  file-by-file; there is no per-file `// @ts-check` migration. `module/ui/**` stays
  `.js`/`.svelte`, `checkJs: false` — R7 is next there, not a JS→TS pass.
- **Verify, don't eyeball.** Every change runs the tier that covers it (below). Don't report
  work as done on an untested edit. If a green run surprises you, suspect the harness.

## Commands

```bash
npm run build            # vite → dist/
npm run setup            # dev install: symlink scaffold (packs are COPIED — re-run after packing)
npm run deploy           # release rehearsal: link-free copy, same shape as the zip
./scripts/packs.sh pack  # packs/_source/*.json → LevelDB (close Foundry first)
npm run content -- --allocate  # content/books/** -> packs/_source/** (--allocate mints new ids)
npm test                 # 701 vitest specs — the CI tier
npm run check            # tsc over the .ts surface, then svelte-check over module/ui
npm run test:e2e         # 124 Playwright specs vs a real headless Foundry
```

A fresh clone needs `npm ci && npm run build && ./scripts/packs.sh pack` — both `dist/` and
`packs/` are gitignored build output.

## This repo's specifics

- **System id `mothershiprpg`** — keys settings, flags, pack names
  (`mothershiprpg.<pack>`), the runtime path `systems/mothershiprpg/…`, **and the public API
  `game.mothershiprpg`**. One string identifies the package everywhere. The `.mosh` CSS classes
  and `Mosh.*` lang keys are internal and kept.
- **`game.mothershiprpg` is the public API.** The verb surface — `rollStat`, `rollSkill`,
  `rollWeapon`, `rollTable`, `modify`, `applyItem`, `promptStress`/`promptSave`/`promptWound`,
  `rollItem`, … (`module/api/api.ts`) — is what shipped macros and new content call.
  `rollItemMacro`/`initRollTable`/`initRollCheck`/`initModifyActor`/`initModifyItem`/
  `noCharSelected` and the legacy actor methods survive as a deprecated shim (`module/api/legacy.ts`)
  for macros already imported into worlds. **Changing either surface's signature breaks something** —
  grep `packs/_source/` for the new verbs, `test/api-legacy.test.ts` pins the old ones.
- **Strings** live in `lang/en.json` under `Mosh.*`; there is a `pt-BR` translation too.
- **`css/mosh.css` is hand-authored, not compiled.** There is no SCSS step (the `scss/` tree
  was 17 months stale and was deleted). As sheets become Svelte, styles move into scoped
  `<style>` blocks.
- **`template.json` is inert but kept on purpose** — it is the oracle the DataModel
  equivalence tests compare against. Changing a schema means changing both, deliberately.
- **New UI lives in `module/ui/`** — an ApplicationV2 shell per window plus Svelte 5
  components (runes mode is forced on). The conventions: the document stays the source of
  truth, Foundry persists the form, mount once.
- **`module/ui/parts/` holds the shared primitives** — `ItemList`/`ItemRow`/`ItemCell`/
  `ItemControls`/`ItemControl`, `Tabs`/`TabPanel`, `CircleStats`/`CircleStat`, `MainStat`,
  `Field`, `CheckField`, `Editor`, `SheetHeader`, plus the `dropTarget` attachment. Build a conversion
  out of these before writing bespoke markup. They emit the **global** class names from
  `css/mosh.css` on purpose and carry no `<style>` blocks; `test/ui-parts.test.ts` pins every
  one of those class names, because the stylesheet is a contract no compiler checks.
- **Manifest URLs point at `rune-goblin`**. `manifest` must stay on
  `/releases/latest` or Foundry can never detect an update; `download` is version-specific and
  is stamped by `release.yml` from the tag — don't hardcode it.

## Not in scope

- **Both third-party content modules are dropped from the merge**.
  `mothership-survival-guide` is GPL-3 (absorbing it would relicense this MIT system) and
  `mothership-character-builder` declares no licence and is Naurgul's. Only rune-goblin's own
  extraction merges. Don't merge content whose provenance is unsettled.

## Gotchas

- **Check that a "source" is really the source.** Two dead sources have already been found
  and deleted (`scss/`, `_macros/`), each duplicating something that had moved on. Before
  building from any input, verify it produces what actually ships.
- **`packs/_source/**` is generated — do not hand-edit it.** The real source is
  `content/books/psg/*.ts` (typed catalogs); `npm run content` emits the pack sources and
  `packs.sh pack` compiles them. `packs/` and `dist/` are never committed; `packs/_source/` is.
- **A sheet can bind a field no schema declares.** A `SchemaField` cleans off keys it does not
  know, so the write is accepted and silently discarded. That is how the DataModel migration
  stopped armour from equipping; twelve such fields were found and restored.
  `test/sheet-bindings.test.ts` pins all 13 types.
- **Foundry holds an exclusive LevelDB lock** on every pack it can see; `packs.sh` refuses
  to run while it is open. That guard is deliberate.
- **`packs.sh pack` never deletes — not a pack, and not a document.** `fvtt package pack` writes
  and updates LevelDB keys; it removes nothing. So **deleting a source JSON does not delete the
  document**: it stays in the compiled pack and Foundry keeps serving it. A whole pack whose
  source is gone survives the same way. Both `packs/` and the e2e tree's
  `test/foundry-data/Data/systems/mothershiprpg/packs/` are affected, and they are separate
  copies. **After removing any source document, `rm -rf` the compiled pack directories in both
  places and re-pack from scratch** — otherwise every count assertion passes against ghosts.
- **Never hand-edit `test/foundry-data/.../packs` — it is rebuilt on every e2e boot.**
  `start-test-env.sh` runs `setup-test-env.ts` before each launch, which re-clones the system
  **from your live Foundry Data dir**. So the real sequence after changing pack *sources* is:
  `./scripts/packs.sh pack` → **`npm run setup`** (refreshes the live Data dir, which is where
  the harness clones from) → `npm run test:e2e`. Skipping `npm run setup` means the suite keeps
  testing the packs from whenever you last ran it, no matter what you do to the test tree.
  Together with the point above this cost four e2e cycles during the PSG cut. `npm run test:e2e`'s
  script runs all three steps itself now (audit C5) — this trap is only live if you run
  `packs.sh` and `playwright test`/`test:e2e:run` by hand instead.
- **A killed e2e run leaves a lock, not an occupied session** (this entry used to say the
  opposite). Foundry locks its data dir as `Config/options.json.lock`, a **directory**, and only
  releases it on a clean exit; `kill -9` leaves it behind and the next boot dies with *"already
  locked by another process"*, which Playwright reports as the contentless `webServer was not able
  to start. Exit code: 1`. Freeing the port does **not** clear it — which is why the old advice
  here appeared to fail. `start-test-env.sh` now clears a stale lock itself (port free ⇒ stale),
  so prefer `npm run test:e2e` over a hand-started server, and kill with **`kill`** rather than
  `kill -9` so Foundry unlocks on its way out.
- **`prepareDerivedData` mutates `this.system` in place.** Assert stored data with
  `doc.toObject().system`, never `doc.system`.
- **`Actor.create` returns `undefined` on a validation failure** — it does not throw.
- **Update paths are `system.*`.** The `data.` alias was removed in v10; six updates were
  still using it and silently doing nothing.
- **History was rewritten** (`git filter-repo`, to drop 854 MB of committed release zips) and
  has now been **force-pushed**; `master` tracks `origin/master`, so plain `git push` works.
  The pre-rewrite history is gone from both the remote and this clone.
  Anyone holding an older clone must re-clone.
