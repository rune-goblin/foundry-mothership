# MoSh PSG Core — the plan

Written 2026-08-12. **This supersedes `docs/plans/architecture.md`'s phases 1–3.** That plan was
built on preserving the inherited content; the owner's decision is to stop preserving it and ship
the book instead. What survives from it is noted at the end.

---

## Status — start here

| | |
|---|---|
| **Done** | Phase 0 (§24), **S1** the cut (§25), **S2** the book-tiered pipeline + DataModel guard (§26), **S2b** the TypeScript catalogs and **S3** the content (§27), **S4** the class sheet and `base_adjustment` (§28), **S5** the generator on a draft store and `selected_adjustment` (§29), **S6** the creature sheet and the section tier (§30) |
| **Next** | **S7 — actor-sheet.** The last AppV1 class in the system, and the last sheet template. It composes S6's sections. |
| **Green at** | `check` 0/0 (241 files) · **253 vitest** · **88 Playwright** · `build` |
| **Preserved** | Everything cut is on the pushed `archive/pre-psg-cut` branch **and** tag |

What the system ships today: 2 actor types (character, creature), 7 item types, and **274
documents** across 9 compendia — 42 skills, 4 classes, 22 weapons, 15 armor, 65 equipment, 9
conditions, 13 rolltables, 104 macros. The character generator's compendium scan finds skills and
classes for the first time, and every loadout row links the gear it hands out.

**The commands that matter**, in this order — the middle one is not optional and is easy to miss:

```bash
./scripts/packs.sh pack   # rm -rf the pack dirs first if any source document was REMOVED
npm run setup             # packs/ -> the live Data dir, which the e2e harness clones from
npm run test:e2e
```

---

## S3 design notes — kept as the record of what was decided, now that it is done

**All of this landed; §27 has the outcome.** Three things came out other than as written, and they
are the ones to carry forward:

- **The Scientist's `skills.choices` was not open after all.** `choose_skill_and.master_full_set`
  is exactly *"1 Master Skill, and an Expert and Trained Skill prerequisite"* — the dialog walks
  the whole prerequisite chain. Nothing new was invented.
- **The loadout gap needed 32 documents, not ~12.** The estimate missed the ten outfits the tables
  print *with an Armor Point value*; two of them are AP 2, which no priced armor provides.
- **`character-creation.json` did carry formulas** (`2d10+25`, `2d10+10`, `1d10+10`, `2d10*10`) —
  gap (1) below was stale. Only "Stress starts at 2" is prose, and S5 needs it.

The rest of this section is the reasoning as it stood, kept because S4 and S5 build on it.



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

| | Unit | |
|---|---|---|
| S1 | the cut | ✅ §25 |
| S2 | content pipeline, simplified | ✅ §26 |
| S2b | the book becomes a TypeScript catalog | ✅ §27 |
| S3 | generate the book | ✅ §27 |
| S4 | class-sheet + `base_adjustment` | ✅ §28 |
| S5 | actor-generator on a draft store | ✅ §29 |
| S6 | creature-sheet | ✅ §30 |
| S7 | actor-sheet — last, most player-visible | **next** |
| S8 | conditions contribute advantage/disadvantage to rolls | |
| S9 | trailing, ungated | |

**Each remaining unit is briefed in full below, so a prompt does not have to be.** The prompt names
the unit and points here; the gate commands and their order are in `CLAUDE.md`, the ten standing
rules and the review gate are in `run-to-the-end.md` (rule 11's rescue clause no longer applies,
rule 12 — schema deletions ride the wave that removes their last reader — still does), and the
change boundary is `architecture.md` Decision 2. Restating any of those in a prompt is duplication,
and duplication is how they drift.

`system.json` and `lang/` stay orchestrator-merge-only.

Every unit gates on all four tiers — `check` 0/0, vitest, `npm run content` (clean **and**
byte-identical on a second build), then `packs.sh pack` → `npm run setup` → `test:e2e`. Add specs
for what you change and mutation-check them; **a mutation test of the e2e tier must rebuild first**,
because `npx playwright test` runs against whatever `dist/` already holds (§28).

---

### S5 — actor-generator on a draft store ✅ §29

**Landed.** Three things came out other than as written, and S6/S7 inherit them:

- **The two owner decisions were both taken the affirmative way.** Stress is written from the book
  on save, and the HEALTH bonus box — bound to `system.health.bonus`, read as
  `system.health.mod`, so never once effective — was made to work rather than deleted.
- **`selected_adjustment` was earned.** The blocker §28 recorded was not a conflict: a *pick-set*
  is what `choose_skill_and` is and what each `choose_skill_or` option carries, which is why one
  dialog reads both. `template.json` did not move, because tightening changed no default — the
  option shape is pinned in `item-models.test.ts` and by the content guard, which now descends
  into arrays.
- **Rolling a patch or trinket threw**, not just the loadout. Those rows link nothing, the AppV1
  regex matched `null`, and the next line indexed it.

The brief as it stood follows, because S6 and S7 build on it.

The last window on a bare `FormApplication`, and the one place where the DOM is the source of truth.

| Surface | |
|---|---|
| `module/windows/actor-generator.js` | 772 lines, `extends FormApplication` |
| `templates/dialogs/actor-generator-dialog.html` | 305 lines |
| `templates/dialogs/actor-generator/*.html` | 4 dialogs, 168 lines |
| Entry point | `actor-sheet.js:651`, a header button — **that sheet is AppV1 until S7**, so the entry must keep working from AppV1 code |

**1. The draft store.** `architecture.md` Decision 3 reserves a second, explicitly named pattern for
this window, distinct from §10's document store: the generator is a wizard whose product is one
batch write, so `CharacterDraft` holds `$state` for the rolled stats, health and credits, the chosen
class UUID and the applied bonuses, and the actor is written once on submit.

What that replaces, measured:

- `getData()` does `let data = this.object; data.system.class = []` — it writes render scaffolding
  onto the **live actor document**. Not a copy; the actor's own prepared `system.class` is stomped
  in memory on every render.
- Every step pokes the form: `this._element.find('input[name="system.stats.x.bonus"]').prop(…)`.
  `statOptions`, `showSkillDialog`, `showOptionsDialog` and `popUpSkillOptions` all resolve into the
  DOM and the submit reads it back out of `formData`. Those become draft mutations; the four dialogs
  become DialogV2, built the way `module/ui/class/stat-option.js` builds one.

**2. Formulas from the book.** Lines 58–98 hardcode `2d10+25`, `2d10+10`, `1d10+10`, `2d10*10`.
All four are `CHARACTER_CREATION.steps[].roll.formula` in `content/books/psg/character-creation.ts`,
pinned by `test/content-catalogs.test.ts:128`. Import them — the catalog is a typed module, not
documents, because nobody browses a creation step.

Step 4 also says *"Characters' current Stress and Minimum Stress both start at 2"*, which the
generator does not do: it sets `hits.max = 2 + max_wounds bonus` (~line 703) and nothing else.
**Reserved for the owner**: set Stress from the book, or leave it to the sheet's defaults — decide
deliberately and record which.

**3. The loadout extraction — the bug S3 found and left.** `rollTable()` (~line 103) handles two
result types. The `text` branch runs `match(/(.*)(@UUID.*)/i)` and two greedy replaces and pushes
**one** bare id per row (~lines 123–131), while the submit splits `system.class.loadout.uuid` on
commas and calls `modifyItem` per entry (~line 745) — the structure always expected several.
Measure which result type the emitted rows actually use before writing the fix; §27 says every row
links real gear and `test/e2e/psg-content.spec.ts` already asserts it. `modifyItem`
(`actor.js:1807`) resolves through `fromIdUuid` and then dedupes **by name** on the actor, so
passing three ids is correct and aggregating quantity stays the caller's job. Its signature is
public API — shipped compendium macros call it.

**4. `selected_adjustment`, if this unit earns it.** S4 left it a free-form `ObjectField` for one
reason, recorded in `item-models.js` and §28: `showOptionsDialog` resolves one `choose_skill_or`
option and hands it straight to `popUpSkillOptions`, which reads the same object as a pick-set. If
the draft store untangles that, tighten it to the shape `architecture.md` Decision 2c already
writes out, with `template.json` in lockstep and the content build's DataModel guard as the fast
feedback loop. If it does not, leave it and update the comment to say what is still in the way.
Decision 2c's two side effects stay features: `NumberField` coerces the strings the dialogs write,
and the schema retires the legacy nested-array `skills_granted` the generator itself calls "legacy".

**Capstone:** an e2e that generates a Marine end to end against the real headless Foundry and
asserts the stats, the granted skills and the loadout **items** on the actor — a three-item loadout
row must yield three items.

---

### S6 — creature-sheet ✅ §30

**Landed.** Four things came out other than as written, and S7 inherits them:

- **`ItemPanel` needed no `hideWeight` flag.** With the columns as data and the row as a snippet,
  the caller drops the Weight column itself. Decision 1's falsifier passed with the taxonomy props
  alone; the shared part is the frame, which is the part that was byte-identical to begin with.
- **`condition.treatment.html` and `weapon.ranges.value` stay** — the character sheet still reads
  both, so those two deletions ride S7 (rule 12). Only `creature.xp.html` had its last reader here.
- **The converted sheets have been quietly losing their image borders.** `body.game .app img` does
  not reach an ApplicationV2 window. Caught by the before/after screenshot, fixed in `css/mosh.css`
  for every sheet at once.
- **Five bugs, including two the sheet had always had**: it opened on a tab no panel declares, so
  the body was blank, and the notes tab never rendered the notes because `getData()` did not
  enrich them.

The brief as it stood follows, because S7 builds on it.

`module/actor/creature-sheet.js` (661 lines) + `templates/actor/creature-sheet.html` (434). The
settings window it used to carry is already ApplicationV2 (§24).

**This is where the sections land, not S7.** Evidence 1.1 measured the two actor sheets sharing 24
of 25 bindings and byte-identical item-list blocks; `architecture.md` Decision 1 answers that with
shared sections — `ItemPanel`, `HealthBlock`, `ArmorBlock` under `module/ui/parts/sections/` — and
**still two sheets**, no variant-flag mega-component. The creature is the smaller consumer, so it
proves the sections before the player-visible sheet depends on them. Decision 1's falsifier stands:
a section needing more than ~3 divergence props splits.

- **Deletes `creature.xp.html`** (a string here, a number on the character) with `template.json`,
  replaced by `PipTrack` + `$derived`. `creature-sheet.js:92–114` builds those pips as an HTML
  string and writes them onto `system` during render.
- The same `getData()` writes `item.ranges.value` and `item.treatment.html` onto **embedded item**
  objects while rendering (lines ~163, ~172) — same defect class, and it is why those two fields
  exist at all.
- **Out of bounds:** the swarm rescaling arithmetic and everything else in `prepareDerivedData`
  (Decision 2). `data-models.spec.ts` drives the swarm toggle end to end; if a unit spec has to
  change for an edit to pass, the edit is out of scope.

---

### S7 — actor-sheet

`module/actor/actor-sheet.js` (653 lines) + `templates/actor/actor-sheet.html` (522). Last, because
it is the most player-visible thing in the system. It composes S6's sections and keeps its
genuinely divergent parts local — the dial header, the saves, the stress panic split.

Deletions it carries, each in the DataModel **and** `template.json` (Decision 2a):

| Field | Replaced by | Note |
|---|---|---|
| `character.xp.html` (a *number*) | `PipTrack` + `$derived` | built as an HTML string at `actor-sheet.js:52–79` |
| `condition.treatment.html` | `PipTrack` from `treatment.value` | written onto embedded items at `actor-sheet.js:123–139`; the `.treatment-button` handler at 201 stays |
| `character.weight.current` / `.capacity` | computed in `prepareDerivedData`, not stored | explicitly inside Decision 2's may-change list |

**`weapon.ranges.value` is done — §31, landed after the S6 review, and Decision 2a's row is
struck.** It was the opposite of a render artifact: all 22 shipped weapons carry a PSG range *band*
in it and `short`/`medium`/`long` are `0` on every one. So the field stayed and the **trio** went,
as an enum — `system.range`, a `StringField` whose `choices` are the four bands plus `none` for a
weapon that has no range at all (Ammo), and no migration (the owner's call: fresh worlds forward
from here). The character sheet's `_prepareCharacterItems` no
longer composes `10/20/30` onto embedded items during render, so **S7 has nothing left to do here**
beyond keeping the localized band in its converted markup.

---

### S8 — conditions contribute advantage/disadvantage to rolls

The requirement `architecture.md` records, and the one unit that is **allowed to change the roll
pipeline** — so it changes the specs first, on purpose, exactly as Decision 2 provides for. Not a
conversion wave; its own proposal.

The chain is three links, and two of them do not exist yet:

1. **The book's data exists.** `content/books/psg/conditions.ts` seeds `modifiers: ['disadvantage']`
   on the three the panic results vouch for — Frightened, Nightmares, Spiraling — and leaves the
   other six empty, per the owner's decision.
2. **The schema has no field for it and the emitter drops it.** `MoshCondition` declares
   `description`, `severity`, `treatment`; `scripts/content/books/psg/documents.ts:20–44` never
   reads `modifiers`. So a condition document ships today with nothing a roll could consult.
3. **Nothing consults it.** Advantage and disadvantage are a *dialog button* — `1d100 [+]` /
   `1d100 [-]` — at three sites in `actor.js` (~786, ~934, ~1008). An owned condition has to reach
   that decision, and the honest question is whether it forces the roll string or preselects a
   default the player can override. **Reserved for the owner.**

Do all three or none: a schema field with no reader fails `field-usage.test.ts`, which is the
ratchet working.

---

### S9 — trailing, ungated

Not a wave; a list that only makes sense once the conversions are done.

- **The Svelte architecture audit** (§23) — the hybrid CSS decision itself, and `ClassSheet.svelte`'s
  six tabs in one component.
- **The CSS dissolution.** §13 parked it as a styling project with real visual risk; `architecture.md`
  C14/C15 give it an order and a verification method.
- **TypeScript, `checkJs` per file**, then globally — `module/**/*.js` is unchecked today.
- **`actor.js` split into tested modules.** 2,338 lines, and the largest single file in the system.
- **`template.json` retirement** (Decision 4): once a generated, committed type snapshot exists and
  its staleness check is mutation-proven, it takes over the oracle's job. v16 removes support
  regardless.

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
