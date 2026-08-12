# MoSh PSG Core — the plan

Written 2026-08-12. **This supersedes `docs/plans/architecture.md`'s phases 1–3.** That plan was
built on preserving the inherited content; the owner's decision is to stop preserving it and ship
the book instead. What survives from it is noted at the end.

---

## Status — start here

| | |
|---|---|
| **Done** | Phase 0 (§24), **S1** the cut (§25), **S2** the book-tiered pipeline + DataModel guard (§26) |
| **Next** | **S2b — convert the book to TypeScript catalogs**, then **S3 — generate the content.** Read the decisions below before briefing either. |
| **Green at** | `check` 0/0 (221 files) · **178 vitest** · **56 Playwright** · `build` |
| **Preserved** | Everything cut is on the pushed `archive/pre-psg-cut` branch **and** tag |

What the system ships today: 2 actor types (character, creature), 7 item types, **7 rolltables,
11 conditions, 107 macros — 136 documents**. It ships **no skills, classes, weapons, armour or
equipment**; S3 is where that changes and where the character generator gets data for the first
time.

**The commands that matter**, in this order — the middle one is not optional and is easy to miss:

```bash
./scripts/packs.sh pack   # rm -rf the pack dirs first if any source document was REMOVED
npm run setup             # packs/ -> the live Data dir, which the e2e harness clones from
npm run test:e2e
```

---

## S3 design notes — measured, so the next session need not re-derive them

### The class-adjustment mapping is three rules plus one open question

The book's `adjustments: [{raw, kind, target, value}]` does not map mechanically onto the runtime
`base_adjustment` / `selected_adjustment` shape the generator reads. All four classes, measured:

| Book form | Example | Runtime |
|---|---|---|
| `kind: stat`, named target | `+10 COMBAT` | `base_adjustment.combat` |
| `kind: save`, named target | `+10 BODY SAVE` | `base_adjustment.body` — **stats and saves share one flat key space** |
| `kind: max-wounds` | `+1 MAX WOUNDS` | `base_adjustment.max_wounds` |
| `target: "all"` | `+5 TO ALL STATS`, `+10 TO ALL SAVES` | fan out across the four stats / three saves |
| `target: null` | `-10 TO 1 STAT` (Android), `+5 TO 1 STAT` (Scientist) | **a choice** → `selected_adjustment.choose_stat: [{modification, stats: [...]}]` |

Skills: `skills.granted` (ids) → `base_adjustment.skills_granted` (**UUIDs**, so skills must be
emitted first and their ids known within the same build); `skills.bonus.options` → a single option
becomes `choose_skill_and`, multiple options become `choose_skill_or`.

**The one genuinely open case:** the Scientist's `skills.choices` — *"1 Master Skill, and an Expert
and Trained Skill prerequisite"* — has no clean equivalent in the runtime shape. Decide it
deliberately in S3 rather than letting an agent guess.

`architecture.md` Decision 2 still governs: **do not reshape the runtime schema to match the book.**
The content build is the adapter.

### Two gaps in the extraction, and one thing the book simply lacks

Measured against `content/books/psg/`. The internal joins are healthy — **42 skills with 0
unresolved prerequisites, 0 unresolved class-granted skills** — but:

1. **`character-creation.json` holds prose, not formulas.** *"Roll 2 ten-sided dice (2d10), add them
   together, then add 25"* is a sentence. The generator needs `2d10+25`. Only four values are
   involved (stats `2d10+25`, saves `2d10+10`, health `1d10+10`, Stress starts at 2), so
   hand-authoring them in the pipeline is cheaper than re-extracting — but it is authored data, and
   should be labelled as such rather than pretending it came from the book.
2. **Loadout results are free text, not references.** `items: ["Tank Top and Camo Pants (AP 1)",
   "Combat Knife (as Scalpel DMG [+])", "Stimpak (x5)"]` — strings, not ids into
   `equipment`/`weapons`/`armor`. So the plan's "loadout tables whose results link the new
   equipment documents" **cannot be built from this data as it stands.** → **Settled below**
   ("loadouts link real gear documents"): a hand-checked mapping table, typed, plus ~12 new Items.
3. **There is no conditions dataset in the PSG extraction at all.** The 11 conditions the system
   ships are inherited prose, not book-sourced. Only three carry a modifier the book can vouch for
   (`Frightened`, `Nightmares`, `Spiraling`, all `disadvantage`, via the panic results that grant
   them). The owner's decision stands: seed those three, leave the rest neutral.

**If the corpus is ever re-extracted, (1) and (2) are the two things worth fixing at the source.**
Neither blocks S3.

### Decided — the book is a TypeScript catalog, not JSON + JSON Schema

**This supersedes `architecture.md` Decision 4's content half.** That decision said "Content: JSON
Schema first… writing TS first would make this repo upstream of the data repo's validator —
backwards." **The premise is gone:** `../mothership-data` has no `.git`, there is no sync, and the
corpus is imported once and owned here (§26). With no upstream validator to be upstream *of*, the
argument for JSON Schema no longer holds.

So `content/books/psg/*.json` + `schema/*.schema.json` become **typed TypeScript catalogs**:

```ts
export const GEAR = [...] as const satisfies readonly Gear[];
export type GearId = (typeof GEAR)[number]['id'];
```

**What this buys, and the loadout mapping is the case that decides it.** Ids become literal union
types, so the three cross-reference sets stop being runtime-validated and start being
compiler-enforced — the 42 skills' prerequisites, the classes' granted skills, and above all the
~99-row loadout mapping, where a wrong gear id becomes a **compile error** rather than an integrity
failure a test may or may not catch.

It also deletes more than it adds: Ajv, the 13 schema files, `validate.ts`, and S2's strict-mode
fixes. `tsconfig.json` already includes `scripts/**/*.ts`, so `npm run check` covers the catalogs
with **no new tooling** (TypeScript is 5.9.3, so `as const satisfies` is available). And JSON's
no-comments rule goes away, which matters for a transcription where `Combat Knife (as Scalpel DMG
[+])` needs a note explaining what it maps to.

**Two invariants, or this becomes the third-schema-language mistake Decision 4 was guarding
against:**

1. **Runtime types stay generated from `defineSchema()`.** The catalogs describe the *book*;
   `defineSchema()` describes the *runtime*; the build is the adapter. Never a hand-written runtime
   type.
2. **S2's DataModel guard stays, and is still load-bearing.** TypeScript cannot see
   `defineSchema()` — the guard is the only thing verifying the adapter's *output* fits the schema
   Foundry will clean it against.

**Method:** generate the `.ts` from today's `.json` **mechanically, once**, so the transcription
stays faithful; hand-author only the genuinely new parts. Do not retype 353 records by hand.

**Do this before S3 emits anything.** Converting 353 records now is a one-time mechanical
transform; after S3 it means redoing the source of ~130 documents plus the loadout mapping.

### Decided — loadouts link real gear documents, and the gear is browsable

Both halves, because **the generator already assumes it**: on submit it reads
`formData["system.class.loadout.uuid"].split(",")` and adds those items to the character. Ship
loadouts as text and that path stays permanently dead — it has never had data.

Measured against the corpus:

| | |
|---|---|
| Gear documents from `equipment` + `weapons` + `armor` | **71** |
| Distinct item strings across the 4 loadout tables | **99** |
| Exact name match | 30 |
| Match after stripping `(…)` and `xN` | +24 |
| No match | **45** |

The 45 are not all missing. **The parentheticals carry the mapping instruction** — `Combat Knife
(as Scalpel DMG [+])`, `Screwdriver (as Assorted Tools)` name the item to use. Others are
near-misses: `Paracord (100m)` vs the listed `Paracord (50m)`, `Small Pet (organic).` vs
`Pet (Organic)`, `Oxygen Tank with Filter Mask` vs `Oxygen Tank`. Genuinely absent —
`Defibrillator`, `Satchel`, `Vaccine`, `Tennis Ball`, `Challenge Coin`, `Dog` — are real gear the
PSG never priced, and ship as Items sourced from the loadout tables.

So: a **one-time hand-checked mapping table of ~99 rows** plus roughly a dozen new Items. Reviewable
in one pass, and typed under the decision above so it cannot silently rot. Item count goes from
~117 to **~130**; gear becomes browsable and draggable through the standard Foundry interfaces; the
generator's loadout step works for the first time.

### S3 must close the id-preservation loop

`checkIdPreservation` is written and tested but deliberately **not** wired into `build()` (§26).
S3 regenerates the macro pack from a table and will not reproduce all 107 inherited macros, so
turning it on today fails every build. **S3 retires what it drops — the registry takes a reason —
and then wires the check on**, one line in `pipeline.ts`. That check is what protects the `@UUID`
cross-references the surviving rolltables still hold.

## The goal, in one sentence

**Our own implementation of Mothership 1e, complete and faithful to the Player's Survival Guide,
and containing nothing else** — then extend one book at a time.

The Warden's Operations Manual is next and is already owned. The Shipbreaker's Toolkit brings
ships back. So the architecture's first requirement is that **adding a book is additive**: a new
source directory and a build-config entry, not a rework.

---

## Why the previous plan is being replaced

`architecture.md` sequenced the work around rescuing the inherited packs: an id registry seeded from
`packs/_source` to keep 269 `@UUID` cross-references alive, a one-way-door rescue program with an
enumerated-transform proof, and a phase 3 that paid down the ship sheets' accumulated debt.

Every part of that exists to preserve content we are now deleting. Removing the content removes the
machinery with it:

| Dropped from the plan | Because |
|---|---|
| The id-preservation burden and the 269-`@UUID` guarantee | Nothing inherited survives to reference |
| `rescue.ts`, the enumerated-transform proof, the one-way door | There is nothing to rescue |
| C10–C13 (the whole of phase 3) | Ships are cut |
| §22's ship debt — write-during-render, persisted `megadamage.html`, the `String()` stopgap | Deleted with the sheet |
| The `name.split('.')` hack in `ship-sheet-sbt.js:142` | Deleted with the sheet |
| The two-tier "derived vs rescued" distinction | One tier: content this repo generates from a book |

The cut is 811 lines of ship sheets out of 8,776 lines of runtime code — **9%**. The roll engine,
the test harness, the Vite/TS build, and the whole converted `module/ui/` layer are character-side
and survive untouched. This is a deletion, not a rewrite, which is why it is done in this repo
rather than a new one.

---

## What ships

### Generated from the book

| Pack | Type | Count | Source |
|---|---|---|---|
| skills | Item | 42 | `skills.json` |
| classes | Item | 4 | `classes.json` |
| weapons | Item | 22 | `weapons.json` |
| armor | Item | 5 | `armor.json` |
| equipment | Item | 44 | `equipment.json` |
| wound tables | RollTable | 5 tables, 50 rows | `wounds.json` (`1d10`: Blunt Force, Bleeding, Gunshot, Fire & Explosives, Gore & Massive) |
| panic table | RollTable | 1 table, 20 rows | `panic.json` |
| death save | RollTable | 1 table, 4 rows | `death.json` |
| trinkets, patches | RollTable | 2 tables, 100 rows each | `trinkets.json`, `patches.json` |
| loadouts | RollTable | 4 tables | `loadouts.json` — Marine, Android, Scientist, Teamster |
| conditions | Item | ~10 | the panic results carrying an ongoing effect |
| macros | Macro | generated | one row per triggered call the shipped tables and sheets need |

**117 new Items the system has never shipped** — which is the headline: the character generator
scans compendia for `type: "skill"` and `type: "class"` and has never found any. It starts working
when this lands.

`character-creation.json` stays a **typed module**, not documents — it supplies the generator's
step dice formulas, replacing today's hardcoded `"2d10+25"` strings. Nobody browses a creation step.

### Kept as code, unchanged

The roll engine (`parseRollString`, `parseRollResult`, `compare`, `rollCheck`, the panic and wound
flows), the character and creature DataModels and item types, `module/ui/` in full, the test tiers,
the build.

**Creatures stay.** They are Warden's-book material and ship no content today, so the sheet costs
nothing and is ready for the next book.

---

## What is cut

All of it is preserved on the **`archive/pre-psg-cut`** branch and the **`pre-psg-cut`** tag — the
complete pre-cut tree, 326 documents, both ship sheets, all four panic tables. Nothing is destroyed;
ships return by cherry-pick when the Shipbreaker's Toolkit is transcribed.

| Cut | Detail |
|---|---|
| **Ships, entirely** | `ship-sheet.js` (274), `ship-sheet-sbt.js` (475), `ship-deckplan.js` (62); the `ship` actor type from the DataModels, `template.json` and `system.json`; `ShipSetupApp` and its e2e spec |
| **Ship content** | Bankruptcy Save (4), Distress Signal (5), Maintenance Issues (100), Megadamage Effects (10); the 100-item maintenance pack |
| **Ship code in `actor.js`** | `_deriveShip`, `distressSignal`, `maintenanceCheck`, `bankruptcySave`, the megadamage helpers — 24 sites |
| **Ship dialogs** | The three templates repaired this session, and their `actor.js` call sites |
| **Panic variants** | Calm/Normal (28), Calm/Android (28), Stress/Android (20) — 76 rows with no book source, plus the `useCalm` and `androidPanic` settings that select them |
| **Conditions without a book source** | ~40 of the 50, including the environmental and android sets |
| **The inherited macro packs** | 162 documents; regenerated from a table, only what the surviving content needs |
| **Settings** | `table1eDistressSignal`, `table1eMegadamageEffects`, `table1eMaintenance`, `table1eBankruptcy`, `useCalm`, `androidPanic`, and the panic-variant table settings |

The three ship dialogs repaired earlier today are cut too. That work was not wasted: it found a
real defect class, the finding is recorded in `MODERNIZATION.md` §24, and if ships return they
return repaired.

---

## The content system, simplified and book-tiered

One tier, one direction, no upstream sync. The corpus is imported once and owned here.

```
content/
  books/
    psg/            the Player's Survival Guide transcription — the 12 datasets with a consumer
      *.json
      schema/       JSON Schemas for those datasets
      BOOK.md       title, edition, printing, and what this repo took from it
    warden/         next book, when it is transcribed — same shape, additive
  ids.json          stable ids per emitted document, so a rebuild does not churn every id
scripts/
  build-content.ts  content/books/** + ids.json -> packs/_source/**
```

**Deleted from C1:** `sync-content.ts` and its drift detection (the source has no git history to
sync against — there is no upstream, only a folder), the two-tier strictness split in the
validator, the seven datasets with no consumer (`contractors`, `pets`, `cover`, `radiation`,
`medical-treatments`, `shore-leave`, `rules-index`), and the `CHECKSUMS`/`PROVENANCE` machinery
that stood in for a commit hash that never existed.

**Kept from C1** — it is proven and still applies: the emitter's minimal document shape, canonical
key-sorted serialisation, the determinism test, and referential integrity. Verified during the C1
gate by driving the real emitter and feeding its output to `fvtt package pack` — Items, Macros and
RollTables all pack and round-trip with `_id`s, `_key`s, result ranges and `@UUID` links intact.

**Ids still matter, for a smaller reason.** Not for inherited references — there are none — but so
that a rebuild does not hand every document a new id and invalidate every world that uses the
system. `ids.json` stays; the preservation *proof* goes.

### One gap to close first

The C1 gate found that the pipeline can emit a `system` object containing keys the DataModel does
not declare — Foundry's `SchemaField` then **silently discards them on load**. This is the repo's
signature bug (armour `equipped`, creature `swarm`, the twelve found in §10). C1's validator checks
records against JSON Schema; nothing checks the emitted `system` against the model that receives it.

**Every emitted `system` key must be declared by its target type's DataModel, enforced at build
time.** `test/field-stubs.ts` already walks the real schemas, so the check is cheap. This lands
before any content is generated, because generating first means shipping silently-dropped data.

---

## Order

Cut first. Every later step is smaller for it — fewer sheets to convert, fewer specs to keep green,
one less actor type in every schema test.

```
S1  the cut                                                          orchestrator + Sonnet sweep
    ships out of module/, actor.js, DataModels, template.json,
    system.json, settings, lang, tests; panic variants and the
    unsourced conditions out of packs/_source; archive branch pushed
    first. Gate: check, 0-warning svelte-check, vitest, e2e green
    with the ship specs removed rather than skipped.

S2  content pipeline, simplified                          ✅ done (§26)  Opus
    strip C1 to one tier; content/books/psg/; the DataModel guard
    above; determinism + integrity retained.

S2b the book becomes a TypeScript catalog                            Opus
    json + json-schema -> typed .ts catalogs, converted MECHANICALLY
    from today's json. Ids become literal union types; Ajv, the 13
    schemas and validate.ts are deleted. Must land before S3 emits
    anything -- see the decision above. The DataModel guard and the
    generated-from-defineSchema rule are unchanged.

S3  generate the book                                                Sonnet, against S2's tests
    ~130 Items (117 + the loadout-only gear), 7 tables from
    wounds/panic/death, trinkets, patches, 4 loadout tables linking
    real gear documents, the conditions with modifiers seeded on
    Frightened/Nightmares/Spiraling, the macro table.
    Retire the ids it drops, then wire checkIdPreservation on.
    Milestone: browsable in a real Foundry; the generator has data
    for the first time, loadouts included.

S4  class-sheet + the class-adjustment schema                        Opus
    derive first, then tighten base_adjustment/selected_adjustment
    into real SchemaFields with template.json in lockstep. Kills the
    last AppV1 item-sheet base.

S5  actor-generator on a draft store                                 Opus (needs S3 + S4)
    formulas from character-creation.json; capstone e2e: generate a
    Marine end to end and assert stats, skills and loadout.

S6  creature-sheet                                                   Opus
S7  actor-sheet — last, most player-visible                          Opus
    deletes xp.html, treatment.html, ranges.value and the weight
    fields with template.json.

S8  conditions contribute advantage/disadvantage to rolls            Opus
    the requirement recorded in architecture.md. Seed the three the
    book vouches for; the rest neutral, per the owner's decision.

S9  trailing, ungated: CSS dissolution; TypeScript, checkJs per file,
    actor.js split into tested modules.
```

`system.json` and `lang/` stay orchestrator-merge-only. The ten standing rules and the review gate
in `run-to-the-end.md` continue unchanged; rule 11's rescue clause no longer applies, rule 12
(schema deletions ride the wave that removes their last reader) still does.

---

## What survives from `architecture.md`

Still correct, still the plan: **Decision 1** (the component architecture — keep the primitives, add
`MinMaxField`/`RollableStat`/`PipTrack`, shared sections, and the `ItemPanel` falsifier);
**Decision 2**'s change boundary (the roll pipeline and derivation arithmetic are spec-pinned and
out of bounds — if a unit spec must change for an edit to pass, the edit is out of scope) and its
list of render-artifact fields to delete; **Decision 3** (document store for sheets, draft store for
the generator); **Decision 4** (types generated from `defineSchema()`, never hand-written).

Superseded: Decisions 5 and 6 in their entirety — what is a document, the two-tier content system,
the rescue, the id registry's justification — and Decision 7's phase order.

The measurement corrections made during phase 0 stand and are load-bearing here: the triggered-macro
structure (116 base names, not 50×3), the conditions chain (table → macro → condition, four panic
tables, 40 + 10 = 50), and the `modifiers` count (35 real values, none on a condition).

---

## Risks

| Risk | Mitigation |
|---|---|
| The cut removes something the character side quietly depends on | Cut in one reviewable commit per area, `npm run check` + vitest + e2e after each; the usage ratchet (`field-usage.test.ts`) fails on any schema leaf left without a reader |
| Generated content is silently dropped by a `SchemaField` | The DataModel guard in S2, before any content is generated |
| The book transcription is wrong or incomplete | It is now the only source, so errors ship. The capstone e2e (generate a Marine, assert the result) is the end-to-end check; per-dataset counts are pinned |
| Ships are wanted back sooner than expected | `archive/pre-psg-cut` branch and tag, pushed before the cut; ships return as an additive book tier |
| Adding the Warden book turns out to need a rework | The book-tiered layout is built in S2, before the PSG is generated, so the second book is exercised by construction rather than retrofitted |
