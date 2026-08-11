# The two-tier test harness

| Tier | Command | Runs on | Proves | Needs |
|------|---------|---------|--------|-------|
| **vitest** | `npm test` | Node, headless | pure logic — roll parsing, derived data, schemas, helpers | nothing (the CI tier) |
| **Playwright** | `npm run test:e2e` | a real headless Foundry v14 | the built system loads, documents get the right data, packs load, sheets render | a licensed Foundry v14 + a migrated `mosh` world |

**Reach for vitest first.** Anything testable without Foundry belongs there. Use e2e only
for what genuinely needs the live app.

This is the verification loop: after a change, run the tier that covers it and read the
result. Don't report "done" on an untested edit.

## vitest tier — 84 specs

```bash
npm test          # once (CI runs this)
npm run test:watch
npm run check     # tsc over the .ts surface (tooling + tests), not module/*.js
```

Specs are `test/**/*.test.ts`, `environment: 'node'`.

**The trick that makes this work without Foundry:** `test/setup.ts` defines an empty
`globalThis.Actor` so `module/actor/actor.js` can be imported (`extends Actor` is evaluated
at import time), and specs call methods with a hand-built `this`:

```ts
MothershipActor.prototype.parseRollString.call({}, '1d100[+]', 'low');
```

No document is constructed. The single import that reaches the entry module is mocked:
`vi.mock('../module/mosh.js', () => ({ fromIdUuid: () => undefined }))`.

**Schema tests use the same idea one level up.** `test/field-stubs.ts` stubs
`foundry.data.fields` so each field class records the default it *would* produce, then walks
the **real shipped schema** and compares it to what `template.json` composes. The assertions
check the actual code, not a restatement of it. That is why `template.json` is kept.

## Playwright tier — 28 specs

Full commands, preconditions and conventions: **`test/e2e/README.md`**. In short:

```bash
npm run test:e2e:setup            # once — build the isolated data dir
npx playwright install chromium   # once
npm run test:e2e                  # build dist + packs, then run
```

Not in CI: it needs a licensed Foundry and a migrated world. Run before a release.

## Check the harness before trusting green

A green run only means something if it ran against the right target.

- `global-setup` logs the system version, core version, world and pack list it exercised.
  Read that line. A wrong or stale server fails loud.
- **A killed run leaves the GM session occupied** — Foundry allows one session per user, and
  `reuseExistingServer` is on locally, so the next run hangs 30s in `waitForGameReady` then
  fails in `globalSetup`. Fix: `lsof -ti:30005 | xargs kill`.
- If a result surprises you — passes when you expected failure, or vice versa — suspect the
  harness before believing it.

## Mutation-test new assertions

A test that cannot fail is worse than no test. After writing specs for a behaviour, break
the behaviour on purpose and confirm the suite goes red, then revert:

```bash
cp module/actor/actor.js /tmp/a.bak
sed -i '' 's|newTotal = Math.min|newTotal = Math.max|' module/actor/actor.js
npm test            # expect failures
cp /tmp/a.bak module/actor/actor.js
```

This has already paid for itself: it exposed that the roll-*over* direction of the
advantage/disadvantage logic was entirely untested, and separately that a `sed` had been a
no-op so a "surviving mutation" was a false alarm. **Check that your mutation actually
changed the file.**

## Authoring a spec

**Unit (preferred):** call the method with a hand-built `this`. Test inputs → outputs. No
mocking of `game` beyond the one setting or two a method reads.

**e2e:** one operation per file so a failure names what broke. Use the `gmPage` fixture;
name throwaway documents `__e2e_*` and delete them in `afterEach`; close windows from **both**
`ui.windows` (AppV1) and `foundry.applications.instances` (V2). Assert stored data with
`doc.toObject().system`, never `doc.system` — `prepareDerivedData` mutates the live object.
