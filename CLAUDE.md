# MoSh — project rules

The unofficial **Mothership** system for Foundry VTT. A Foundry **system** (not a module):
`system.json` is the manifest, `module/mosh.js` the esmodule, built by Vite to
`dist/mosh.{js,css}`, plus compendium content built from JSON in `packs/_source/`.

**Detailed conventions live in the `foundry-mosh` skill** (`.claude/skills/foundry-mosh/`) —
the v14 API surface, Svelte-in-ApplicationV2, the test tiers, packs, and the build. Consult
it for any of those; it loads on demand so this file stays short. Here: only the hard rules
and what is specific to this repo.

Code style: global `~/.claude/CLAUDE.md` — comment only the non-obvious *why*.

## Where the project is

Modernization from a dead gulp build to the runegoblin baseline. **Phases 1–3, the test
harness, and phase 4's step 0 + first conversion are done; `skill-sheet.js` is next.**
`MODERNIZATION.md` is the living plan — read its status header and §Phase 4 before starting
UI work, §10 for the conventions the item sheet settled, §13 for what is next and why, and
update it as work lands.

| Done | Not done |
|---|---|
| Vite build, TS tooling, CI | 7 AppV1 sheet classes |
| DataModels for all 13 types | 4 bare-`FormApplication` windows |
| Packs from JSON source, 0e removed | 28 Handlebars templates |
| Svelte 5 wired into build, check, vitest | 6 sheets/windows left to convert |
| 8 item sheets on ApplicationV2 + Svelte | |
| 0e / `firstEdition` rules removed | |
| 97 vitest + 57 Playwright specs | |

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
npm test                 # 97 vitest specs — the CI tier
npm run check            # tsc over the .ts surface, then svelte-check over module/ui
npm run test:e2e         # 57 Playwright specs vs a real headless Foundry
```

A fresh clone needs `npm ci && npm run build && ./scripts/packs.sh pack` — both `dist/` and
`packs/` are gitignored build output.

## This repo's specifics

- **System id `mothershiprpg`** (§18) — keys settings, flags, pack names
  (`mothershiprpg.<pack>`), and the runtime path `systems/mothershiprpg/…`. **The public API is
  `game.mothership`**, deliberately not the id: 208 shipped macros call it. The `.mosh` CSS
  classes and `Mosh.*` lang keys are internal and kept.
- **`game.mothership` is the public API** (`rollItemMacro`, `initRollTable`, `initRollCheck`, …).
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
- **Manifest URLs point at `rune-goblin`** (`MODERNIZATION.md` §15). `manifest` must stay on
  `/releases/latest` or Foundry can never detect an update; `download` is version-specific and
  is stamped by `release.yml` from the tag — don't hardcode it.

## Gotchas

- **Check that a "source" is really the source.** Two dead sources have already been found
  and deleted (`scss/`, `_macros/`), each duplicating something that had moved on. Before
  building from any input, verify it produces what actually ships.
- **`packs/` and `dist/` are never committed.** Sources are `packs/_source/**/*.json`.
- **A sheet can bind a field no schema declares.** A `SchemaField` cleans off keys it does not
  know, so the write is accepted and silently discarded. That is how the DataModel migration
  stopped armour from equipping; twelve such fields were found and restored.
  `test/sheet-bindings.test.ts` pins all 13 types. See `MODERNIZATION.md` §10.
- **Foundry holds an exclusive LevelDB lock** on every pack it can see; `packs.sh` refuses
  to run while it is open. That guard is deliberate.
- **A killed e2e run leaves the GM session occupied** — the next run hangs 30s then fails in
  `globalSetup`. Fix: `lsof -ti:30005 | xargs kill`.
- **`prepareDerivedData` mutates `this.system` in place.** Assert stored data with
  `doc.toObject().system`, never `doc.system`.
- **`Actor.create` returns `undefined` on a validation failure** — it does not throw.
- **Update paths are `system.*`.** The `data.` alias was removed in v10; six updates were
  still using it and silently doing nothing.
- **History was rewritten** (`git filter-repo`, to drop 854 MB of committed release zips) and
  has now been **force-pushed**; `master` tracks `origin/master`, so plain `git push` works.
  The pre-rewrite history is gone from both the remote and this clone (`MODERNIZATION.md` §14).
  Anyone holding an older clone must re-clone.
