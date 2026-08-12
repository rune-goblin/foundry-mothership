# MoSh — modernization plan

Audit of `foundry-mothership` (MoSh 0.6.1) against the runegoblin development baseline
(`runegoblin-foundrytemplate`: TypeScript + Svelte 5 + Vite + vitest/Playwright), and a
staged plan to close the gap.

Audited 2026-08-11 against the locally installed **Foundry v14 stable**
(`/Applications/Foundry Virtual Tabletop.app/.../public/scripts/foundry.mjs`), not from
memory. API claims below were checked in that file.

## Start here

**Phases 1–3, the test harness, phase 4's step 0 + first conversion, the 0e removal, the schema
repairs, the `mothershiprpg` rename, the shared component layer, `skill-sheet.js` and the
simple windows are complete.**

**The remaining order was re-planned by an architecture review on 2026-08-12 and now lives in
`docs/plans/architecture.md`.** That review found the schema work and the UI work are one
schedule — the fields that exist only to hold rendered HTML cannot die until their sheets
convert — and that the system has never shipped the content its character generator scans for.
So the content pipeline goes first and everything else is built against the clean data it
produces. §Phase 4's own order table below is **superseded**; it survives only as the record of
items 1–3, with a map to where each remaining item went.

**Next: phase 0 — the dead-field prune (P0.2) and `creature-settings.js` (P0.3) — then phase 1,
the content system.**

**Queued behind the sheet conversions:** an architectural audit migrating the UI to Svelte best
practices (§23). The conversions deliberately preserve AppV1-era shapes to keep risk at zero;
that is a compromise with a scheduled end, not the target state.

| | |
|---|---|
| Read first | `CLAUDE.md`, then the `foundry-mosh` skill (`.claude/skills/foundry-mosh/`) |
| The plan | `docs/plans/architecture.md` — the phases, the decisions, the owner's rulings at the end |
| The evidence under it | `docs/plans/evidence.md` — the measurements the plan leans on |
| How it runs | `docs/plans/run-to-the-end.md` — the ten standing rules and the review gate (still current); its *wave order* is superseded by architecture.md |
| Build on | `module/ui/parts/` — the shared primitives (§20), before writing bespoke markup |
| Verify with | `npm run check && npm test` (120 specs), `npm run test:e2e` (75 specs) |
| State | `master`, tree clean, pushed and tracking `origin/master` |

**Pushed.** The rewritten history is live on `origin/master` (§14) and `master` tracks it, so
`git push` and `git pull` work bare. The pre-rewrite history is gone. The manifest URLs now
point at `rune-goblin` (§15).

Everything below is the audit and the record of what landed, newest phases at §7–§9.

---

## Verdict

Two problems, and only one of them is the one you asked about.

1. **The build is dead.** `npm install` fails on this machine today. This is not a
   modernization nicety — nobody can compile the stylesheet at all right now.
2. **The runtime code is v14-*namespaced* but v1-*shaped*.** A previous pass renamed
   `ActorSheet` → `foundry.appv1.sheets.ActorSheet` and `mergeObject` →
   `foundry.utils.mergeObject`. That bought compatibility, not modernity. Every sheet is
   still an AppV1 `getData()`/`activateListeners()` class rendering a Handlebars string.

Your instinct is right — the tooling needs replacing, and ApplicationV2 + Svelte is the
right target. But sequence it: **fix the build first, migrate the UI second.** They are
independent, and phase 1 is a day's work that unblocks everyone.

The good news: the codebase is smaller than it looks (9,274 lines of JS across 20 files)
and the v14 namespacing pass already did the mechanical half of the API migration.

---

## 1. Audit findings

### 1.1 Build toolchain — non-functional

`package.json` declares four dependencies, all gulp-era:

```
gulp ^4.0.2 · gulp-autoprefixer ^7.0.1 · gulp-sass ^4.1.0 · gulp-sourcemaps ^2.6.5
```

`gulp-sass@4.1.0` pulls `node-sass@4.14.1`, which is a native addon supporting Node ≤ 14
and requires `node-gyp` + Python to compile. On this machine (Node v24.11.0) a clean
install fails:

```
gyp ERR! stack Error: Can't find Python executable "python"
gyp ERR! cwd .../node_modules/node-sass
npm error Build failed with error code: 1
```

Even with Python present, libsass 3.x does not compile against a modern toolchain.
`node-sass` has been deprecated in favour of `sass` (dart-sass) since 2020.

Consequences:

- `npm run build` / `watch` / `compile` are all unusable.
- `package-lock.json` is `lockfileVersion: 1` (npm 6, ~2020). No `engines` field, no
  `.nvmrc`, so nothing pins or warns about the Node version.

**The stylesheet is not built from the SCSS — and has not been for 17 months.**

This was found while wiring up Vite, and it is the single most important discovery of the
migration. `css/mosh.css` is not build output. It is **hand-authored source**:

| | `scss/` tree | `css/mosh.css` |
|---|---|---|
| Last commit | **2025-01-06** (`306aa0a`) | **2026-05-25** (`8731086`) |
| Compiles/weighs | 4,551 bytes | 36,616 bytes |
| CSS selectors | 51 | 247 |

The SCSS compiles to **12%** of the live stylesheet. Comparing selector sets, it is
effectively a strict subset — its only 7 unique selectors are stale `.sheet-header`
variants that were restructured in the CSS long ago. Five commits have touched
`css/mosh.css` since the SCSS was last edited.

So the gulp pipeline did not merely break; it was **abandoned**, and all styling work
since January 2025 has gone directly into the CSS. Had the build been naively pointed at
`scss/mothership.scss`, it would have silently deleted ~80% of the system's styling.

The `scss/` tree is now a trap: it looks like the source, and editing it does nothing.
Decide its fate (see §6).

### 1.2 Runtime API — compatible, but on a removal clock

`system.json` declares `compatibility: { minimum: "13", verified: "14" }`. Worth noting
that the commit titled *"skeleton v14 update"* (`8731086`) touched only `system.json`,
`css/mosh.css`, and added a 48 MB release zip — **zero module code**. The v14 claim is
asserted, not earned by that commit; the namespacing came from earlier work.

What I verified in v14's `foundry.mjs`:

| Symbol used | Status in v14 | Sites |
|---|---|---|
| `foundry.appv1.sheets.ActorSheet` / `.ItemSheet` | present, deprecated | 6 sheet classes |
| bare `FormApplication` | present as global, `@deprecated since v13 until v16` | 5 classes |
| bare `duplicate` / `mergeObject` / `renderTemplate` | **not globals** | 0 live sites ✓ |
| `foundry.documents.collections.Actors.registerSheet` | current | 9 ✓ |
| `foundry.applications.handlebars.renderTemplate` | current | 14 ✓ |
| `DialogV2` | current | 19 ✓ |
| `ApplicationV2` / `HandlebarsApplicationMixin` | current | **0** |
| `foundry.abstract.DataModel` / `defineSchema` | current | **0** |

So: the system loads on v14 and will keep loading until **v16**, when the `appv1`
namespace and the deprecated `Application`/`FormApplication`/`Dialog` globals go. That is
the real deadline. The 25 bare `duplicate(` matches I found are all inside commented-out
lines — no live breakage there.

**One genuine bug**, at `module/windows/ship-macros.js:4`:

```js
export class DLShipMacros extends foundry.applications.sheets.BaseSheet {
    static get defaultOptions() { ... options.template = '...' ... }
    get title() { return `${this.object.name}: Ship Macros`; }
```

`BaseSheet` is real in v14 — it is `HandlebarsApplicationMixin(DocumentSheetV2)`, i.e. an
**ApplicationV2**. But this class configures itself with `static get defaultOptions()`,
`options.template`, and `this.object`, which are all AppV1 contracts that V2 never reads.
This looks like a find-and-replace that landed on the wrong base class. It is a V2 shell
wired up as a V1 app and will not render correctly.

Also outstanding:

- **`template.json` (10 KB) instead of DataModels.** Still supported in v14 — I confirmed
  core reads it — but it is the legacy path: no validation, no migration hooks, no types.
  `system.json` already declares `documentTypes` for 3 Actor and 10 Item types, so the
  registration half is in place; only the schemas need moving.
- **`module/actor/actor.js` is 2,993 lines** — a third of the whole codebase in one file.
  This is where the automation lives and where a DataModel migration will bite hardest.

### 1.3 No quality gates at all

No TypeScript, no `svelte-check`, no linter, no tests, no `.github/` directory, no CI.
Nothing mechanical stands between an edit and a release. For a system with "comprehensive
automation for all checks, saves, attacks, wounds, and conditions", every regression is
currently found by a player at the table.

### 1.4 Repository hygiene

| Item | Measurement | Note |
|---|---|---|
| `_releases/` | **854 MB**, 19 versions | Committed release zips — one is 48 MB. Belongs in GitHub Releases. |
| `.git/` | **353 MB** | Consequence of the above. Clone cost for every contributor. |
| `packs/` | 1.6 MB, **both formats tracked** | See 1.5. |
| `images/` | 48 MB, 798 files | Legitimate, but ships in every clone. |
| `.gitignore` | **absent** | Only `.npmignore` exists; `node_modules/` is not ignored by git. |
| `lib/some-lib/` | 2 zero-byte files | Dead scaffolding. |
| `LICENSE.txt` | **missing** | `system.json` declares `"license": "LICENSE.txt"`; the file is not in the repo, and README claims MIT. |

### 1.5 Content pipeline

Both compendium formats are committed for all 9 packs — the NeDB `.db` JSON-lines files
*and* the migrated LevelDB directories (`packs/conditions_1e.db` **and**
`packs/conditions_1e/`, 54 tracked files including `LOCK` files). Meanwhile `system.json`
still points at the `.db` paths.

**Resolved** by inspecting the live install at `Data/systems/mosh`: its `system.json`
still declares `packs/conditions_1e.db`, yet there are **zero** `.db` files on disk —
only the 9 LevelDB directories — and the world runs. So v14 resolves a `.db` manifest
path to the sibling directory, and Foundry deleted the NeDB files on install (the local
config sets `deleteNEDB: true`).

Consequences:

- The 9 committed `.db` files are **dead weight**. They are also a hazard: exposing them
  to Foundry invites it to delete them out of the working tree. `scripts/setup.ts`
  therefore links the LevelDB directories individually and withholds the `.db` files.
- The `.db` paths in `system.json` work but are misleading; correct them when the pack
  pipeline is reworked.

There is also no source-of-truth story: the template builds `packs/` from tracked JSON in
`packs/_source/` via `scripts/pack.ts`, so content is diffable and reviewable. Here,
binary LevelDB is the tracked artifact — pack changes are unreviewable in a PR.

The `_macros/` directory (4 subdirs of loose macro sources) is a parallel, undocumented
content path that presumably feeds the macro packs.

---

## 2. Target state

Match the template baseline, adapted for a system:

```
package.json      type: module, engines.node >=22.18, npm scripts below
.nvmrc            24
vite.config.ts    lib build → dist/mosh.js + dist/mosh.css; dev proxy on :30001
svelte.config.ts  vitePreprocess()
tsconfig.json     strict, ES2022, bundler resolution, @/* → src/*
vitest.config.ts  unit specs
playwright.config.ts  e2e against headless Foundry
.github/workflows/    ci.yml (check + test), release.yml (tag → zip + manifest)
scripts/*.ts      setup.ts, deploy.ts, pack.ts  (node runs .ts directly, no tsx)
src/              index.ts, data models, sheets, ui/components/*.svelte
packs/_source/    JSON pack sources (tracked); packs/ built + gitignored
```

Scripts, mirroring the template so muscle memory transfers:

```
build · dev · watch · check · test · test:watch · test:e2e · setup · deploy · pack · unpack · clean
```

Two rules carried over from the `foundry-pf2e` skill, which apply here unchanged:

- **v14 only, no v1 APIs.** ApplicationV2, DialogV2, `foundry.abstract.DataModel`.
- **TypeScript everywhere, including tooling.** Node ≥ 22.18 strips types natively, so
  `vite.config.ts` and `scripts/*.ts` run under plain `node`. No `.mjs`/`.js` tooling.

---

## 3. Where a system differs from the module template

The template is a PF2e *module*. Five things do not port directly:

1. **Manifest.** `system.json`, not `module.json` — different schema, and it already
   carries `documentTypes`, `grid`, `primaryTokenAttribute`. Anything in the tooling that
   reads `module.json` (vite config, `pack.ts`, `deploy.ts`, `release.yml`) needs
   repointing.
2. **Install path.** `Data/systems/mosh/`, not `Data/modules/<id>/`. This changes
   `scripts/setup.ts`'s symlink target and vite's `base` (`/systems/mosh/dist/`) and every
   proxy rule in the dev server config.
3. **Types.** The template depends on `foundry-pf2e`, which is PF2e-specific and useless
   here. Use a generic Foundry typings package instead (`fvtt-types`, or
   `@league-of-foundry-developers/foundry-vtt-types` — evaluate which has current v14
   coverage before committing). Expect this to be the loosest part of the setup; budget
   for `// @ts-expect-error` at the edges rather than blocking on perfect types.
4. **Systems own document classes.** `CONFIG.Actor.documentClass`,
   `CONFIG.Actor.dataModels`, `CONFIG.Item.dataModels` — the template has no equivalent,
   since modules rarely replace these.
5. **e2e needs a mosh world.** The template's Playwright harness boots a PF2e world.
   Adapt `scripts/setup-test-env.ts` to create a mosh world instead.

The Svelte skill (`svelte:svelte-code-writer` / `svelte-core-bestpractices` plus the
Svelte MCP server) is system-agnostic and applies as-is.

---

## 4. Migration plan

Five phases. **Phases 1–2 are the ones I would commit to now**; 3–5 are the Svelte
migration proper and can be paced against the v16 deadline.

### Phase 1 — make it build ✅ **done**

Landed (uncommitted, staged in the working tree):

1. Deleted `gulpfile.js` and all four gulp dependencies; deleted `lib/some-lib/` (two
   zero-byte files) and the `lockfileVersion: 1` lockfile.
2. `package.json`: `"type": "module"`, `"engines.node": ">=22.18.0"`, scripts
   `build` / `dev` / `watch` / `clean`. Added `.nvmrc` (`24`).
3. `vite.config.ts` — lib build, entry `module/index.js`, output `dist/mosh.js` +
   `dist/mosh.css`. `system.json` now points at `dist/`.
4. `module/index.js` — new entry importing `../css/mosh.css` then `./mosh.js`.
5. `.gitignore` (`node_modules/`, `dist/`, `.DS_Store`, `*.zip`, `*.log`).
6. Added the missing `LICENSE.txt` (MIT + Tuesday Knight Games attribution).
7. Removed `_releases/` from the working tree (854 MB, 36 files; recoverable from
   `e70d25b`).

**`css/mosh.css` stays tracked as source**, per §1.1 — it is not build output. The
`scss/` tree is out of the build path entirely.

**Verified:**

- `npm install` — 35 packages, ~3s (was: 495 packages, hard failure on `node-sass`).
- `npm run build` — clean, 32 ms.
- **Selector parity 247 → 247** between `css/mosh.css` and `dist/mosh.css`; both
  `@import` font URLs hoisted correctly, `@font-face` 4 → 4.
- Art still referenced by runtime path (`/systems/mosh/images/...`, 2 refs), **zero**
  base64 inlining — Foundry keeps serving it, as intended.
- `dist/mosh.js` parses and executes as valid ESM (fails only on the expected missing
  `Actor` global outside Foundry).

**Not yet verified:** a real world load in Foundry. The local install at
`Data/systems/mosh` is a plain directory, *not* linked to this repo, so nothing here has
touched it. Copy or link the repo over it to smoke-test before committing.

Also surfaced by the build: **direct `eval()` at `module/mosh.js:88` and `:94`**, building
a comparison out of string concatenation. Rolldown flags it. Replace with a comparator
lookup — small, self-contained, and a good first unit-test target in phase 2.

### Phase 2 — quality gates and repo weight (partly done)

1. `tsconfig.json` with `allowJs: true, checkJs: false` — TypeScript can type-check the
   build tooling and any new `src/` code without touching 9,274 lines of legacy JS yet.
   **Not done.**
2. ~~`vitest.config.ts` + first unit specs~~ **done** — see §8.
3. ~~`.github/workflows/ci.yml`~~ **done** — `npm ci`, `npm test`, `npm run build`, then
   `packs.sh pack` with a completeness check, on push to `master` and every PR. Add
   `npm run check` once item 1 lands.
4. `.github/workflows/release.yml`: tag `vX.Y.Z` → stamp version, build, publish
   `system.json` + `mosh.zip` to GitHub Releases.
5. ~~`scripts/setup.ts`~~ **done early** — `npm run setup` rebuilds `Data/systems/mosh`
   as a real directory symlinking back to the repo (`system.json`, `template.json`,
   `dist`, `templates`, `images`, `lang`, `data`, plus `packs/` entry-by-entry). Verified
   against a headless v14 server on port 30099: `dist/mosh.js` 200 (215,140 B),
   `dist/mosh.css` 200 (36,628 B), templates/images/lang all 200, and the retired
   `module/mosh.js` path correctly 404s. ~~`scripts/deploy.ts` still to do~~ — **done, §16.**
6. `_releases/` is already out of the working tree (phase 1). Purging it from *history*
   is a separate, irreversible call — see §6.
7. ~~Pack pipeline~~ **done** — see §7.

**Verify:** CI green on a PR; `npm run deploy` produces a working install.

### Phase 3 — DataModels ✅ **done**

All 13 types (3 Actor, 10 Item) are `foundry.abstract.TypeDataModel` subclasses in
`module/data/{actor,item}-models.js`, registered via `CONFIG.Actor.dataModels` /
`CONFIG.Item.dataModels`. Confirmed against v14's `_cleanType`: a registered model takes
precedence and `template.json` is only consulted when none exists, so the migration was
safe to do type-by-type.

**Every schema is proved equivalent to `template.json`.** `test/field-stubs.ts` stubs
`foundry.data.fields` to record what each field would initialise to, then walks the *real
shipped schema* and compares it to the defaults `template.json` composes. That is 13
equivalence assertions plus coverage checks that the model set matches the types declared
in both `system.json` and `template.json` — so adding a type without a model fails CI.
Mutation-tested: a changed default, a nested default, a dropped threshold key, or a
missing type all fail.

Two deliberate looseness calls, both commented in place:

- `class.base_adjustment` / `class.selected_adjustment` are free-form `ObjectField`s.
  `choose_skill_or` is an array of arrays of objects and `class-sheet.js:41` writes a
  derived `from_list_names` onto each entry while rendering, which a strict `SchemaField`
  would clean back off. Tighten once the character generator stops mutating the model it
  renders from.
- `character.xp.html` is a **number**, not a string, matching `template.json`. The sheet
  builds the XP pips from it.

`template.json` is **kept on purpose**. It is inert at runtime now, but it is the oracle
the equivalence tests check against — a locked record of the pre-migration schema, so any
future schema change has to be made deliberately in both places. Delete it when that stops
earning its keep; v16 removes support regardless.

**Now verified in a running game** — see §9. All 13 types create with the right defaults
against a real Foundry, and validation is confirmed to reject a bad value outright rather
than store it.

### Phase 4 — ApplicationV2 + Svelte, sheet by sheet (in progress)

**Read first:** the `foundry-mosh` skill's `references/svelte-in-applicationv2.md` — the
shell pattern, the AppV1→V2 mapping table, and the five codebase-specific hazards.

#### Step 0 — wire Svelte up ✅ **done**

Svelte 5.56 / `@sveltejs/vite-plugin-svelte` 7.3 / `svelte-check` 4.7. `svelte.config.js`
pins **runes mode on**, so the Svelte 4 idioms (`export let`, `$:`, `on:click`) are compile
errors rather than silent legacy mode. The plugin is in `vite.config.ts` and in
`vitest.config.ts` (with `resolve.conditions: ['browser']`, without which runes have no
reactivity under Node). `npm run check` now runs `tsc` **and** `svelte-check` against
`tsconfig.svelte.json`.

Verified before converting anything: 84 vitest + 28 Playwright still green, and the new gate
is not vacuous — a throwaway component using `export let` and `on:click` fails `svelte-check`.

#### Order of attack — items 1–3 done; the rest **superseded**

The original plan was easiest-first, so the conventions were settled before the risky sheets.
That worked: three items landed and settled them (§10, §20, §21, §22). The remaining five were
re-planned on 2026-08-12 — see `docs/plans/architecture.md`, and the map below.

| # | Target | Lines | Notes |
|---|---|---|---|
| ~~1~~ | ~~`item-sheet.js` + 8 item templates~~ | 80 | ✅ **done** — see §10. |
| ~~2~~ | ~~`skill-sheet.js`~~ | 72 | ✅ **done** — see §21. `item-skill-sheet.html` deleted; `item-sheet.js` now survives only for `class-sheet.js`. |
| ~~3~~ | ~~`ship-setup`, `ship-megadamage`, `settings-rolltables`~~ | 73 / 120 / 89 | ✅ **done** — see §22. `ship-megadamage` was **deleted**, not converted. |

**Where items 4–8 went.** The review changed the *order*, not the work: the content pipeline was
inserted ahead of the sheets, because the character generator scans for skill and class documents
this system has never shipped, and the sheets should be built against clean data rather than
retrofitted to it. Schema deletions were also bound to the conversions that remove their last
reader, so a conversion cannot re-enshrine a render artifact.

| Old item | New unit | Phase |
|---|---|---|
| 4 · `creature-settings.js` | **P0.3** — unchanged in substance; the `FIXME` is resolved in §12 (it should persist **nothing**) | phase 0 |
| 5 · `class-sheet.js` | **C6** — now two commits: derive first, then tighten `base_adjustment`/`selected_adjustment` into real schemas with `template.json` and a generated contract type | phase 2 |
| 6 · `creature-sheet.js` | **C8** | phase 2 |
| 6 · `ship-sheet-sbt.js` | **C12** — still owes §22's three things, now paid alongside the ship schema cleanup | phase 3 |
| 6 · `ship-sheet.js` | **C13** — **not converted.** Owner's decision: the non-default sheet is *deprecated now, deleted later* | phase 3 |
| 6 · `ship-deckplan.js` | folded into **C12** | phase 3 |
| 7 · `actor-generator.js` | **C7** — rebuilt on an explicit draft store, with its dice formulas read from shipped content instead of hardcoded | phase 2 |
| 8 · `actor-sheet.js` | **C9** — still last, still the highest-risk sheet | phase 2 |
| — | **P0.2** dead-field prune + standing usage test; **C1–C4** the content system; **C5** primitives batch 2 + shared sections; **C10–C11** ship content and schema; **C14–C15** CSS dissolution and TypeScript | new |

Two units are new work the original order did not contain: the content system (C1–C4), which is
the feature — the generator starts working when it lands — and the requirement that **conditions
contribute advantage/disadvantage to rolls**, recorded at the end of `architecture.md` and landing
with or just after C9.

The Handlebars templates retire as their sheets migrate, as before.

#### Definition of done, per conversion

1. `npm run check` (now including `svelte-check`) and `npm test` green.
2. `npm run test:e2e` green — `test/e2e/sheets.spec.ts` already asserts each actor sheet
   renders and shows its actor, and that derived armour/net HP survive.
3. **A new e2e spec for the interactions that sheet owns** — the rolls it fires, the fields
   it edits. A converted sheet that only proves it renders is under-tested.
4. The old `.html` template deleted, not orphaned. (Two dead sources have already been found
   in this repo; don't leave a third.)

#### Known hazards, in the order they will bite

- **`getData()` builds HTML strings.** `actor-sheet.js:55` assembles XP pips in a loop into
  `superData.xp.html`; `character.xp.html` is a *number* in the schema for that reason. In a
  component this becomes `{#each}` markup. Do not port string concatenation forward.
- **Derived data is already computed.** `prepareDerivedData` fills `stats.armor.mod/total`,
  `netHP`, `bleeding`. Read them; don't recompute.
- **Settings are copied per-sheet today** (`useCalm`, `hideWeight`, `androidPanic`).
  Components can read settings directly. `firstEdition` no longer exists (§11).
- **`class-sheet.js` writes onto the model while rendering** (`from_list_names`,
  `skills_granted_object`). Derive into local state instead; that is the precondition for
  tightening `base_adjustment`/`selected_adjustment` into real schemas.
- **Sheets bind fields no schema declares.** A `SchemaField` silently cleans off keys it does
  not know, so the edit is accepted and discarded. Twelve were found and fixed (§10);
  `test/sheet-bindings.test.ts` now fails on the thirteenth.
- **V2 windows carry `.application`, not `.window-app`, and are themed.** `css/mosh.css` was
  written for the V1 frame and paints `.window-app .window-content` white; without the
  matching `.application` rule a converted sheet renders dark, with the theme's light text on
  the stylesheet's light boxes. Converted sheets pin `themed theme-light` in `classes`.

#### Queued behind this phase

~~Remove the `firstEdition` / 0e rules branches~~ — **done, see §11.** Landed before the big
sheet conversions so the conditionals were deleted rather than ported into Svelte and deleted
afterwards.

~~`creature-settings._updateObject` still does not persist~~ — **resolved, see §12.** It should
persist nothing; item 4 is unblocked.

### Phase 5 — TypeScript conversion (opportunistic, ongoing)

Flip `checkJs: true` and convert file by file as each is touched. `actor.js` (2,993
lines) should be split during conversion rather than translated wholesale — its
automation is the system's real asset and deserves to be modules with tests, not one
file.

---

## 5. Risks and open questions

- ~~**Upstream relationship.**~~ **Decided: this is a hard fork** (§17). The README says so,
  the manifest URLs are repointed (§15), and `authors` still credits the upstream authors.
  One thing left open — see the package-id note in §17.
- **Foundry typings quality.** Item 3 in §3. Generic v14 typings are less mature than the
  PF2e-specific package the template uses. Do not let type coverage block phase 1–2 —
  `checkJs: false` sidesteps it entirely until phase 5.
- **`actor.js` is the crown jewels.** 2,993 lines of unstested automation. Phase 2's tests
  are a precondition for phases 3–5, not a nice-to-have. If you cut one thing from this
  plan, do not cut those.
- **Linked packs will dirty the repo.** `npm run setup` points Foundry at the repo's
  LevelDB packs, and Foundry compacts and locks them on world load — expect unexplained
  diffs under `packs/`. This is the strongest argument for phase 2 item 7 (track JSON
  sources, gitignore the built LevelDB) and it will keep biting until that lands.
- **48 MB of images** in a 798-file `images/` tree ships in every clone and every release
  zip. Worth an audit for unused art at some point; not urgent.

---

## 6. Open decisions

**a. `_releases/` purged from history — done.** `git filter-repo --path _releases
--invert-paths`. `.git` 353 MB → **102 MB**; whole repo 435 MB → **185 MB**.

- 584 commits remain of 599 parsed: the difference is commits that only ever added
  release zips, which became empty and were pruned. The `chore: remove committed release
  archives` commit pruned itself for the same reason — once the files never existed,
  there is nothing to remove.
- `git log --all -- _releases` returns nothing.
- **Every SHA changed.** Old `e70d25b` → new `017615f`.
- filter-repo removed the `origin` remote as a safety measure; it has been restored.
  **The next push must be `git push --force origin master`**, and anyone else with a
  clone must re-clone.
- ~~The recovery route is `origin`, and only until the force-push.~~ **This was wrong** — see
  §14. The pre-rewrite objects were still in the local clone the whole time, unreferenced,
  which is why `.git` measured 393 MB rather than the 102 MB recorded here. Both copies are
  now gone, deliberately.

**b. `scss/` deleted — done.** 13 files, recoverable from history. Styling stays plain
hand-authored CSS through phase 4, then dissolves into scoped component styles as sheets
become Svelte. Build output is unchanged at 247 selectors with the tree gone.

**c. Commits.** Phase 1 landed as `0edf526 build: replace gulp with vite` (post-rewrite
SHA), on `master`.

---

## 7. Content pipeline — done

Packs are distribution, not repository. The 5 remaining 1e compendia now build from
tracked JSON via `scripts/packs.sh {pack|unpack}`, ported from
`mothership-survival-guide`; `packs/*/` is gitignored and CI builds it.

**Removed:** the 4 `_0e` compendia, `_macros/{hotbar,triggered}_0e` (103 files), and the
9 legacy NeDB `.db` files (dead — v14 serves only LevelDB, which is why the live install
had none). Pack paths in `system.json` dropped the stale `.db` suffix to match what
v14-native packages use.

**Two dangling references** to deleted 0e macros were found and repointed to their 1e
equivalents: `templates/chat/modifyActor.html` (Panic Check) and the *Panic Check (Calm,
Normal)* rolltable (`+1 Insane`). No `_0e` reference remains anywhere.

**One deliberate divergence from the survival-guide script.** Its `strip_ids` assumes a
document's name slugs to a unique filename. Mosh's macros come in +/- pairs — `+1 Stress`
vs `-1 Stress`, `Panic Check [+]` vs `[-]` — and a naive slug collapses each pair onto one
filename, silently losing which is which. `packs.sh` preserves the sign as `plus`/`minus`
and leaves mid-word hyphens alone so `Well-Rested` stays readable. The collision guard is
kept as a backstop; it is what caught this in the first place.

**Verified:** all 326 documents round-trip byte-identical through unpack → pack → unpack,
and a locally built release zip carries 5 packs with `.ldb`/`CURRENT`/`MANIFEST`, the
`dist` bundle, no sources and no dev tooling.

### Still open here

- ~~`_macros/` duplicate source~~ **deleted** (162 files). It was the `scss/` trap again:
  two sources for one thing. Before removing it, every loose `.js` was compared to the
  pack documents *by content, not filename* — 160 of 162 were byte-identical to a pack
  document's `command`. The 2 that were not turned out to be **stale**: the loose android
  panic macros hardcode a rolltable id (`aBnY19jlhPXzibCt`) while the pack versions read
  it from `game.settings.get('mosh','table1ePanicStressAndroid')`, the configurable form
  the rolltable-config window expects. Deleting them removed the outdated copies.
  Recoverable from history.
- ~~The `firstEdition` rules code stays for now~~ — **removed, see §11.**
- **Existing worlds that used a 0e compendium will have dangling links.** Nothing in the
  system references them any more, but a world built on 0e content is not migrated.

---

## 8. Test harness — done

**63 specs, run in CI, no Foundry required.** `actor.js` is imported with an empty `Actor`
base class (`test/setup.ts`) and its methods are called with a hand-built `this`, so the
specs exercise the real shipped code without constructing a document or booting a world.
The one import that reaches the entry module is mocked.

Covered:

| Area | What is pinned |
|---|---|
| `parseRollString` | keep-highest vs keep-lowest for `[+]`/`[-]` in both check directions |
| `_deriveCharacter` | armour points, damage reduction, net HP, bleeding |
| `parseRollResult` | zero-based dice, the 90+ auto-failure, all four comparisons, doubles as criticals, crit-preference under advantage/disadvantage in both directions, the panic-check exception |
| `compare` | the four comparators the templates use, plus the coercion the old `eval` implied |

These are **characterisation** specs: they pin what the code does today, so the DataModel
and Svelte work changes behaviour deliberately rather than by accident.

**Harness health was checked, not assumed.** Mutating the auto-fail threshold, the doubles
set, and each of the four advantage/disadvantage arms all fail the suite. That exercise
paid for itself: the roll-*over* direction (`[+]`/kh and `[-]`/kl, used by damage rolls)
was untested at first and a mutation to it survived. Re-run it after adding specs — a
suite that cannot fail is worse than no suite.

### Bugs found and fixed along the way

- **`DLShipMacros` extended the wrong base class.** `foundry.applications.sheets.BaseSheet`
  is `HandlebarsApplicationMixin(DocumentSheetV2)`, but the class is written entirely
  against AppV1 (`defaultOptions`, `getData`, `activateListeners`, `_updateObject`,
  `this.object`), none of which V2 reads. Now `foundry.appv1.api.FormApplication`, matching
  its siblings.
- **Six updates wrote to the `data.` alias removed in v10** and silently did nothing —
  `ship-macros`, `ship-megadamage`, and four in `creature-settings`.
- **`creature-settings` read `system.stats.stats.speed`**, which `template.json` shows
  does not exist, so `_updateObject` threw on every submission; and called
  `updateEmbeddedEntity("OwnedItem", update)` — an API removed years ago, passing an
  `update` variable that was never declared.
- **The two `eval()` calls behind the `compare` helper** are gone (`module/compare.js`).
  The old form built an expression string, so any value containing a quote was a syntax
  error rather than a comparison; there is a spec for that.

### Left deliberately

`creature-settings._updateObject` still does not persist the form. `formData` is keyed
`actor.system.*` — not valid Actor update paths — and the explicit branches only ever
write `true`, so a stat can be switched on but never off. What *should* persist is a
design decision, not a typo, so it is marked `FIXME` rather than guessed at.
**Resolved in §12: nothing should persist there.**

None of these fixes have been verified in a running game; they are correct against the
schema and the v14 API, but the creature-settings and ship-macros windows are worth
opening once before release.

---

## Appendix — measurements

| | |
|---|---|
| JS source | 9,274 lines, 20 files |
| Largest file | `module/actor/actor.js`, 2,993 lines |
| Stylesheet (hand-authored source) | `css/mosh.css`, 36,616 B, 247 selectors |
| SCSS (stale, out of build) | 13 files, 2,245 lines → 4,551 B, 51 selectors |
| Handlebars templates | 37 `.html` (0 `.hbs`) |
| Compendium packs | was 9 in 2 formats (54 files); now 5, built from 326 tracked JSON docs |
| `game.settings.register` calls | 29 |
| `_releases/` | 854 MB |
| `.git/` | 353 MB |
| `images/` | 48 MB, 798 files |
| Node / npm on this machine | v24.11.0 / 11.6.1 |
| Foundry installed | v14 stable |

**References:** [System Development](https://foundryvtt.com/article/system-development/) ·
[API docs](https://foundryvtt.com/api/) (select the v14 build) ·
`runegoblin-foundrytemplate/.claude/skills/foundry-pf2e/` ·
`svelte:svelte-core-bestpractices`

---

## 9. e2e harness — done

Playwright against a real headless Foundry v14, ported from `runegoblin-foundrytemplate`.
**28 specs**, `npm run test:e2e`. This closes the "not verified in a running game" gap that
every phase above carried.

`test/e2e/README.md` has the commands, preconditions and conventions. What it proves:

| Spec file | Covers |
|---|---|
| `system-loads` | the built bundle initialises, `game.mosh` API present, the stylesheet's rules are live, all 13 DataModels registered, no 0e pack remains |
| `data-models` | every one of the 13 types creates with exactly its `template.json` defaults **in a real Foundry**; validation rejects a bad value and coerces a numeric string |
| `compendiums` | all 5 packs load with the document count their JSON source holds; the +/- macro pair survived the filename scheme; the android panic macros use the setting, not the hardcoded id; no document references a deleted 0e pack |
| `sheets` | all three actor sheets render, derived armour/net HP survive `prepareDerivedData`, and the repaired ship-macros window renders |

### Adapting it from a module to a system

- **No activation step.** A module must be enabled per world; a system is inherently active
  in a world built on it, so `global-setup` asserts world + system id and logs provenance.
- **Packs are de-symlinked per entry**, because `npm run setup` links each compendium
  individually rather than linking `packs` as a whole. Without that the test Foundry takes an
  exclusive LevelDB lock on the repo's packs.

### Two things the harness caught immediately

- **`Actor.create` returns `undefined` on a validation failure** — it does not throw. So a bad
  value fails the create silently from the caller's perspective and surfaces in the UI. That is
  the behaviour change the DataModel migration actually buys, and it is now pinned.
- **v14 injects package styles as `@import "…" layer(system)` in an inline `<style>`**, not as
  a `<link>`. My first spec asserted a `<link>` and failed; the CSS was loading correctly all
  along. Counting rules behind an `@import` means descending into each `CSSImportRule`.

### Found while writing the specs

`.macro-menu-button` — the only trigger for the ship macros window — is **commented out** at
`templates/actor/ship-sheet-sbt.html:132` and appears in no other ship template. So that window
has no UI route at all: the class was broken *and* unreachable. The spec drives the sheet's
`_onOpenMacros` handler, which is the path a restored button would take. Decide whether to
restore the button or drop the window.

### Harness health

A killed run leaves the GM session occupied (Foundry allows one session per user) and, with
`reuseExistingServer` on locally, the next run hangs 30s in `waitForGameReady` and fails in
`globalSetup`. Fix: `lsof -ti:30005 | xargs kill`. This bit twice while building the harness.

**Not in CI.** e2e needs a licensed Foundry and a migrated world, so `ci.yml` stays on the
vitest tier. Run it locally before a release.

---

## 10. Phase 4 — step 0 and the item sheet

Svelte is wired up (§Phase 4 step 0) and the **eight simple item types** — `item`, `weapon`,
`armor`, `ability`, `module`, `condition`, `crew`, `repair` — are ApplicationV2 + Svelte 5.

```
module/ui/document-store.svelte.js   the render-time snapshot every converted sheet reads
module/ui/i18n.js                    localize()
module/ui/item/ItemSheetApp.js       the DocumentSheetV2 shell (mount once, refresh per render)
module/ui/item/ItemSheet.svelte      header, tabs, description editor
module/ui/item/parts/                Field, CheckField, Editor, SheetHeader
module/ui/item/types/                one component per type (+ ArmorExtra, WeaponExtra)
module/ui/item/types.js              type → body / second tab
```

Eight `templates/item/item-*-sheet.html` deleted. `module/item/item-sheet.js` is registered
for nothing now and survives only as `MothershipSkillSheet`'s base; it dies with item 2.

### Conventions this conversion settles

- **The document stays the source of truth.** `createDocumentStore` holds a `$state.raw`
  snapshot; the shell calls `refresh()` on every render and the components re-read. Nothing is
  mirrored into local state, so a change from another client lands the same way as your own.
- **Foundry persists the form, not us.** Fields keep `name="system.…"` and the shell sets
  `form: {submitOnChange: true}`, which is exactly what AppV1's `ItemSheet` defaulted to. No
  per-field `update()` calls, and `FormDataExtended` still reads `data-dtype`.
- **Mount once.** `_renderHTML` caches the root node and the component; re-mounting per render
  leaks the old component and discards reactive state.
- **`{{editor}}` becomes `<prose-mirror>`.** The V1 editor markup only worked with AppV1's
  `activateEditor`. `HTMLProseMirrorElement.create()` is self-contained: it is a form input,
  and saving dispatches a bubbling `change` the sheet's form handler already listens for.
  Enriched HTML is computed in the shell (it is async) and passed through the store.
- **Don't port string concatenation.** `getData()` composed `ranges.short/medium/long` into
  `ranges.value` *and wrote it back onto the model while rendering*; it is now a `$derived`.

### A phase 3 regression this surfaced

**Armour stopped equipping when the DataModels landed**, and nothing caught it.

`system.equipped` is bound by the armor item sheet and both actor sheets, and
`_deriveCharacter`/`_deriveCreature` gate all armour points and damage reduction on it — with
unit specs. It was in **no** schema, and in no `template.json` either. Under `template.json`
Foundry kept unknown keys, so it worked; a `SchemaField` cleans them off, so every write was
accepted and discarded. Proved against a real Foundry both ways (with the armor model
registered and with it deleted at runtime).

Fixed by adding to `MoshArmor` and `template.json`, deliberately and in both:

| Type | Added | Bound by |
|---|---|---|
| `armor` | `equipped`, `features` | armor sheet; `_deriveCharacter`, `_deriveCreature` |
| `module` | `cost` | module sheet |

**Pinned by `test/sheet-bindings.test.ts`** — every `name="system.x"` a sheet binds must resolve
in that type's schema, across **all 13 types**. It reads the Handlebars templates *and* the
Svelte components, so it survived the conversion, and mutation-testing confirms it fails when
the field is removed. It would have caught this on the day.

Only unprefixed `name="system.…"` is checked. `armor.system.equipped` on the actor sheets
addresses an *embedded item*, not the actor, and is driven by a click handler rather than the
form — checking it against the actor schema would be wrong.

### The same bug on the Actor side — also fixed

The same audit over the actor templates found nine more. `character` was clean. Each was
decided rather than blanket-restored:

| Type | Field | Verdict | Why |
|---|---|---|---|
| `creature` | `xp.selectedSkill` | **store** | The 1e Skill Training textarea is live on the creature sheet. `character` already had it; the creature block was a copy that lost the field. |
| `ship` | `cost`, `owed`, `make` | **store**, as strings | The header inputs carry no `data-dtype`, so they submit strings, and `make` is a free-text "Make / Model / Jump / Class / Type" area. `2,000,000cr` is the kind of value the sheet is for. |
| `ship` | `transponder` | **store**, boolean | Live checkbox on the **default** SBT sheet, with an Enabled/Disabled readout beside it. |
| `ship` | `stats.{armor,combat,intellect,speed}.mod` | **store** — and on all 8 ship stats | `actor.js:1467` adds `stats[attribute].mod` to the target of *every* stat roll, for every actor type, and `_deriveShip()` is empty, so nothing recomputes it. Ship stat mods were silently ignored. Only four are exposed by `ship-sheet.html`; adding the other four closes the same latent hole rather than leaving it. |
| `ship` | `stats.oxygen.value` | **dropped — the binding was wrong** | Ship oxygen is `supplies.oxygen.value`, which is already in the schema and is where the rest of the supplies block lives. `stats.oxygen` was a typo; adding it would have enshrined it and split O2 across two places. `ship-sheet-sbt.html` now binds the real path. |

Note the earlier claim that the `.mod` keys were derived was wrong for ships: `_deriveShip()`
has an empty body. It **is** true for `character`/`creature`, where `_deriveCharacter` overwrites
`stats.armor.mod` with the equipped armour total on every prepare — so the armour `mod` input on
those sheets is decorative. That is existing behaviour, not a schema hole, and is untouched.

Existing ships lose nothing that still worked: `stats.oxygen` has been cleaned off every write
since phase 3, so the O2 field on a migrated ship already reads 0.

### Two warm-up fixes that shipped alongside

- **Two malformed `@UUID`s** in `lang/en.json` and `lang/pt-BR.json` read
  `Compendium.macros_triggered_1e.<id>` with no package scope, so both links were dead. Now
  `Compendium.mosh.macros_triggered_1e.<id>`, matching the 20 correct ones in the same files.
  Both target ids verified against `packs/_source/triggered/`.
- **`DLShipMacros` deleted**, with `templates/dialogs/ship-macro-dialog.html`, `_onOpenMacros`,
  and the commented-out `.macro-menu-button`. Every action it offered — distress, bankruptcy,
  maintenance, morale, deckplan — is already on the SBT ship sheet's own **Macros tab**, wired
  by `ship-sheet-sbt.js`. The popout was superseded, which is why its trigger was commented
  out; porting it into Svelte would have duplicated live UI. Its e2e spec was replaced by one
  asserting the surviving route.

### Verified

`npm run check` (tsc + svelte-check, 0 errors, 0 warnings) · **97 vitest** · **53 Playwright**.

The tiers are honest about this work, checked by mutation rather than assumed:

- flipping `submitOnChange` to `false` fails the two item-sheet persistence specs;
- removing a field from a schema fails `sheet-bindings` for the type that binds it, on both the
  Item and Actor halves;
- `data-models.spec.ts` writes each restored field and reads it back, so it fails on a field
  that exists with the right default but cannot be *stored* — which is exactly how the original
  bug hid from the defaults assertions.

Rendering was checked against the real headless Foundry, not eyeballed from the markup — which
is how the `.application` / theming problem in §Phase 4's hazards was found and fixed.


---

## 11. The 0e / `firstEdition` removal — done

The rules switch is gone. `firstEdition` defaulted to **true**, so the 1e path is what every
default install already ran; everything below collapses to it.

| Area | Removed |
|---|---|
| `module/actor/actor.js` | 21 refs across `rollTable`, `rollCheck`, `modifyActor` |
| Templates | 18 refs — 12 in `actor-sheet.html`, 3 each in `creature-sheet.html` and `item-class-sheet.html` |
| `module/settings.js` | the `firstEdition` registration and its 82-line stress-migration `onChange`; five `table0e*` settings |
| Sheets / components | the per-sheet `settings.firstEdition` copies, and the `firstEdition` prop through `ItemSheet.svelte` → `Armor`/`Weapon` |
| Schema | `weapon.system.settings.firstEdition`, from the model **and** `template.json` |
| Also | `halfDamage`, `system.other.resolve`'s 0e duplicate, one orphaned lang key, the 0e rows of the rolltable-config window |

`hideWeight` **survives**, relabelled from "Hide 0e Weight" — it still hides the weight columns,
and deleting the weight mechanic is a separate, larger decision nobody has taken.

### It was a repair, not just a simplification

**The 0e path was already broken.** Its five rolltable settings — the four `table0ePanic*` and
`table0eDeath` — point at documents that phase 3 deleted along with the 0e compendia. Verified
id by id: every `table0e*` default resolves to nothing, every `table1e*` default resolves to a
shipped table. Turning the setting off gave you a panic check against a rolltable that did not
exist.

`test/e2e/compendiums.spec.ts` now pins that invariant: every rolltable setting the system can
select must resolve to a real document. It asserts the count it checked (14) so it cannot pass
on an empty list.

### What was *not* covered, and why

**The unit specs were blind to this flag.** `test/parse-roll-result.test.ts` stubbed
`game.settings.get` to return `false` for everything except `useCalm`, so all 30 specs ran the
**0e** path — the branches being deleted. Flipping the stub to `true` changed nothing, which
proves the specs never reached those branches in either direction.

So the suites are not a safety net here, and a green run should not be read as one. The three
methods holding the 21 refs are `async` and end in `renderTemplate`/`ChatMessage.create`;
building a stubbing harness for them is really the phase-5 "split `actor.js` into tested
modules" job, not something to attach to this sweep.

What the removal was controlled with instead:

- **Every edit is a branch collapse, never a rewrite.** The three large `if/else` blocks in
  `rollCheck` were collapsed by brace-matching, then the retained text was diffed against the
  original true-branch: byte-identical.
- `node --check` after each mechanical pass, and the full `check` / `vitest` / `build` /
  `test:e2e` tiers after.
- A real world **reaching `game.ready`** with the setting and its 82-line `onChange` gone.

### Worth knowing next time

Two e2e runs failed at `waitForGameReady` and looked like a broken world. They were not: a
`kill -9` on the Foundry process left the LevelDB dirty, and a clean boot fixed it. The
client console showed no errors and `game.ready` came up `true`. Kill the port gently.


---

## 12. `creature-settings` — the FIXME resolved, and a data-loss bug behind it

**`_updateObject` should persist nothing.** The question the `FIXME` posed was the wrong one.

Every toggle in that window is *already* persisted, by its own `click` handler in
`activateListeners`, using the real update path and the actual checked value — including
`false`. So the premise recorded in §8, "a stat can be switched on but never off", was wrong:
switching off works fine. The `_updateObject` body was simply never-executed rubbish — its
branches re-wrote `true` over things already `true`, and `this.object.update({ formData })`
nests the form under a literal `formData` key, which is not an update path at all.

It never ran, either: the dialog has no submit button and the class sets neither
`submitOnChange` nor `submitOnClose` (both default `false`). The override exists only because
`FormApplication._updateObject` throws if a subclass omits it. It is now a documented no-op,
and the ApplicationV2 conversion should declare no form handler at all.

### The bug that was hiding behind it

`system.swarm` was **in no schema** — not in the model, not in `template.json` — while the
swarm toggle reads and writes it. Measured against a real Foundry:

| Step | Effect |
|---|---|
| Swarm **on** | combat 30 → **60** (multiplied by remaining wounds); the original is stashed in `system.swarm.combat.value` |
| — | the stash is cleaned off by the SchemaField, so it never reaches the database |
| Swarm **off** | restore reads `undefined`; the update is a no-op; combat **stays at 60** |
| Swarm on again | 60 → **120**, and so on |

So the toggle permanently multiplied a creature's combat stat and could never undo it. Same
fault as armour `equipped` (§10) — a live UI writing to a field no schema declares — but this
one destroys data rather than discarding it.

Fixed by adding `swarm: { enabled, combat: { value } }` to `MoshCreature` and `template.json`.
`data-models.spec.ts` now drives the handler's arithmetic end to end and asserts 30 → 60 → 30.

**Note the gap this exposes in `sheet-bindings`:** that spec only checks unprefixed
`name="system.…"`, and this dialog binds `name="actor.system.…"` with the real path in `id`
instead. It could not have caught this. The durable net for dialogs is the round-trip
assertion in `data-models.spec.ts` — write the field, read it back — not the binding scan.


---

## 13. The shared component layer — the decision (built: see §20)

**Decision taken: build the component layer before converting more sheets.** Reason: the sheets
left are the big ones (`actor-sheet` 638, `creature-sheet` 477, `ship-sheet-sbt` 566,
`actor-generator` 306+), and they repeat the same handful of shapes hundreds of times. Converting
them one at a time with bespoke markup writes those shapes out by hand over and over, and lets
each conversion invent its own dialect.

### The shapes, measured

Counted over the 28 remaining templates with HTML comments stripped. **Use these numbers, not the
first pass an agent produced** — that one reported 1 `textvaluewrapper` (really 18), merged
`circle-stat`/`circle-input` into a single figure of 63 (really 8 and 52), and counted raw
checkboxes as the `blankstat` pattern, which no longer occurs at all.

| Shape | Live count | Sheets using it |
|---|---|---|
| `a.item-control` action links | **81** | 6 of 6 |
| `li.item.flexrow` rows / `ol.items-list` | 52 / 24 | 6 of 6 |
| `input.circle-input` / `div.circle-statwrapper` | 52 / 18 | 4 |
| `div.tab[data-tab]` / `a.tab-select` / `nav.sheet-tabs` | 33 / 32 / 6 | 6 of 6 |
| `.dropitem` drop zones | 29 | 6 of 6 |
| `.rollable` stat labels (`data-key`/`data-roll`/`data-label`) | 26 | 3 |
| `.textvaluewrapper` / `.valuewrapper` | 18 / 3 | 4 |

So the build order is **ItemList + ItemRow + ItemControls** first (by far the biggest win, and
universal), then **CircleStat** (concentrated in `ship-sheet-sbt`), then **Tabs** and **DropZone**.
`Field`, `CheckField`, `Editor` and `SheetHeader` already exist in `module/ui/item/parts/` and
cover the rest; they will want promoting out of `item/` when a second sheet family uses them.

### How components relate to `css/mosh.css` — decided

**Hybrid.** Primitives keep the existing global class names, exactly as the item sheets do now, so
a conversion carries no visual risk. New layout goes in scoped `<style>` blocks. `css/mosh.css`
shrinks only where a component fully owns a shape.

Rejected: dismantling the 247-selector stylesheet into scoped styles as sheets convert. That is a
styling project with real visual risk attached to every conversion, and it would need screenshot
verification per component. Revisit once the component set is stable — CLAUDE.md's "styles move
into scoped `<style>` blocks" is the long-term aim, not the next step.

### How to run the remaining conversions

Delegate a whole conversion per agent, then review the diff and run the tiers yourself. Three
things constrain it:

- **e2e cannot run in parallel.** One Foundry, one GM session, `workers: 1`. Two agents running
  `test:e2e` hang each other. Agents can self-run `check` / `vitest` / `build` — those are fast
  and parallel-safe — but the e2e tier is the reviewer's job, per merge rather than once at the end.
- **`module/mosh.js` is shared.** Every conversion re-registers a sheet there. Give agents
  `isolation: "worktree"` and wire the registrations up on merge.
- **They are not independent units.** `module/item/item-sheet.js` is the base class for *both*
  `skill-sheet.js` and `class-sheet.js`, so it can only be deleted once both convert.
  `actor-generator.js` drives `class-sheet` data.

`ship-setup`, `ship-megadamage`, `settings-rolltables` and `skill-sheet` are genuinely mechanical.
`class-sheet` (mutates the model it renders from), `actor-generator` and `actor-sheet` are not —
do those one at a time with the most conventions in hand.

### One pattern to expect

**Three schema holes of the same shape turned up in three consecutive pieces of work** — armour
`equipped` (§10), nine ship/creature fields (§10), and creature `swarm` (§12). Phase 3 migrated
schemas type-by-type against `template.json` as the oracle, but `template.json` itself never
recorded fields the code had been writing loosely for years, so the oracle was incomplete.

Assume more exist in the windows still unconverted. **Every conversion should round-trip the
fields it touches** — write the value, read it back from `toObject()` — rather than trusting the
defaults comparison, which passes just as happily when a field cannot be stored at all.


---

## 14. The force-push — done, and a correction

`origin/master` went `e70d25b` → `d2afdad7` (forced), replacing 597 commits of pre-rewrite
history with the 606-commit rewritten one. Pushed with
`--force-with-lease=master:e70d25b…` rather than a bare `--force`, so it would have aborted if
the remote had moved since the check. `master` now tracks `origin/master`.

**The correction.** §6a claimed `origin` was "the whole safety net" and the only recovery route,
making the push a point of no return. That was wrong: the pre-rewrite objects were still in this
clone the entire time — 597 commits in a 285 MB pack, unreachable from any ref but very much
present. `filter-repo` had unlinked them, not deleted them. That is also why `.git` measured
**393 MB** against the 102 MB this document recorded after the rewrite.

So the push was reversible right up until the cleanup that followed it, which was not what
anyone reading §6a would have believed.

**Both copies are now gone, on purpose.** After confirming the remote held every commit, the
unreachable objects were pruned:

```
git reflog expire --expire-unreachable=now --all   # current branch's reflog left intact
git gc --prune=now
```

`.git` **393 MB → 102 MB**, one pack, `fsck` clean, all 606 commits intact. The 19 committed
release zips are unrecoverable from git; they belong in GitHub Releases (§1.4), which is the
whole reason they were purged.

**The lesson worth keeping:** "the objects are gone" and "no ref points at the objects" are
different claims, and this document conflated them for the entire life of the rewrite. Check
with `git cat-file -e <sha>` before asserting either.


---

## 15. The manifest — repointed

`system.json` advertised the upstream fork, so a system installed from it would have taken its
updates and downloads from `Futil/foundry-mothership`:

| Field | Was | Now |
|---|---|---|
| `url` | `github.com/Futil/foundry-mothership` | `github.com/rune-goblin/foundry-mothership` |
| `manifest` | `raw.githubusercontent.com/Futil/…/0.6.1/system.json` | `…/rune-goblin/…/releases/latest/download/system.json` |
| `download` | `…/Futil/…/releases/download/0.6.1/foundry-mothership.zip` | `…/rune-goblin/…/releases/download/v0.6.1/mosh.zip` |

Two things beyond the owner change:

- **`manifest` must be version-independent.** It pointed at a tag, so Foundry re-fetching it
  would forever see 0.6.1 and never offer an update. It now points at `/releases/latest`, which
  `release.yml` feeds by attaching `system.json` to every release.
- **`download` is version-*specific*, and is now stamped by CI.** The workflow already stamped
  `.version` from the tag but left `download` hardcoded — so the next release would have shipped
  a manifest pointing at the previous release's zip. That is exactly how the URL came to be
  stale at 0.6.1 in the first place, so the fix is in `release.yml`, not just in the file. Also
  corrected: the zip is `mosh.zip`, not `foundry-mothership.zip`.

Dry-run of the stamp step against a hypothetical `v0.7.0` tag produces
`download …/releases/download/v0.7.0/mosh.zip` with `manifest` untouched.

**Not changed, on purpose:** `authors` still credits Futilrevenge and hollowphoton — correct
attribution for a fork. The README screenshot is still hosted on the upstream repo's asset CDN
(`README.md:16`); it renders today but breaks if that repo goes away.

`release.yml` exists and is complete, contrary to §Phase 2 item 4, which lists it as not done.


---

## 16. The dev install — `setup` and `deploy`

The house pattern is two scripts, and MoSh only had one. The template's `setup` symlinks for
live editing and its `deploy` copies a link-free install matching the release zip; MoSh had
`setup` and nothing to rehearse a release with.

`npm run deploy` now exists, ported and adapted for `systems/` rather than `modules/`. Its file
list mirrors `release.yml`'s include-list on purpose — if the two drift, `deploy` stops being a
rehearsal of what ships.

### Symlink or copy — it is not a system/module question

It is dev-versus-distribution, and both scripts exist for that reason. But two hazards do bite
harder for a system, and both had already bitten this repo:

- **Pack locks.** Foundry takes an exclusive LevelDB lock on every pack it can see and compacts
  them in place. A module can be disabled per world; a system is inherently active in any world
  built on it, so the lock is unavoidable. **`setup` now copies `packs/` instead of linking it**
  — the packs are gitignored build output, and linking let a running Foundry mutate them and
  block `packs.sh`. Cost: re-run `npm run setup` after `packs.sh pack`.
- **Migration blast radius.** A system change can migrate a world, and a symlinked dev install
  means an in-progress schema edit is live against real campaigns. Both scripts now warn when
  the target data directory holds worlds, and both honour `FOUNDRY_DATA` so schema work can be
  pointed at a scratch directory. The e2e harness already had the right instinct — it clones
  into `test/foundry-data/` rather than touching real data.

### A bug the verification caught

The first `deploy` left **2 symlinks** behind. `copyFileSync` onto a path that *is* a symlink
writes *through* it, so deploying over a `setup` install copied `system.json` and
`template.json` back into the repo and left the "link-free" copy still pointing at the working
tree. Fixed by `rmSync`-ing the destination first, which drops the link rather than its target.

Verified end to end against a scratch data dir: `setup` → 7 symlinks + copied packs; `deploy`
over the top → **0 symlinks**, contents matching the release include-list, no `_source`, no
LOCK/LOG, 5 packs with `.ldb` data, and the repo untouched.


---

## 17. Hard fork — stated, and the README repaired

**Decided: this is a hard fork of `Futil/foundry-mothership`.** Not a tracking fork; upstream
changes are not merged, and the divergence is already irreconcilable in both directions — the
build was replaced (gulp → Vite), the data layer moved to v14 DataModels, the 0e rules and
compendia were deleted, and the sheets are being rewritten as ApplicationV2 + Svelte.

The README now says this in as many words, and follows the house shape set by
`mothership-survival-guide`: title, screenshot, fork paragraph, features, an **Installation**
section with the manifest URL, then licensing.

Also corrected there: it advertised *"Full 1e AND 0e system support"*, which stopped being true
when §11 removed the 0e branches.

### The screenshot no longer hotlinks upstream

`README.md` embedded its screenshot from `github.com/Futil/…/assets/982251/…` — a live
dependency on the forked-from repo's asset CDN. It is now `docs/screenshot.jpg`, committed
here, and **deliberately tinted magenta with a "PLACEHOLDER — replace with your own" banner**
so it cannot be mistaken for current art. Downscaled 2547px → 1600px and 2.2 MB → 342 KB on
the way in.

`docs/` is **not** in `release.yml`'s include-list, so the placeholder never ships to users.
`system.json` declares no `readme`, so Foundry never renders it either — GitHub is the only
place it is seen.

The only remaining reference to the upstream repo is the attribution link in the fork
paragraph, which is intentional.

### The package id collided with upstream — renamed, see §18


---

## 18. `mosh` → `mothershiprpg`

The system ships as **`mothershiprpg`**, titled **Mothership (Unofficial)**, version **0.0.0**.

### Why not `mosh`, and why not `mothership`

Checked against the live registry, with `pf2e`/`dnd5e` as controls because the first endpoint
tried returned 404 for everything and would have given a false "available":

| id | `foundryvtt.com/packages/…` | |
|---|---|---|
| `mosh` | **200** | "MoSh - Unofficial Mothership" — upstream's own registration |
| `mothership` | **200** | "(0.6.6 Only) Mothership RPG (unofficial)" — a *different* system |
| `mothershiprpg` | 404 | free |

So `mosh` was already taken by the package this forked from, and `mothership` by an unrelated
one. Two systems sharing an id also collide locally — both install to the same
`Data/systems/<id>` — so this was never only a registry concern.

### What moved, and what deliberately did not

| Changed | Kept |
|---|---|
| `id`, `title`, `version`, `esmodules`, `styles`, `download` | 196 `.mosh` CSS class names |
| `game.mothership` → `game.mothershiprpg` (220 refs, 208 of them shipped macros) | `Mosh.*` localization keys |
| 193 `game.settings.*('mothershiprpg', …)` scopes | `css/mosh.css`, `module/mosh.js` filenames |
| 7 `registerSheet("mothershiprpg", …)` | |
| 636 `systems/mothershiprpg/…` runtime paths | |
| 353 `Compendium.mothershiprpg.…` references | |
| `SYSTEM_ID` in `foundry-data.ts`, `packs.sh`, `setup-test-env.ts`, the e2e fixtures | |

**The API matches the id, and the reason is not collision.** Two systems can never both be
active — Foundry loads exactly one system per world — so `game.mosh` and `game.mothership` could
never have coexisted. Nor does Foundry require the match: `game.<x>` is just a property the
system assigns during `init`, and a hyphenated id could not match even in principle.

It matches because the API name is what 208 shipped macros *type*.
`game.mothershiprpg.rollItemMacro("Frag Grenade")` names its own dependency; `game.mothership`
did not. One string now identifies the package in settings, packs, paths and macros alike.

The cost is that a macro a user has already copied out of a compendium into their own hotbar
keeps calling the old name and breaks silently. With the id change already invalidating every
existing world, that cost is currently zero — which is precisely why this was the moment to do
it rather than later.

The CSS classes and lang keys stay: internal, no external contract, and renaming them is churn
with visual risk while the sheets are mid-conversion to Svelte.

### Consequences, and the two traps hit on the way

**Every world made on `mosh` is unlaunchable.** Foundry has no rename migration: a world's
`world.json` names its system, and there is no installed `mosh` any more. Accepted — new worlds
will be made. `version: 0.0.0` compounds it: Foundry also refuses a world whose recorded
`systemVersion` is *newer* than the installed system, so even after repointing `system`, a world
stamped `0.6.1` still will not launch. Anyone wanting old worlds to open would need a version
above 0.6.1 instead.

`setup-test-env.ts` now rewrites both fields in the **clone**, so the harness runs against a
pre-rename world without touching the original.

Two things the verification caught that a grep would not have:

- **`template.json` and `system.json` were missed by the sweep** — both are root-level files and
  neither was in the rewrite roots, so the ship artwork paths and the three system media paths
  kept pointing at a system id that no longer existed. The DataModel equivalence spec failed on
  exactly that, which is what it is for.
- **`SYSTEM_ID` is not in scope inside `page.evaluate`.** Substituting the imported constant into
  browser-side callbacks compiled fine and threw at runtime. The specs now read `game.system.id`
  from the page instead, which is self-checking.

**A third miss surfaced later, in `css/mosh.css`** (found while building §20's component layer —
the Vite build warns about unresolvable asset URLs, and the warning named `/systems/mosh/`). Two
absolute `url()`s, `#logo` and `#pause > img`, still addressed the old system id, so the branding
logo and the pause overlay had been 404s since the rename. Fixed to
`/systems/mothershiprpg/images/…`. That makes three root-level or non-obvious files the sweep
missed; the pattern is that it rewrote *code* roots and left the ones that only carry paths.


---

## 19. The content-module merge — both third-party modules dropped

Folding the sibling Mothership content modules into the system was a parked intention. Both
third-party ones are now **out**, and the reason is provenance rather than effort.

| Module | Licence as it stands | Merged? |
|---|---|---|
| `mothership-survival-guide` | **GPL-3** (`LICENSE` file), from hollowphoton's `fvtt_mosh_1e_psg` | **No** |
| `mothership-character-builder` | **none declared**, authored by **Naurgul** | **No** |
| `mothership-data` | rune-goblin's own transcription **from the published book** | Yes |

**The GPL one would have relicensed the system.** This project is MIT; GPL-3 is copyleft and
travels one way — MIT code can be taken into a GPL work, GPL code cannot be relicensed MIT. So
absorbing that module would have made the whole system GPL-3 as a side effect, and the GPL-3
came from the upstream it forks, so it was never rune-goblin's to change.

**The other one looked safer and was not.** No licence is not permissive: with nothing granted,
nothing is granted. Third-party work with no licence is a *weaker* position to merge from than
GPL, not a stronger one.

Both repositories are untouched and stay published. They simply stay modules.

**What merges instead was transcribed from the published book**, not extracted from either
module. That matters more than it sounds: it is an independent source, so nothing in it derives
from Naurgul's or hollowphoton's work, and no third-party code licence reaches it. The GPL-3
and the missing licence are simply not in the chain.

The remaining constraint is the one that was always there and is unaffected by any of this: the
content is Mothership, so shipping it answers to **Tuesday Knight Games' third-party policy**,
not to any module licence. That is the framing `README.md` and `LICENSE.txt` already carry —
unofficial, non-commercial, TKG's IP — and it applies to a transcription exactly as it applies
to anything else.

### The mechanical consequence, when it happens

Content referenced as `Compendium.<module-id>.<pack>.<id>` becomes
`Compendium.mothershiprpg.<pack>.<id>`, so any world or macro pointing at the old ids breaks —
the same class of break as §18, and best done in the same window as that one if it is going to
happen at all.


---

## 20. The shared component layer — built

§13 measured the shapes and set the order; this is what landed. Twelve new files plus the four
promoted out of `item/parts/`, all under **`module/ui/parts/`**:

```
activate.js       onActivate(handler) -- the Enter/Space twin every click-only element needs
drop-target.js    dropTarget(onDrop) -- a Svelte attachment, replaces AppV1's dragDrop config
ItemList          ol.items-list
ItemRow           li.item.flexrow, + .item-header or .draggable + data-item-id
ItemImage         div.item-image, with or without the 24px thumbnail
ItemCell          div.skill-stat, optional flex-grow, optional click
ItemControls      div.item-controls
ItemControl       a.item-control with a Font Awesome glyph
Tabs              nav.mosh.sheet-tabs.tabs + a.tab-select, `active` is bindable
TabPanel          div.tab[data-tab], renders only when active, takes an optional attachment
CircleStats       the three circle-statwrapper variants
CircleStat        div.resource.circle-stat + a sibling div.circlestatlabel
Field CheckField Editor SheetHeader   promoted from module/ui/item/parts/
```

Per §13 the primitives emit the **global** class names from `css/mosh.css`; no component owns
its styling and none carries a `<style>` block.

### Three things worth carrying forward

- **`.dropitem` is gone from rows, on purpose.** It was never styled — it existed only as the
  jQuery selector AppV1's `options.dragDrop` bound to. `ActorSheetV2` drags from `.draggable`,
  and drops now arrive through the `dropTarget` attachment, so `ItemRow` emits `.draggable` +
  `draggable="true"` + `data-item-id` instead.
- **Drops are an attachment, not a selector.** AppV1 re-bound `dragDrop` on every render. A
  Svelte component **mounts once** while ApplicationV2 re-renders many times, so selector
  re-binding would stack duplicate listeners on the same node. `{@attach dropTarget(fn)}` binds
  to the node it is written on and tears down with it. `{@attach undefined}` is inert (Svelte
  guards with `if (fn)`), so `TabPanel`'s `attach` prop is genuinely optional.
- **Click-only elements need a keyboard twin or `npm run check` fails.** `svelte-check` runs at
  0 warnings, and its a11y rules reject an `onclick` on `<a href-less>` / `<div>` without
  `role`, `tabindex` and a key handler. `ItemCell` and `CircleStat` build those as one spread
  object — a *dynamic* `tabindex` beside a *dynamic* `role` trips `a11y_no_noninteractive_tabindex`,
  and the spread is opaque to that analysis while rendering exactly the same markup.

### How it is verified

Two consumers and one contract test.

`module/ui/item/ItemSheet.svelte` was retrofitted onto `Tabs` + `TabPanel`, so the eight
converted item sheets exercise them under the existing e2e specs (including the one that clicks
`a.tab-select[data-tab="item"]`). The retrofit was proved to be a pure refactor by diffing the
sheet's **rendered markup** out of the real headless Foundry before and against after: the only
differences are attribute ordering, Svelte's `<!---->` block anchors, and a cosmetic double
space in `class="tab  active"`.

**`test/ui-parts.test.ts`** (22 specs, jsdom) mounts every primitive and asserts the selector the
stylesheet actually keys off. That is the point: the hybrid decision makes each class name a
contract with a stylesheet no compiler ever sees, so renaming one in a component would otherwise
lose the styling silently with every tier still green. It is also the *only* thing holding
`CircleStat` and `CircleStats` to their shape — they have no converted consumer until
`ship-sheet-sbt`.

Checked by mutation, not assumed: **13 mutations, 13 failures.** Renaming `.items-list`,
`.skill-stat`, `.circle-input`, `.tab-select` or the `circle-statwrapper-` variant prefix;
dropping `.draggable` from rows; making `onActivate` ignore Enter; losing the space before a
control's label; making `TabPanel` ignore its attachment; and three separate breaks of
`dropTarget` (either `preventDefault`, and the payload parse) each fail the specs that cover them.

`jsdom` is a new devDependency and `"svelte"` joins `types` in `tsconfig.json` — without the
latter's ambient `declare module '*.svelte'`, a `.ts` spec cannot import the components it mounts.

**Verified:** `npm run check` (0 errors, 0 warnings, 226 files) · **119 vitest** (97 + 22) ·
**57 Playwright** · `npm run build`.


---

## 21. `skill-sheet.js` — converted, and two bugs it had been hiding

Phase 4 item 2. `MothershipSkillSheet` (AppV1, extending `MothershipItemSheet`) and
`templates/item/item-skill-sheet.html` are gone, replaced by:

```
module/ui/skill/SkillSheetApp.js   MoshSkillSheet extends MoshItemSheet
module/ui/skill/SkillSheet.svelte  built entirely from module/ui/parts/ (§20)
```

`module/item/item-sheet.js` **stays** — `MothershipClassSheet` is its last user, so it dies with
item 5, not this one.

### The shell became a base class rather than a copy

`MoshItemSheet` gained `static COMPONENT` and a protected `_context()` (was a private
`#context()`). `MoshSkillSheet` overrides both — swapping the root component and adding the
resolved prerequisites — and inherits mount-once, the store, the form handling and the theming
untouched. That is the pattern for `class-sheet.js` too.

### Two bugs fixed rather than ported

**Deleting a prerequisite had never worked.** `system.prerequisite_ids` holds **UUIDs** — the
drop handler pushed `droppedObject.uuid`, and `actor-generator.js:321` reads the array back with
`skillsUuid.includes(item)`. But the delete handler filtered it by `li.data("itemId")`, and the
row's `data-item-id` was the *resolved skill's `_id`*. A UUID never equals an `_id`, so the
filter removed nothing: you could add a prerequisite and never remove one. Rows are keyed by
UUID now and delete by UUID.

**A dangling reference rendered as a blank, undeletable row.** `fromUuid` returns `null` for a
deleted skill and the old `getData()` pushed that straight into the render list. Unresolvable
entries now render under their raw UUID — with a `title`, because `.skill-name` clips and a UUID
does not fit — and carry the same working delete control. Nothing is dropped from the stored
array implicitly; the user clears it deliberately.

Also closed the `//todo` the old `_onDrop` carried: a drop whose UUID is already listed is
ignored instead of appended twice. The `typeof … == 'undefined'` guard is gone — the DataModel
guarantees the array.

### Two things the conversion had to decide

- **Rows here are not draggable.** `ItemRow` makes an identified row draggable by default,
  which is what an actor sheet wants. This is a `DocumentSheetV2` with no dragstart handler, so
  a draggable row would offer a drag nothing listens for; the sheet passes `draggable={false}`.
- **`{#each}` is keyed `` `${index}-${uuid}` ``, not by UUID alone.** The old sheet appended
  without a duplicate check, so an existing world can hold the same UUID twice and a
  UUID-keyed each would throw on it. Identity, the row attribute and deletion are all still by
  UUID, and deleting a legacy duplicate clears both copies.

### Verified

`npm run check` (0 errors, 0 warnings) · **120 vitest** · **64 Playwright** · build.

`test/e2e/skill-sheet.spec.ts` is 8 specs covering what this sheet owns, and per §13 it
**round-trips** every field it touches through `toObject().system` rather than trusting a
defaults comparison. Checked by mutation against the real Foundry, not assumed:

| Mutation | Result |
|---|---|
| delete filters nothing (reproduces the original `_id` bug) | **2 specs fail** |
| the duplicate-drop check is removed | 1 spec fails |
| unresolvable prerequisites are hidden instead of listed | 1 spec fails |
| a drop that is not a skill is accepted | 1 spec fails |

The first pass of that table found a real gap — nothing dropped a **non-skill**, so the type
guard was untested — and a spec was added for it. `data?.type !== 'Item'` remains **not
independently covered**, and cannot be: an Actor drop fails the skill-type check anyway, so the
`Item` test is a cheap early-out rather than a distinct behaviour.

Rendering was checked against real headless Foundry: bonus and rank sit side by side in the
horizontal wrapper, the tabs underline, and the prerequisite table shows the name pill, rank,
bonus and the delete control — including for a dangling UUID.

### One process note

The conversion ran in an isolated worktree, which branched from **session start** rather than
from the component-layer commit. The agent therefore found no `module/ui/parts/` and rebuilt a
parallel version of it. Only the skill-specific half was merged, re-based onto the committed
primitives. Worth checking a worktree's merge base before briefing an agent to build *on* work
that has just landed.


---

## 22. The simple windows — two converted, one deleted

Phase 4 item 3. Three windows were queued; only two were worth converting.

```
module/ui/ship/ShipSetupApp.js           + ShipSetup.svelte
module/ui/settings/RolltableConfigApp.js + RolltableConfig.svelte
```

`module/windows/` now holds only `actor-generator.js` and `ship-deckplan.js`; three
`templates/dialogs/` files are gone.

### `ship-megadamage` was deleted, not converted

The same call as `DLShipMacros` in §10, for the same reason. The SBT ship sheet has its **own**
`_prepareMegadamage` building the identical circle list into `system.megadamage.html`, rendered
in the live sidebar Megadamage tab and toggled by its own handler. The popout duplicated all of
it, and its trigger `.megadamage-menu-button` had been commented out in the template. Converting
it would have put a second Svelte implementation of the same tracker in front of item 6.

**Check reachability before converting a window.** Both this and `ship-setup` had commented-out
triggers, which is not visible from the window's own source. Grep the sheet template for the
selector its listener binds, and confirm the markup is not inside `<!-- -->`.

### `ship-setup` was dormant, not superseded — so it was wired back up

Its trigger was commented out too, but nothing else offers what it does: it rolls the
Maintenance Issues table `1d5+1` as a used ship's starting condition, which is **not** the live
`.maintenance-button` (`actor.maintenanceCheck()`). The commented-out "Roll Starting Condition"
button on the Macros tab is even bound to that wrong handler. So the wrench icon in the
biography tab was uncommented and the window is now reachable, verified by clicking it in a real
Foundry.

### The megadamage tracker had never visibly worked

Deleting the popout makes the SBT sheet's copy the only megadamage UI, so it was worth proving
it works. It did not.

`system.megadamage.hits` is an `ArrayField(StringField)`, so a stored hit is always a **string**.
Both the render check and the click handler compared it against the **number** jQuery's
`.data("key")` yields. Measured against a real Foundry: writing `[3]` stores `["3"]`, and the
sheet then renders `filledCount: 0, hollowCount: 9` — every taken hit drawn hollow. The same
miscompare in the handler meant re-clicking a set hit **appended a duplicate** rather than
clearing it. `actor.js:1231` was unaffected: `Math.max` coerces.

Fixed by coercing on both sides, and the handler now builds a new array instead of splicing the
live model's. Pinned by `test/e2e/ship-megadamage.spec.ts` (4 specs), which asserts on the
generated `megadamage.html` rather than the DOM so it stays meaningful across item 6.

**This is a stopgap and item 6 owes the real fix.** The sheet persists rendered HTML into the
document *while rendering* (`await this.object.update({"system.megadamage.html": …})` inside
`getData`), which is why `megadamage.html` exists as a schema field at all — a Handlebars
template can only render a precomputed string. In runes the list is `$derived` from `hits` and
the table entries, nothing is written during render, both HTML fields become dead, and the type
bug stops being possible because there is one coercion point instead of two. That is item 6's
job, not a piecemeal edit to an AppV1 sheet mid-phase.

The render-write also has a testing consequence worth knowing: the sheet re-renders on every
megadamage change, so Playwright never sees a circle "stable" enough to click. Dispatching the
delegated `mousedown` the handler actually listens for works and is not flaky.

### Four localization keys never existed

`Mosh.ShipSetup`, `Mosh.RollStartingCondition`, `Mosh.Finish` and `Mosh.MegadamageEffects` were
referenced by these templates but present in **neither** `lang/en.json` nor `lang/pt-BR.json`, so
the buttons rendered their raw key strings. Nobody had noticed because neither window was
reachable. Added to both files.

### Two things the review caught in the agents' work

- **`ship-setup`'s call site passed `top`/`left` flat.** AppV1 read those directly; ApplicationV2
  reads `options.position` and ignores anything else, so the popout would have opened centred
  instead of beside the sheet. Nested.
- **The worktree base.** Unlike §21's run, all three worktrees were correctly based on `master`
  — the brief told each agent to check `git rev-parse master` and `git reset --hard master`
  before starting. That is now the standing instruction for a worktree agent building on work
  that has just landed.

### Verified

`npm run check` (0 errors, 0 warnings) · **120 vitest** · **75 Playwright** · build.

`registerMenu` accepting an ApplicationV2 was the one real risk in the rolltable window and was
checked in the installed `foundry.mjs` before briefing: it takes a `FormApplication` **or** an
`ApplicationV2` subclass and throws otherwise. The spec drives the real path —
`game.settings.sheet` → the system tab → the submenu button — rather than constructing the class.


---

## 23. Queued — the Svelte architecture audit

**After the sheet conversions, not during them** — scheduled as C14/C15 in
`docs/plans/architecture.md`, which also gives the CSS dissolution an order and a
verification method. Every conversion so far deliberately preserves AppV1-era
shapes so that a conversion carries no visual or behavioural risk: the primitives emit the global
class names from the hand-authored `css/mosh.css` (§13's hybrid decision, §20), and designs
inherited from Handlebars are ported rather than rethought.

Those are compromises with a scheduled end. What the audit should revisit, as it accumulates:

- **The hybrid CSS decision itself.** §13 parked "dismantle the 247-selector stylesheet into
  scoped styles" as a styling project with real visual risk, to revisit once the component set is
  stable. That is the audit.
- **Presentation persisted into documents.** `ship-sheet-sbt` writes `megadamage.html` during
  render (§22); `class-sheet.js` writes `from_list_names` and `skills_granted_object` onto the
  model while rendering (§Phase 4 hazards). Both should be `$derived`, and the schema fields that
  exist only to hold rendered strings should go.
- **Anything else a conversion flags.** The rule during phase 4 is: port, verify, ship, and
  **record** the compromise here — do not fix component architecture piecemeal mid-phase.


---

## 24. Phase 0 — the prune, the ratchet, `creature-settings`, and a deletion undone

The first phase of the re-sequenced plan (`docs/plans/architecture.md`). Four things landed.

### P0.2 — the audited dead fields, and a test so the audit does not have to be repeated

Eight leaves that no code and no template referenced came out of the DataModel **and**
`template.json` together: `weapon.wound` (not `woundEffect`, which is used), `ability.text`,
`crew.text`, `module.offline`, `class.source`/`author`/`link`, and the duplicate top-level
`character.stressdesc` — `system.other.stressdesc.value` is the one the sheet and the generator
actually read. The ship half of the same audit is **deliberately still in the schema**; it comes
out with C11, so phases 1–2 touch no ship schema and the SBT megadamage specs cannot be disturbed.

`test/field-usage.test.ts` turns the one-off measurement into a ratchet: walk every declared leaf
through `test/field-stubs.ts`, and fail unless each is referenced as a literal `system.<path>` in
`module/` or `templates/`, or excused by an allowlist. Three allowlists, because the reasons
differ — **DYNAMIC** (reached by computed key or object literal: `stats[attribute].label` /
`.rollLabel` / `.mod`, and `netHP.min`/`.label` written as a literal at `actor.js:44,81`),
**DEFERRED_TO_PHASE_3** (dead and scheduled for C11), and **GRANDFATHERED** (dead, unaudited, and
labelled as such — resource-pool `min`/`max` and the labels the sheets hardcode; the list should
only ever shrink).

Two meta-tests stop the allowlist rotting into a rubber stamp: every entry must still match a
declared leaf, and no entry may excuse a leaf that has a literal reader. **The second one earned
its place immediately** — it rejected two patterns written while the spec was being drafted,
because `stats.armor.mod` and `health`/`hits`/`netHP` `.max` are all genuinely read.

### P0.3 — `creature-settings` on ApplicationV2

`module/settings/creature-settings.js` (the last bare `FormApplication` but one) and
`templates/dialogs/creature-settings-dialog.html` are gone, replaced by
`module/ui/creature/CreatureSettingsApp.js` + `CreatureSettings.svelte`. `module/settings/` held
nothing else and no longer exists.

§12's ruling held: **the conversion declares no form handler for the toggles that need one and
none for the rest.** The six stat toggles keep `name="system.stats.<stat>.enabled"` and ride
Foundry's own `submitOnChange`, exactly as the item sheets do — six hand-written click handlers
deleted, replaced by nothing. The swarm toggle is deliberately **unnamed**, so it never reaches
`formData`, and owns an explicit handler because it carries arithmetic plain form persistence
cannot express. That handler now issues **one** batched update where the old code issued two.

Two deliberate changes worth knowing: the window takes `DocumentSheetV2`'s per-document id instead
of the old fixed `sheet-modifiers`, so two creatures can now have two settings windows open; and
all seven toggles render through `CheckField`, so their markup changed together and consistently.

### The z-order finding, which turned out to be a spec bug

The first e2e run failed because the settings window opened *underneath* the creature sheet — the
inputs could not be clicked. Measured, not guessed: the window at `z-index: 101`, the sheet at
`102`. It reads exactly like a product bug, and it is not one. **AppV1's `render()` resolves
before its DOM injection finishes**, and its late `_render` bumps the z-index counter that both
window generations share. The spec was firing the header button mid-render. Waiting for the sheet
to be visible first fixes it, and a real user cannot hit that interleaving. Recorded because the
same trap is waiting for every remaining conversion that opens a V2 window from a V1 sheet.

### P0.1 was wrong, and is undone

`d279206` deleted three dialog templates on the finding that they were referenced by nothing and
that `actor.js` "builds all three dialogs inline with DialogV2". Verifying that finding is what
this phase was supposed to do, and the finding did not survive it. `actor.js` builds the
**dialogs** inline; it does not build their **content**:

| | |
|---|---|
| `distressSignal()` | rendered `distres-signal-dialog.html` — **one `s`**, a path that has never existed in any commit. `renderTemplate` rejects, the promise never resolves, and the dialog never opens. |
| `maintenanceCheck()` | `msgContent = ``​`` — an empty template literal. |
| `bankruptcySave()` | the same. |

So the templates were not superseded. The code had lost its content, and deleting them destroyed
the only copy. All three are reachable from `ship-sheet-sbt.js:316,322,328` — the **default** ship
sheet — and `maintenanceCheck` and `bankruptcySave` are called by shipped compendium macros too.

Restored from `d279206^` and repaired, because they carried defects of their own that plausibly
explain why they were stubbed out: `minteance-check-dialog.html` had an **unterminated Handlebars
expression** (`{{ localize 'Mosh.SelectYourRollType:</h4>`) so it could not compile at all, and a
Major Repairs sentence that stopped mid-clause; `bankrupcy-save-dialog.html` had a **trailing space
inside a localization key**. Three keys the templates wanted did not exist under those names —
`MayorRepairs`, `MayorRepairsExplanation` and `OrQuarterAsDeterminedBWarden` were the strings, with
zero references anywhere — renamed to the correct spellings in `en` and `pt-BR` together.
`Mosh.BankrupcySave` keeps its misspelling: `actor.js` reads it. Filenames corrected while all
three call sites were being rewritten anyway.

`test/e2e/ship-dialogs.spec.ts` asserts the **localized prose**, not the markup, because both
failure modes here — a template that will not compile, a key that does not resolve — leave the
dialog frame looking perfectly fine. One test scans all three for a raw `Mosh.` key or an
uncompiled `{{`.

**The lesson is the one this repo keeps relearning, pointed the other way.** Four dead sources have
been found and deleted here, each genuinely dead. That track record is exactly what made the fifth
finding easy to accept without checking whether the *code* still wanted what it referenced. "Grep
found no references" answers a different question from "is this content still needed" when the
reference that should exist is misspelled.

### One trap for mutation testing, worth writing down

The first mutation run **passed**, which is the wrong answer, and the spec was fine. `module/ui/**`
only reaches the running Foundry through `dist/`, and `npx playwright test` reuses the existing
server without rebuilding — only `npm run test:e2e` does `build && packs.sh pack && playwright`.
Mutating a `.svelte` file and re-running Playwright therefore tests the *old* bundle. `templates/`
and `lang/` are symlinked live and do not have this problem, which is why the dialog mutations
behaved. **A mutation check of anything under `module/` needs `npm run build` between the mutation
and the run**, or it proves nothing.

### Verified

`npm run check` 0 errors / 0 warnings (229 files) · **135 vitest** (120 + 15) · `npm run build` ·
`npm run check:e2e`. Mutation-checked, each with a rebuild: breaking the swarm stash fails the
swarm spec; dropping `submitOnChange` fails the persistence spec; an unread schema field fails the
usage ratchet; a stale allowlist entry fails the honesty check.


---

## 25. The PSG cut — ships, the Calm variant, and 13,000 lines

**The project changed shape.** `docs/plans/psg-core.md` supersedes `architecture.md`'s phases 1–3:
the system now implements Mothership 1e's **Player's Survival Guide, completely and only**, and
extends one book at a time. The Warden's Operations Manual is next; the Shipbreaker's Toolkit
brings ships back.

Everything cut is preserved on the **`archive/pre-psg-cut`** branch and tag, both pushed to the
remote *before* a single deletion. Ships return by cherry-pick, not by re-authoring.

### Why the previous plan died

`architecture.md` was built around *preserving* the inherited packs: an id registry seeded to keep
269 `@UUID` cross-references alive, a one-way-door rescue with an enumerated-transform proof, and a
phase 3 paying down the ship sheets' debt. All of that exists to protect content that is now
deleted, so it went with the content — C10–C13 entirely, the rescue program, the derived/rescued
two-tier split, and §22's ship debt.

The trade is lopsided in the cut's favour: **811 lines of ship sheets out of 8,776 lines of runtime
code — 9%.** The roll engine, the e2e harness, the Vite/TS build and the whole converted
`module/ui/` layer are character-side and survive untouched. That is why this was a deletion in
place rather than a new repository.

### What went

| | |
|---|---|
| Code | both ship sheets, `ship-deckplan`, `ShipSetup`, the `ship` actor type and the `module` / `crew` / `repair` item types — in the DataModels, `template.json` and `system.json` in lockstep |
| `actor.js` | ~300 lines: `_deriveShip`, `distressSignal`, `maintenanceCheck`, `bankruptcySave`, `moraleCheck` and their branches inside `rollTable` and `rollCheck` |
| Content | the 100-item maintenance pack, 4 ship tables, 3 panic variants, 39 conditions, 44 orphaned macros |
| Settings | 4 ship table ids, plus `useCalm` and `androidPanic` |
| Localization | 54 flat keys, `table.distress_signal`, `table.maintenance_issues`, the whole `attribute.calm` tree and 3 ship stats — in **both** locales |

**190 files deleted, 13,337 lines removed.**

### Three things the cut turned up

**`moraleCheck` was a ship check.** It sits beside the creature checks and its comment claimed it
was a distress signal, but it rolls against `system.megadamage.hits` and its macros call
`noShipSelected()`. Copy-pasted comments are not evidence of what a function does.

**Two pieces of machinery were dead the moment their caller left.** The second-roll pair
(`rollResult2` / `parsedRollResult2`) existed only for a failed maintenance check, so it went along
with the block in `templates/chat/rollTable.html` that rendered it. And `mosh.js`'s
`noShipSelected` was **never on the public API** despite shipped macros calling
`game.mothershiprpg.noShipSelected()` — a latent break that left with its callers.

**The Calm variant is not in the book.** The PSG's rule is "roll the Panic Die (1d20) and try to
roll above your current Stress"; the Calm variant switched it to `1d100` and selected different
tables. Zero occurrences of Calm as a mechanic anywhere in the transcription. Removing it deleted a
unit spec — *"defers to the ordinary crit rules when Calm is on"* — which by Decision 2's rule is
the signal that an edit is out of bounds **for a conversion**. This was a scope cut the plan names
explicitly, so the spec went with the mechanic. Recorded rather than done quietly, because the rule
is worth keeping sharp.

### The keep-set was derived, not judged

Which conditions survive was computed from the reference graph, not chosen: the 10 that the
Stress/Normal panic table applies through its macros, plus **`Bleeding`** — which three surviving
wound tables independently apply and which `_deriveCharacter` reads *by name*. Cutting on the panic
table alone would have removed it and silently broken the bleeding derivation.

Afterwards: **zero dangling `@UUID` references** across the 136 surviving documents, and the
surviving macros call exactly five public API entry points, all of which still exist.

### The ratchet paid for itself twice

`field-usage.test.ts` (§24) failed twice during this work, both times correctly. First its honesty
meta-test caught the `DEFERRED_TO_PHASE_3` allowlist entries the instant the ship schema went —
they no longer matched any declared leaf. Then it caught `other.stress.max` and `.label` losing
their only reader when the Calm markup was removed. Neither would have been noticed by hand.

Also fixed in passing: **`system.json` declared `"system": "mosh"` on every pack** — the §18 rename
never reached the manifest's pack blocks.

### The trap that cost two e2e cycles: packing never deletes

`fvtt package pack` writes and updates LevelDB keys. **It removes nothing.** Two consequences, and
the second is the dangerous one:

1. A pack whose source directory is gone stays compiled and keeps loading — that is how
   `items_maintenance_1e` survived being dropped from `system.json`.
2. **Deleting a source JSON does not delete the document.** Re-packing the reduced sources left all
   50 conditions, 151 macros and 14 tables in the database. Foundry served the ghosts, and the
   count spec was right to fail while every source count said otherwise.

The fix is to `rm -rf` the compiled pack directories and pack from scratch — in `packs/` **and** in
`test/foundry-data/Data/systems/mothershiprpg/packs/`, which are separate copies.

Two further cycles went to a wrong diagnosis of *why* the test tree kept reverting. It was not the
running server flushing stale state, and it was not a `rm -rf` that failed. **The e2e harness
rebuilds its system tree on every boot**: `start-test-env.sh` runs `setup-test-env.ts`, which
re-clones the system from the developer's *live* Foundry Data dir. Hand-editing
`test/foundry-data/.../packs` therefore does nothing that survives the next launch, and the suite
keeps testing whatever `npm run setup` last copied there.

The correct sequence, which `CLAUDE.md` already stated in one line and this session did not read
carefully enough — *"packs are COPIED — re-run after packing"*:

```
./scripts/packs.sh pack     # sources -> packs/  (delete the pack dirs first if any doc was removed)
npm run setup               # packs/ -> the live Data dir, which the harness clones from
npm run test:e2e
```

All three points are now in `CLAUDE.md`'s gotchas, because any future content removal hits them.

It is worth noting what caught this: the compendium count spec, which exists precisely because "a
pack missing its .ldb opens as an empty database rather than failing". The same reasoning covers
the opposite case, and it was the only thing standing between the cut and shipping a system whose
compendia still contained everything supposedly removed.


---

## 26. S2 — one book-tiered source, and the guard that had to exist first

`content/` is now organised by **book**, and the pipeline no longer pretends to have an upstream.

```
content/books/psg/   the 12 datasets with a consumer, their schemas, and BOOK.md
content/ids.json     stable ids per emitted document
```

Deleted: `sync-content.ts` and its drift detection, `CHECKSUMS`, `PROVENANCE.md`, the
`local`/`data` two-tier split, and the seven datasets with no runtime consumer (`contractors`,
`pets`, `cover`, `radiation`, `medical-treatments`, `shore-leave`, `rules-index`). **−2,368 lines,
+802.**

The sync machinery went because the premise under it was false: `../mothership-data` **has no
`.git` directory**. There was never an upstream to sync from, only a folder — which is why C1 had
to substitute per-file checksums for the "source commit hash" the plan asked for. The corpus is
imported once and owned here. `BOOK.md` records that so nobody rebuilds it.

`TierPaths.strict` also went. It existed only because the vendored schemas failed Ajv's
`strictTypes` / `strictRequired`; with one tier that we own, five schemas were fixed instead
(`required` without a sibling `"type": "object"`, then local `$ref` declarations Ajv will not
follow through `allOf`). All 13 now pass strict mode, so a keyword typo in a schema fails loudly
instead of silently accepting everything.

### The DataModel guard

**The gap the C1 gate found.** C1 validated records against JSON Schema — the content side.
Nothing checked the emitted `system` object against the DataModel that *receives* it, and Foundry's
`SchemaField` silently discards keys it does not declare. That is how armour `equipped` stopped
working, how the creature `swarm` toggle destroyed data, and how twelve more were found in §10.
`sheet-bindings.test.ts` guards the UI side; nothing guarded content.

`scripts/content/model-guard.ts` now runs inside `build()`, between emission and the reference
check, and **throws** — so `npm run content` exits 1. Not a test that can be skipped: a build
failure.

The schema walk is **shared, not duplicated**. `installFoundryFieldStubs`, `defaultsOf` and
`leaves` moved from `test/field-stubs.ts` into `scripts/model-schema.ts`; the test file re-exports
them and keeps only the `template.json` / `system.json` oracles. Direction is `test → scripts`.
The models must be `import()`ed after the stubs install — a static import hoists above it, and the
model modules read `foundry.data.fields` at module scope.

Verified independently of the agent's own specs, by injecting a key I invented into a real record
and driving the actual `build()`:

```
emitted content does not fit its DataModel:
  fixture_gadgets_1e/flux-capacitor: condition declares no system.bogusUndeclaredKey
                                     — Foundry would discard it on load
```

The fixture keeps `modifiers` on the **book** side and deliberately does not map it into `system`,
because `MoshCondition` declares no such field — the live negative case stays live until S3/S8 adds
it.

### Adding the next book

The layout is the deliverable, and it is now four steps: a `content/books/<id>/` directory, a
`scripts/content/books/<id>.ts` describing its packs, one entry in `BOOKS`, then
`npm run content -- --allocate` and commit `content/ids.json`. Merging the new compendia into
`system.json` stays orchestrator-only. The build refuses two books claiming the same id, pack name
or compendium, and refuses a book whose directory does not exist — each pinned by a spec.

### Two judgement calls carried forward to S3

**`content/ids.json` was rewritten — reordered only, not re-issued.** The committed file was in
seed order rather than the canonical sorted order, so the first `--allocate` would have produced a
115-line phantom diff. Checked before merging: **210 ids before, 210 after, none lost, none
gained.**

**`checkIdPreservation` exists and is tested, but is not wired into `build()`.** Turning it on
today would fail every build until all 210 registered ids are emitted, and S3 regenerates the macro
pack from a table rather than reproducing all 107. **S3 must retire what it drops** — the registry
takes a reason — and then wire the check on. That is one line in `pipeline.ts`, and it is the thing
protecting the `@UUID`s the surviving rolltables still hold.

**Verified:** `npm run check` 0 errors / 0 warnings (221 files) · **178 vitest** (168 + 10) ·
**56 Playwright** · `npm run build`. `packs/_source`, `module/`, `templates/` and `system.json`
untouched — confirmed by diff, so the runtime could not have moved.
