# Build, dev install, release

## The build

Vite lib build: `module/index.js` → `dist/mothershiprpg.js` + `dist/mothershiprpg.css`, ES format, no minify,
sourcemaps on. `system.json` loads `dist/`.

```js
// module/index.js — the entry
import '../css/mosh.css';   // hand-authored, NOT compiled from scss/
import './mosh.js';
```

```bash
npm run build     # vite build
npm run watch     # vite build --watch
npm run clean     # rm -rf dist
```

`dist/` is gitignored — a fresh clone must `npm ci && npm run build` (and
`./scripts/packs.sh pack`) before the system will load.

**What is not bundled:** `templates/*.html`, `images/`, `lang/`, `packs/` are served by
Foundry from disk at `systems/mothershiprpg/…`. Reference them by that runtime path; never `import`
art, which would inline a second copy into the bundle. The two build warnings about
`systems/mothershiprpg/images/...webp` "not resolved at build time" are correct and expected.

## Dev install

```bash
npm run setup     # dev install: symlink scaffold at Data/systems/mothershiprpg
npm run deploy    # release rehearsal: a link-free copy, same shape as the zip
```

**`setup`** creates a **real directory** whose entries symlink back to the repo —
`system.json`, `template.json`, `dist`, `templates`, `images`, `lang`, `data`. Not a
whole-repo symlink: that would expose `node_modules/` and `.git` to the server.

**`packs/` is copied, not linked.** Foundry takes an exclusive LevelDB lock on every pack it
can see and compacts them in place, and a system — unlike a module — cannot be disabled per
world, so the lock is unavoidable. Linking let a running Foundry mutate gitignored build
output and block `packs.sh`. The cost is re-running `npm run setup` after `packs.sh pack`.

**`deploy`** builds, then copies a link-free install matching `release.yml`'s include-list, so
it works with the repo absent. Use it to test a release. It removes any `setup` symlink at the
destination first — copying over one would write straight back into the working tree.

Both honour `FOUNDRY_DATA` and warn when the target holds real worlds: a system is active in
every world built on it, so in-progress schema edits migrate them.

`packs/_source` is deliberately excluded — it is the JSON source, not a compendium, and
Foundry would try to load it as one.

Requires `dist/` to exist; the script fails loudly if not. Re-run after changing which
top-level directories the system ships.

`npm run dev` starts a Vite reverse proxy on `:30001` in front of a Foundry on `:30000` —
browse `:30001/game`, not `:30000`. It proxies an *already running* Foundry, so start
Foundry and launch a world first.

## Release

Tag `vX.Y.Z` → `.github/workflows/release.yml`:

1. stamps the version into `system.json`
2. `npm ci` → `npm run build` → `./scripts/packs.sh pack`
3. zips an **include-list**: `system.json template.json LICENSE.txt README.md dist packs
   lang templates images data`, excluding `packs/_source` and LevelDB lock/log files
4. verifies every pack carries `.ldb`/`CURRENT`/`MANIFEST`, that no sources leaked, and that
   `dist/mothershiprpg.js` is present
5. publishes the zip + `system.json` to GitHub Releases

An **include-list, not an exclude-list** — the repo carries build tooling, JS sources and dev
docs that must never ship, and a new one appearing should not silently end up in the zip.

`ci.yml` runs on push to `master` and every PR: `npm ci`, `npm run check`, `npm test`,
`npm run build`, `packs.sh pack`, pack completeness. e2e is **not** in CI (needs a licensed
Foundry).

## Manifest notes

- `compatibility: { minimum: "13", verified: "14" }`.
- Pack `path` values are bare directories (`packs/conditions_1e`), matching what v14-native
  packages use. v14 also resolves a legacy `.db` suffix to the sibling directory, but don't
  reintroduce it.
- `url`/`manifest`/`download` still point at `Futil/foundry-mothership` upstream, while
  `origin` is `rune-goblin/foundry-mothership`. **Update these before releasing** — see
  `MODERNIZATION.md` §5.
