# MoSh — modernization plan

Audit of `foundry-mothership` (MoSh 0.6.1) against the runegoblin development baseline
(`runegoblin-foundrytemplate`: TypeScript + Svelte 5 + Vite + vitest/Playwright), and a
staged plan to close the gap.

Audited 2026-08-11 against the locally installed **Foundry v14 stable**
(`/Applications/Foundry Virtual Tabletop.app/.../public/scripts/foundry.mjs`), not from
memory. API claims below were checked in that file.

## Start here

**Phases 1–3, the test harness, phase 4's step 0 + first conversion, the 0e removal and the
schema repairs are complete.** **Next: the shared component layer (§13), then `skill-sheet.js`.**

| | |
|---|---|
| Read first | `CLAUDE.md`, then the `foundry-mosh` skill (`.claude/skills/foundry-mosh/`) |
| The plan | §Phase 4 below — the conversion order, one sheet at a time |
| Verify with | `npm run check && npm test` (97 specs), `npm run test:e2e` (57 specs) |
| State | `master`, tree clean, **unpushed** |

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

#### Order of attack

Convert one at a time and ship between each. Easiest first, so the conventions are settled
before the risky sheets:

| # | Target | Lines | Notes |
|---|---|---|---|
| ~~1~~ | ~~`item-sheet.js` + 8 item templates~~ | 80 | ✅ **done** — see §10. |
| 2 | `skill-sheet.js` | 72 | **Next.** Extends the AppV1 `MothershipItemSheet`, which now exists only for that; both it and `item-skill-sheet.html` die with this conversion. Adds drag-drop (`foundry.applications.ux.DragDrop` in V2). |
| 3 | `ship-setup`, `ship-megadamage`, `settings-rolltables` | 73 / 120 / 89 | The simple windows. All three still extend the **bare global** `FormApplication`, which CLAUDE.md forbids in new code. `ship-megadamage` also has a stale `data.` path fixed but unverified. |
| 4 | `creature-settings.js` | 160 | **Resolve the `FIXME` first** — `_updateObject` still does not persist (see §8). Decide what should save, then convert. |
| 5 | `class-sheet.js` | 340 | Mutates the model it renders from; converting it is what unblocks tightening the two free-form `ObjectField`s (§7). |
| 6 | `ship-sheet.js`, `ship-sheet-sbt.js`, `creature-sheet.js`, `ship-deckplan.js` | 275 / 498 / 661 / 40 | SBT is the **default** ship sheet — check which you are looking at. Schema holes fixed ahead of time (§10). |
| 7 | `actor-generator.js` | 772 | The character generator. Biggest window; drives `class-sheet` data. |
| 8 | `actor-sheet.js` | 659 | The character sheet — highest risk, most player-visible, do it last with the most conventions in hand. |

28 Handlebars templates remain and retire as their sheets migrate.

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

- **Upstream relationship.** This is a fork of `Futil/foundry-mothership`. A rewrite of
  this scope makes merging upstream fixes impractical. The manifest URLs are repointed
  (§15); what remains is the *stated* position — say in the README whether this is a hard
  fork. `authors` still credits the upstream authors, deliberately.
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

## 13. Next — the shared component layer

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
