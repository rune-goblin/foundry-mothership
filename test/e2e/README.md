# e2e harness

Playwright against a real headless Foundry v14, adapted from `runegoblin-foundrytemplate`
for a **system** rather than a module.

```
playwright test
  ├─ webServer:   scripts/start-test-env.sh    → Foundry on :30005, --world=$TEST_WORLD
  ├─ globalSetup: global-setup.ts              → join GM, assert world + system, log provenance
  └─ specs:       *.spec.ts                    → drive the UI / documents, assert game.*
```

## Commands

```bash
npm run test:e2e:setup    # once — build test/foundry-data/ (isolated, gitignored)
npx playwright install chromium   # once
npm run test:e2e          # build dist + packs, then run
npm run test:e2e:run      # skip the rebuild (dist and packs must be current)
npm run test:e2e:ui       # Playwright UI mode
npm run test:e2e:report   # open the last HTML report
npm run test:foundry      # just boot the test Foundry for manual poking
npm run check:e2e         # type-check these specs (separate tsconfig + Playwright globals)
```

## What differs from the module template

- **No activation step.** A module has to be enabled per world; a system is inherently active
  in a world built on it. `global-setup.ts` asserts `game.system.id` and the world id instead.
- **`systems/` is cloned, not `modules/`.** `scripts/setup-test-env.ts` clones both, since a
  world may reference installed modules.
- **Packs are de-symlinked per entry.** `npm run setup` links each compendium individually
  (`packs/` is a real directory of symlinks), where the template's module scaffold links `packs`
  as a whole. Left alone, the test Foundry takes an exclusive LevelDB lock on the repo's packs and
  blocks `scripts/packs.sh` and your own Foundry. Everything else (`dist`, `templates`, `lang`,
  `images`) stays linked, so a Vite rebuild reaches the harness with no re-clone.

## Preconditions

- A **licensed** Foundry v14 installed locally (`start-test-env.sh` finds the app bundle;
  override with `FOUNDRY_APP`).
- `TEST_WORLD` (default `mosh`) names a world **built on this system** (its `world.json` `system` is rewritten to `mothership` in the clone, so a world created before the rename still works) whose GM has **no password**, already
  migrated to the running core/system version. `--world` will not auto-launch a world needing
  migration; `global-setup` then reports `No active world at this port`. Fix by opening it once
  in desktop Foundry.

The world is **cloned** into `test/foundry-data/`, not shared, so the suite never touches your
real data and you can run your own Foundry at the same time. The clone is point-in-time —
changes made in desktop Foundry reach the harness only after another setup run.

**No module is ever active here.** `setup-test-env.ts` arms the cloned world's `safeMode`, so
Foundry drops every module from `core.moduleConfiguration` as it launches (and deactivates the
scene, and stops playlists). The clone inherits whatever your live Data dir has enabled, and one
module is enough to paint over a visual baseline or to break a spec that was testing the system.
The flag is one-shot, so it is re-armed on every boot.

## Check the harness before trusting green

- `global-setup` logs the system version, core version, world and compendium list it exercised.
  Read that line. A stale or wrong server fails loud rather than testing the wrong target.
- **A killed run leaves the GM session occupied.** Foundry allows one session per user, and
  `reuseExistingServer` is on locally, so the next run hangs in `waitForGameReady` for 30s and
  fails in `globalSetup`. Fix: `lsof -ti:30005 | xargs kill`, then re-run.
- If a result surprises you, suspect the harness before believing it.

## Conventions

- Use the **`gmPage`** fixture from `fixtures/foundry-clients.ts`. Don't re-implement login.
- The world is shared across specs (`workers: 1`). Create throwaway documents named with the
  **`__e2e_`** prefix and delete them in `afterEach` — leave the world as you found it. Close
  windows from **both** registries: `ui.windows` (AppV1) and `foundry.applications.instances` (V2).
- Reach Foundry through `page.evaluate(() => game.…)`; drive the UI with stable selectors
  (the application element id, `data-*` hooks — not text or nth-child).
- Compare **`doc.toObject().system`**, not `doc.system`, when asserting stored data:
  `prepareDerivedData` mutates the live object in place (armour mod, net HP, bleeding).

## Visual baselines

`visual-baselines.spec.ts` captures every surface `css/mothership.css` paints — seven windows, the
check dialog, six chat cards — and compares them at **`maxDiffPixels: 0`**. The images live in
`baselines/visual-baselines.spec/`, are named `<subject>-<platform>.png`, and **are committed**.

```bash
npx playwright test visual-baselines --update-snapshots   # write/refresh the images
```

Rewrite them only when the change to what renders was intended, and read the diff before you
accept it — that review is the gate the design-system plan (§8 rule 2) puts on every stylesheet
change. Determinism is bought in the spec's header comment and in `expect.toHaveScreenshot`
(`playwright.config.ts`), including the capture-only stylesheet `screenshot.css`. A capture that
disagrees with itself between two runs means one of those measures stopped holding; fix that
rather than raising the pixel budget.
