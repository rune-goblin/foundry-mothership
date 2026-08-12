# Run to the end — the delegation plan for phase 4 → phase 5

How the rest of the modernization gets executed, who does what, and what has to be true before
each wave is allowed to land. `MODERNIZATION.md` stays the **record** of what happened; this file
is the **method**.

> **The wave order below is superseded.** The architecture review of 2026-08-12
> (`docs/plans/architecture.md`) re-sequenced the work: the content pipeline goes first, and each
> schema deletion rides the conversion that removes its last reader. Read that file for **what to
> do and in what order**. Read this one for **how a unit is delegated and what has to be true
> before it lands** — the roles, the ten standing rules and the gate are all still current, and
> architecture.md's Decision 7 keeps them deliberately whole. §The waves is retained as the record
> of the reasoning each unit inherits.

Read `docs/plans/architecture.md` for the phases and the decisions behind them. This file does not
restate them — it schedules how each unit is run.

---

## Roles

| | |
|---|---|
| **Opus — orchestrator** | Writes every brief, reviews every diff, runs the e2e tier, mutation-checks the new specs, verifies visually, writes the docs, commits. Never takes an agent's "all green" at face value. |
| **Sonnet — mechanical units** | A conversion whose behaviour maps across 1:1: no schema change, no model mutation, no design decision, roughly under 300 lines. |
| **Opus — complex units** | Anything carrying a design decision, a schema change, a sheet that mutates the model it renders from, or high player visibility. |
| **Fable — architecture** | The Svelte best-practices review (Wave 7), delivering a plan file we discuss. Also on call mid-flight for a second opinion on a contentious modelling decision. |

**Assignment is by hazard, not line count.** `creature-sheet.js` is 660 lines of repetition and
`class-sheet.js` is 340 lines that rewrite the document while rendering — the second is the harder
job. Where the two disagree, hazard wins.

### When to pull Fable in mid-flight

Not for volume, and not to break ties on style. Ask when a decision would be **expensive to
reverse** and the evidence is genuinely balanced:

- tightening `base_adjustment` / `selected_adjustment` from free-form `ObjectField`s into real
  schemas (Wave 2) — this changes `template.json` and every stored class item;
- whether a shared shape belongs in `module/ui/parts/` or stays local (Waves 3–6);
- any proposal to delete a schema field that stored data may still hold.

---

## Standing rules for every delegated unit

Repeat these in every brief. They are the accumulated cost of the last four waves.

1. **Fix the worktree base first.** `git log --oneline -1 && git rev-parse master`; if HEAD is not
   master's commit, `git reset --hard master`. Do not start until the work being built on exists.
   (§21: an agent branched from session start and rebuilt the whole component layer.)
2. **Build from `module/ui/parts/`.** Read every primitive before writing markup. Don't write
   bespoke markup for a shape a primitive covers, and don't rename the global class names they
   emit — `test/ui-parts.test.ts` pins them because `css/mosh.css` is a contract no compiler sees.
3. **Check reachability before converting.** Grep the sheet template for the selector the listener
   binds and confirm the markup is not inside `<!-- -->`. Two windows in Wave 3 of the last batch
   were unreachable; one was a duplicate and got deleted instead. (§22)
4. **Round-trip every field you touch** — write the value, read it back from `toObject().system`.
   The defaults comparison passes just as happily when a field cannot be stored at all. Four
   schema holes of this shape have been found so far. (§13)
5. **v14 only.** No bare `Application` / `FormApplication` / `Dialog` / `duplicate` /
   `mergeObject`. Update paths are `system.*`.
6. **Use the Svelte MCP tooling** for all `.svelte` work; re-run the autofixer until clean.
   `npm run check` must report **0 errors and 0 warnings**.
7. **Port, verify, ship — and record the compromise in your report**, not in the code. If you find
   a design runes would fix, say so in the handoff; do not fix architecture piecemeal. It goes to
   Fable in Wave 7. (§23)
8. **Do not run `npm run test:e2e` or `npx playwright`.** One Foundry, one GM session. The
   orchestrator runs that tier.
9. **Do not edit `MODERNIZATION.md`, `CLAUDE.md`, or the `foundry-mosh` skill.** Parallel agents
   would conflict; the orchestrator writes the record.
10. **Commit in your worktree** and report: files added/changed/deleted, exact `npm run check` and
    `npm test` output, decisions taken, anything contradicting the brief, and — explicitly —
    **what you could not verify**.

Two more, added by the architecture review (Decision 7) for the content phases:

11. **A content build must pass determinism, id preservation and referential integrity before it
    lands** — build twice for byte-identical output; every pre-pipeline `_id` emitted or explicitly
    retired; every `@UUID` resolving to an emitted document. Plus the enumerated-transform proof
    whenever a rescue is involved. The rescue is a one-way door: once packs generate from
    `content/local/`, anything not carried across is gone.
12. **Every schema deletion rides the wave that removes its last reader**, changes `template.json`
    in lockstep, and is named a migration in the record. Deleting a field whose sheet has not yet
    converted just moves the breakage; converting a sheet without deleting the field re-enshrines
    it.

## The gate — what the orchestrator does before a wave lands

Every item, every wave. A wave is not done until all of it passes.

1. Read the diff in full. Assume the report is optimistic.
2. Re-verify each factual claim the agent made that the brief depended on.
3. `npm run check` · `npm test` · `npm run build` · `npm run check:e2e`.
4. `npm run test:e2e` serially. Free the port first and **wait for it**:
   `lsof -ti:30005 | xargs kill -9; until ! lsof -ti:30005 >/dev/null; do sleep 1; done`.
5. **Mutation-check the new specs** — break the behaviour they claim to cover and confirm they
   fail. A spec that cannot fail is not cover.
6. **Verify visually** against real headless Foundry via the Playwright harness. Screenshot, or
   diff the rendered markup before/after for a pure refactor.
7. Update `MODERNIZATION.md` (a numbered section per wave) and `CLAUDE.md`'s status table.
8. Commit, remove the worktree and its branch.

---

## The waves

Parallel units run in separate worktrees. Sequential ones are sequential because of a real
dependency, not caution.

### Wave 0 — dead templates (orchestrator, minutes)

`templates/dialogs/bankrupcy-save-dialog.html`, `distress-signal-dialog.html` and
`minteance-check-dialog.html` are referenced by **nothing**: `actor.js` builds all three dialogs
inline with DialogV2 (`distressSignal()` 2508, `maintenanceCheck()` 2549, `bankruptcySave()`
2591). That is the fourth dead source found in this repo. Verify, delete, commit.

### Wave 1 — the last simple windows · **Sonnet ×2, parallel**

| Unit | Lines | Notes |
|---|---|---|
| `module/settings/creature-settings.js` | 132 | §Phase 4 item 4. The `FIXME` is already resolved in §12: it should persist **nothing**. Registered from `module/settings.js`. |
| `module/windows/ship-deckplan.js` | 62 | An AppV1 `ActorSheet` used as a popout. Opened from `ship-sheet-sbt.js` — check reachability first (rule 3). |

**Conflict:** `ship-deckplan`'s call site is in `ship-sheet-sbt.js`. Nothing else in Wave 1 touches
that file, but Wave 4 rewrites it — land Wave 1 first.

### Wave 2 — `class-sheet.js` · **Opus, solo**

340 lines, and the last user of `module/item/item-sheet.js` — **that AppV1 base dies here**, with
`templates/item/item-class-sheet.html` (410 lines, the largest remaining template).

The hazard is that it **writes onto the model while rendering**: `getData()` sets
`from_list_names` and `skills_granted_object` on `system.selected_adjustment`. That is why those
fields are free-form `ObjectField`s. Derive them into component state instead.

**Decision to make, and the one to ask Fable about:** whether to tighten `base_adjustment` /
`selected_adjustment` into real schemas in this wave or defer. Tightening means changing the
DataModel **and** `template.json` in lockstep and migrating stored class items. Default: derive
now, tighten as a separate change with its own round-trip specs.

### Wave 3 — the two secondary actor sheets · **parallel**

| Unit | Lines | Model | Notes |
|---|---|---|---|
| `module/actor/ship-sheet.js` | 274 | **Sonnet** | The **non-default** ship sheet (SBT is default). Mechanical; schema holes already fixed in §10. |
| `module/actor/creature-sheet.js` | 660 | **Opus** | Big and repetitive, and it shares most shapes with `actor-sheet` — whatever it settles, Wave 6 inherits. Watch `xp.selectedSkill` (§10). |

Both re-register in `module/mosh.js`; worktrees, wire the registrations up on merge.

### Wave 4 — `ship-sheet-sbt.js` · **Opus, solo**

475 lines, the **default** ship sheet. Carries a debt §22 booked deliberately:

1. kill the document write during render — `await this.object.update({"system.megadamage.html": …})`
   inside `getData()` makes the sheet re-render on every change;
2. derive the megadamage list from `hits` + the table entries instead of persisting rendered HTML,
   which also makes the string/number bug structurally impossible (one coercion point);
3. **then** delete `megadamage.html` and `megadamage.menu.html` from the DataModel *and*
   `template.json`, deliberately and in both;
4. remove the interim `String()` stopgap in the AppV1 handler.

`test/e2e/ship-megadamage.spec.ts` asserts on outcomes rather than the DOM specifically so it
survives this wave. It must still pass.

### Wave 5 — `actor-generator.js` · **Opus, solo**

772 lines plus `actor-generator-dialog.html` and four dialogs under
`templates/dialogs/actor-generator/`. The biggest window. **Depends on Wave 2** — it drives
`class-sheet` data, so the shape settled there determines this one.

### Wave 6 — `actor-sheet.js` · **Opus, solo**

658 lines. The character sheet: highest risk, most player-visible, deliberately last with every
convention in hand. Known hazard: `getData()` assembles XP pips into `superData.xp.html` in a
loop, which is why `character.xp.html` is a *number* in the schema. That becomes `{#each}` markup
— do not port the string building.

**After this wave `templates/actor/` and `templates/item/` are empty and phase 4 is complete.**

### Wave 7 — architecture review · **Fable**

Runs once everything is converted and working, so it reviews the real thing rather than a
prediction.

**Inputs:** the whole `module/ui/` tree; `MODERNIZATION.md` §13, §20, §23 and the compromise log
each wave adds to it; `css/mosh.css` (247 selectors, hand-authored); `test/ui-parts.test.ts` and
the e2e tier; `svelte.config.js`.

**Deliverable:** `docs/plans/svelte-architecture.md` — a plan, **not** applied changes. It should
take a position on at least:

- the hybrid CSS decision (§13 parked "dismantle the stylesheet into scoped styles" explicitly for
  this review) — what moves, in what order, and how each step is visually verified;
- presentation persisted into documents, and which schema fields exist only to hold rendered
  strings and can now go;
- the shape of `module/ui/parts/` — what earned its place, what should merge or split, what should
  never have been shared;
- state ownership: where `$derived` should replace a store refresh, and where the document-as-
  source-of-truth convention (§10) is costing more than it buys;
- what the test tiers should assert about components once styling is scoped.

We discuss that file before any of it is executed.

### Wave 8 — phase 5, TypeScript · **decision point, not a commitment**

Flip `checkJs: true` and convert file by file. `module/actor/actor.js` is **2,769 lines** and
should be *split into modules with tests* during conversion rather than translated wholesale —
its automation is the system's real asset. Scope this after Wave 7's discussion; it may well be
its own plan.

---

## Order and dependencies

```
Wave 0  dead templates                          orchestrator
Wave 1  creature-settings ‖ ship-deckplan       Sonnet ×2
Wave 2  class-sheet                             Opus          → unblocks Wave 5
Wave 3  ship-sheet ‖ creature-sheet             Sonnet ‖ Opus
Wave 4  ship-sheet-sbt                          Opus          (after Wave 1: deckplan call site)
Wave 5  actor-generator                         Opus          (after Wave 2)
Wave 6  actor-sheet                             Opus
Wave 7  architecture review → plan file         Fable         → we discuss
Wave 8  TypeScript                              scoped after Wave 7
```

## Risk register

| Risk | Mitigation |
|---|---|
| A sheet binds a field no schema declares; the write is silently discarded | Rule 4 (round-trip). `test/sheet-bindings.test.ts` covers all 13 types and must be extended when a sheet moves to its own folder. |
| An agent converts UI nothing can reach | Rule 3 (reachability). Two of three windows in the last batch were unreachable. |
| Two agents edit `module/mosh.js` or `ship-sheet-sbt.js` | Worktrees; the orchestrator wires registrations on merge; waves ordered so `ship-sheet-sbt` is rewritten only once. |
| A green run that proves nothing | Gate step 5 — mutation-check every new spec. |
| Converted sheet renders dark on light boxes | `themed`, `theme-light` in `DEFAULT_OPTIONS.classes`. Gate step 6 catches it. |
| Fable's review lands after six sheets have hardened the wrong pattern | §23's compromise log is written **as each wave lands**, so the review has evidence and each wave already knows what it deferred. Accepted deliberately: reviewing the real thing beats reviewing a prediction. |
| Schema change breaks existing worlds | `template.json` and the DataModel change together, always. Round-trip specs before and after. |
