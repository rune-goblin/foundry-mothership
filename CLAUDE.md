# MoSh — project rules

The unofficial **Mothership** system for Foundry VTT. A Foundry **system** (not a module):
`system.json` is the manifest, `module/mosh.js` the esmodule, built by Vite to
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

**The plan is `docs/plans/psg-core.md`** — read that for what to do next. It supersedes
`docs/plans/architecture.md`'s phases 1–3 (Decisions 1–4 there still stand; 5–7 do not).
`docs/plans/evidence.md` holds the measurements; `docs/plans/run-to-the-end.md` holds how a unit
is delegated and gated (its ten standing rules and review gate are current; its *wave order* is
superseded). `MODERNIZATION.md` is the **record**: §10 the item-sheet conventions, §20 the
component layer, §22 the windows, §24 phase 0, §25 the PSG cut, §26 the content pipeline, §27 the
TypeScript catalogs and the generated content, §28 the class-adjustment schema and the last AppV1
item sheet, §29 the character generator on a draft store, §30 the creature sheet and the section
tier. Update it as work lands.

**Ships, the Calm/android panic variants and all unsourced content were cut** (§25) and live on
the pushed **`archive/pre-psg-cut`** branch and tag. Nothing was destroyed; ships return as an
additive book tier. **Do not re-add content without a book behind it.**

**Port, verify, ship, and record the compromise.** Conversions deliberately keep AppV1-era
shapes so each carries no visual risk; a Svelte best-practices audit is queued as S9 (§23).
Don't fix component architecture piecemeal mid-phase — note it in §23 instead.

| Done | Not done |
|---|---|
| Vite build, TS tooling, CI | 1 AppV1 sheet class (`actor-sheet.js`) — S7 |
| DataModels for the 9 surviving types | 10 Handlebars templates, 1 of them a sheet |
| Packs generated from the book, 0e removed | conditions do not affect any roll — S8 |
| Svelte 5 wired into build, check, vitest | |
| **Every item sheet on ApplicationV2 + Svelte** (§28) | |
| **The creature sheet, on shared sections** (§30) | |
| Shared components in `module/ui/parts/`, sections in `parts/sections/` | |
| 0e / `firstEdition` rules removed | |
| `creature-settings` on ApplicationV2 (§24) | |
| The PSG cut — 13,337 lines removed (§25) | |
| **274 documents generated from the PSG** (§27) | |
| Both class adjustments are real `SchemaField`s (§28, §29) | |
| **The character generator, on a draft store** (§29) — no `FormApplication` left | |

## Hard rules (override defaults)

- **v14 only in new code.** Everything under `foundry.*`. No bare `Application` /
  `FormApplication` / `Dialog` / `duplicate` / `mergeObject` — those are deprecated with a
  **v16** removal. New windows are ApplicationV2, dialogs DialogV2, data
  `foundry.abstract.TypeDataModel`. Existing v1 code is mid-migration: don't add to it;
  when you touch a v1 class, prefer converting it whole.
- **TypeScript for tooling, JS for runtime.** `*.config.ts`, `scripts/*.ts`, `test/**/*.ts`
  are checked by `npm run check`. `module/**/*.js` is unchecked (`checkJs: false`) until
  phase 5. Node ≥22.18 runs `.ts` scripts directly — no `tsx`/`ts-node`.
- **Verify, don't eyeball.** Every change runs the tier that covers it (below). Don't report
  work as done on an untested edit. If a green run surprises you, suspect the harness.

## Commands

```bash
npm run build            # vite → dist/
npm run setup            # dev install: symlink scaffold (packs are COPIED — re-run after packing)
npm run deploy           # release rehearsal: link-free copy, same shape as the zip
./scripts/packs.sh pack  # packs/_source/*.json → LevelDB (close Foundry first)
npm run content -- --allocate  # content/books/** -> packs/_source/** (--allocate mints new ids)
npm test                 # 234 vitest specs — the CI tier
npm run check            # tsc over the .ts surface, then svelte-check over module/ui
npm run test:e2e         # 74 Playwright specs vs a real headless Foundry
```

A fresh clone needs `npm ci && npm run build && ./scripts/packs.sh pack` — both `dist/` and
`packs/` are gitignored build output.

## This repo's specifics

- **System id `mothershiprpg`** (§18) — keys settings, flags, pack names
  (`mothershiprpg.<pack>`), the runtime path `systems/mothershiprpg/…`, **and the public API
  `game.mothershiprpg`**. One string identifies the package everywhere. The `.mosh` CSS classes
  and `Mosh.*` lang keys are internal and kept.
- **`game.mothershiprpg` is the public API** (`rollItemMacro`, `initRollTable`, `initRollCheck`, …).
  **Shipped compendium macros call it** — grep `packs/_source/` before changing a signature.
- **Strings** live in `lang/en.json` under `Mosh.*`; there is a `pt-BR` translation too.
- **`css/mosh.css` is hand-authored, not compiled.** There is no SCSS step (the `scss/` tree
  was 17 months stale and was deleted). As sheets become Svelte, styles move into scoped
  `<style>` blocks.
- **`template.json` is inert but kept on purpose** — it is the oracle the DataModel
  equivalence tests compare against. Changing a schema means changing both, deliberately.
- **New UI lives in `module/ui/`** — an ApplicationV2 shell per window plus Svelte 5
  components (runes mode is forced on). `MODERNIZATION.md` §10 has the conventions: the
  document stays the source of truth, Foundry persists the form, mount once.
- **`module/ui/parts/` holds the shared primitives** (§20) — `ItemList`/`ItemRow`/`ItemCell`/
  `ItemControls`/`ItemControl`, `Tabs`/`TabPanel`, `CircleStats`/`CircleStat`, `MainStat`,
  `Field`, `CheckField`, `Editor`, `SheetHeader`, plus the `dropTarget` attachment. Build a conversion
  out of these before writing bespoke markup. They emit the **global** class names from
  `css/mosh.css` on purpose and carry no `<style>` blocks; `test/ui-parts.test.ts` pins every
  one of those class names, because the stylesheet is a contract no compiler checks.
- **Manifest URLs point at `rune-goblin`** (`MODERNIZATION.md` §15). `manifest` must stay on
  `/releases/latest` or Foundry can never detect an update; `download` is version-specific and
  is stamped by `release.yml` from the tag — don't hardcode it.

## Not in scope

- **Both third-party content modules are dropped from the merge** (`MODERNIZATION.md` §19).
  `mothership-survival-guide` is GPL-3 (absorbing it would relicense this MIT system) and
  `mothership-character-builder` declares no licence and is Naurgul's. Only rune-goblin's own
  extraction merges. Don't merge content whose provenance is unsettled.

## Gotchas

- **Check that a "source" is really the source.** Two dead sources have already been found
  and deleted (`scss/`, `_macros/`), each duplicating something that had moved on. Before
  building from any input, verify it produces what actually ships.
- **`packs/_source/**` is generated — do not hand-edit it.** The real source is
  `content/books/psg/*.ts` (typed catalogs, §27); `npm run content` emits the pack sources and
  `packs.sh pack` compiles them. `packs/` and `dist/` are never committed; `packs/_source/` is.
- **A sheet can bind a field no schema declares.** A `SchemaField` cleans off keys it does not
  know, so the write is accepted and silently discarded. That is how the DataModel migration
  stopped armour from equipping; twelve such fields were found and restored.
  `test/sheet-bindings.test.ts` pins all 13 types. See `MODERNIZATION.md` §10.
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
  Together with the point above this cost four e2e cycles during §25's cut.
- **A killed e2e run leaves the GM session occupied** — the next run hangs 30s then fails in
  `globalSetup`. Fix: `lsof -ti:30005 | xargs kill -9`, then **wait for the port to actually
  free** (`until ! lsof -ti:30005 >/dev/null; do sleep 1; done`) — a fixed `sleep` is not enough
  and the run fails the same way.
- **`prepareDerivedData` mutates `this.system` in place.** Assert stored data with
  `doc.toObject().system`, never `doc.system`.
- **`Actor.create` returns `undefined` on a validation failure** — it does not throw.
- **Update paths are `system.*`.** The `data.` alias was removed in v10; six updates were
  still using it and silently doing nothing.
- **History was rewritten** (`git filter-repo`, to drop 854 MB of committed release zips) and
  has now been **force-pushed**; `master` tracks `origin/master`, so plain `git push` works.
  The pre-rewrite history is gone from both the remote and this clone (`MODERNIZATION.md` §14).
  Anyone holding an older clone must re-clone.
