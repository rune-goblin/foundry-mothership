# MoSh — modernization plan

Audit of `foundry-mothership` (MoSh 0.6.1) against the runegoblin development baseline
(`runegoblin-foundrytemplate`: TypeScript + Svelte 5 + Vite + vitest/Playwright), and a
staged plan to close the gap.

Audited 2026-08-11 against the locally installed **Foundry v14 stable**
(`/Applications/Foundry Virtual Tabletop.app/.../public/scripts/foundry.mjs`), not from
memory. API claims below were checked in that file.

> **Status: Phase 1 complete** (gulp → Vite, `_releases/` removed). See §4.
> Phase 1 uncovered that the SCSS tree is not the source of the stylesheet — §1.1 has
> been corrected accordingly, and it changes the styling plan.

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

v14 references NeDB only in `dist/migrations.mjs` — it migrates the format, it does not
serve it. So the manifest paths are at best stale and at worst wrong, and every pack's
content is stored twice in git. This needs verifying in a real world load, then
consolidating.

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

### Phase 2 — quality gates and repo weight (≈2 days)

1. `tsconfig.json` with `allowJs: true, checkJs: false` — TypeScript can type-check the
   build tooling and any new `src/` code without touching 9,274 lines of legacy JS yet.
2. `vitest.config.ts` + first unit specs. Target the automation in `actor.js` — panic
   checks, stress, wounds, saves. These are pure-ish functions and the highest-risk code
   in the system; they are also exactly what will break during phases 3–5, so writing
   them *before* the refactor is what makes the refactor safe.
3. `.github/workflows/ci.yml`: `npm ci && npm run check && npm test` on push and PR.
4. `.github/workflows/release.yml`: tag `vX.Y.Z` → stamp version, build, publish
   `system.json` + `mosh.zip` to GitHub Releases.
5. `scripts/setup.ts` and `scripts/deploy.ts`, adapted to `Data/systems/mosh/`.
6. `_releases/` is already out of the working tree (phase 1). Purging it from *history*
   is a separate, irreversible call — see §6.
7. Resolve the pack duplication: confirm which format v14 actually loads, keep one, fix
   the `system.json` paths, then move toward `packs/_source/` JSON as the tracked source
   with `packs/` built and gitignored. Fold `_macros/` into that pipeline or document what
   it is for.

**Verify:** CI green on a PR; `npm run deploy` produces a working install.

### Phase 3 — DataModels (≈3–5 days)

Replace `template.json` with `foundry.abstract.DataModel` subclasses registered via
`CONFIG.Actor.dataModels` / `CONFIG.Item.dataModels` — 3 actor types, 10 item types.

Do this **before** the sheet migration, not after. Svelte components want typed, validated
data; migrating sheets against the untyped `template.json` blob means doing the sheet work
twice. This phase is also where the phase-2 unit tests earn their keep — schema changes
are exactly the kind of thing that silently breaks derived data.

Keep `template.json` in place during the transition (v14 still honours it) and delete it
only once every type has a model.

### Phase 4 — ApplicationV2 + Svelte, sheet by sheet (≈2–3 weeks)

The pattern is in the skill: `references/svelte-in-applicationv2.md` — a thin
ApplicationV2 shell that `mount()`s a Svelte 5 component and `unmount()`s on close.

Migrate one sheet at a time, shipping between each. Suggested order, easiest first:

1. `item-sheet.js` (80 lines) + its 10 item templates — smallest, most repetitive, best
   place to establish the component conventions.
2. `skill-sheet.js` (72), `class-sheet.js` (340).
3. The 5 bare-`FormApplication` windows → ApplicationV2: `ship-setup` (73),
   `ship-megadamage` (120), `creature-settings` (160), `settings-rolltables` (89),
   `actor-generator` (772).
4. `ship-macros.js` — **fix the broken `BaseSheet` hybrid here**, or earlier as a
   standalone bugfix if it is visibly failing for players.
5. `ship-sheet.js` (275), `ship-sheet-sbt.js` (498), `creature-sheet.js` (661).
6. `actor-sheet.js` (659) last — the character sheet, highest risk and most player-visible.

37 Handlebars `.html` templates retire as their sheets migrate. Note the existing sheets
build HTML strings inside `getData()` (e.g. `superData.xp.html` assembled in a loop in
`actor-sheet.js:55`) — that logic becomes markup in the component and should not be
ported forward as string concatenation.

### Phase 5 — TypeScript conversion (opportunistic, ongoing)

Flip `checkJs: true` and convert file by file as each is touched. `actor.js` (2,993
lines) should be split during conversion rather than translated wholesale — its
automation is the system's real asset and deserves to be modules with tests, not one
file.

---

## 5. Risks and open questions

- **Upstream relationship.** This is a fork of `Futil/foundry-mothership`. A rewrite of
  this scope makes merging upstream fixes impractical. Decide deliberately whether this
  becomes a hard fork; if so, say so in the README and change the manifest URLs (they
  currently point at `Futil/foundry-mothership` releases).
- **Foundry typings quality.** Item 3 in §3. Generic v14 typings are less mature than the
  PF2e-specific package the template uses. Do not let type coverage block phase 1–2 —
  `checkJs: false` sidesteps it entirely until phase 5.
- **`actor.js` is the crown jewels.** 2,993 lines of unstested automation. Phase 2's tests
  are a precondition for phases 3–5, not a nice-to-have. If you cut one thing from this
  plan, do not cut those.
- **Pack format** needs a real answer from a live v14 world load before phase 2 item 7.
  I could not conclusively determine from the server bundle whether v14 resolves a `.db`
  path to the sibling LevelDB directory.
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
- Full pre-rewrite backup: `../../mothership-backup-pre-filter-repo.bundle` (339 MB,
  `git bundle verify` reports a complete history). Keep until the force-push is settled.
- filter-repo removed the `origin` remote as a safety measure; it has been restored.
  **The next push must be `git push --force origin master`**, and anyone else with a
  clone must re-clone.

**b. `scss/` deleted — done.** 13 files, recoverable from history. Styling stays plain
hand-authored CSS through phase 4, then dissolves into scoped component styles as sheets
become Svelte. Build output is unchanged at 247 selectors with the tree gone.

**c. Commits.** Phase 1 landed as `0edf526 build: replace gulp with vite` (post-rewrite
SHA), on `master`.

---

## Appendix — measurements

| | |
|---|---|
| JS source | 9,274 lines, 20 files |
| Largest file | `module/actor/actor.js`, 2,993 lines |
| Stylesheet (hand-authored source) | `css/mosh.css`, 36,616 B, 247 selectors |
| SCSS (stale, out of build) | 13 files, 2,245 lines → 4,551 B, 51 selectors |
| Handlebars templates | 37 `.html` (0 `.hbs`) |
| Compendium packs | 9, tracked in 2 formats, 54 files |
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
