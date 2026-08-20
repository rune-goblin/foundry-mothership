# Build, dev install, release

## The build

Vite lib build: `module/index.js` (css imports + `init.ts`) → `dist/mothershiprpg.js` +
`dist/mothershiprpg.css`, ES format, no minify, sourcemaps on. `system.json` loads `dist/`.

**Not bundled:** `templates/`, `images/`, `lang/`, `packs/` are served by Foundry from disk
at `systems/mothershiprpg/…`. Reference them by that runtime path; never `import` art, which
would inline a second copy. The two build warnings about `systems/mothershiprpg/images/…`
"not resolved at build time" are correct and expected.

## Dev install

**`npm run setup`** creates a real directory at `Data/systems/mothershiprpg` whose entries
symlink back to the repo — not a whole-repo symlink, which would expose `node_modules/` and
`.git` to the server. `packs/` is copied, not linked: Foundry takes an exclusive LevelDB
lock on every pack it can see and compacts them in place, and a system cannot be disabled
per world. The cost is re-running `setup` after `packs.sh pack`.

**`npm run deploy`** builds, then copies a link-free install matching `release.yml`'s
include-list, so it works with the repo absent — use it to test a release. It removes any
`setup` symlink at the destination first.

Both honour `FOUNDRY_DATA` and warn when the target holds real worlds: a system is active in
every world built on it, so in-progress schema edits migrate them. Both exclude
`packs/_source` — Foundry would try to load the JSON as a compendium.

**`npm run dev`** starts a Vite reverse proxy on `:30001` in front of an *already running*
Foundry on `:30000` — browse `:30001/game`.

## Release

Tag `vX.Y.Z` → `.github/workflows/release.yml`: stamps the version into `system.json`,
builds and packs, zips an **include-list** (`system.json template.json LICENSE.txt README.md
dist packs lang templates images data`, excluding `packs/_source` and LevelDB lock/log
files), verifies every pack carries `.ldb`/`CURRENT`/`MANIFEST` and no sources leaked, then
publishes zip + `system.json` to GitHub Releases. An include-list, not an exclude-list — the
repo carries tooling and sources that must never ship, and a new file appearing should not
silently end up in the zip.

`ci.yml` (push to `master`, every PR): `npm ci`, `check`, `test`, `build`, `packs.sh pack`,
pack completeness. e2e is not in CI — it needs a licensed Foundry.
