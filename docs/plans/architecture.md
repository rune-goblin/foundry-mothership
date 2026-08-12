# Architecture review — the plan

Written 2026-08-12 against `d279206`, from `docs/plans/evidence.md` (Parts 1–4), the converted
`module/ui/` tree, the six unconverted sheets, the DataModels, the pack sources, and
`mothership-data`. This is a plan to discuss, not applied changes.

The owner's steers, folded in throughout: **simplify to what is actually used; type the reduced
surface; decide per dataset whether content is a document or a typed module; the Player's
Survival Guide is the source of record; ships stay and their inherited content is rescued; and
the order is — build correctly from the PSG content, then character mechanics and sheets
against that clean data, then refactor ships to match.**

---

## Diagnosis

The converted layer is right and should not change. The document-store convention (§10), the
ApplicationV2 shell, the primitives in `module/ui/parts/`, and the test tiers all survived nine
conversions and two sheet families. Nothing below proposes reworking them.

Everything else traces to one fault: **only the converted sheets have a single source of
truth.** The unconverted code keeps truth in four wrong places —

1. **In the document, as rendered HTML** — `xp.html`, `treatment.html`, `megadamage.html`:
   schema holes cut because Handlebars cannot compute (evidence 1.4).
2. **In the DOM** — the generator's interim state lives in input values and instance fields
   (1.6); the class sheet reads a creation form by DOM index (1.5).
3. **In free-form schema** — `base_adjustment` / `selected_adjustment` are `ObjectField`s so a
   render-time mutation survives, and the generator reads that untyped shape positionally (1.5).
4. **In exported-world debris** — 326 pack sources carrying a stranger's metadata, content in
   the `name` field, 151 hand-multiplied macros (2.3, 2.3b) — while the content the runtime
   actually needs ships nowhere: the 772-line character generator has scanned for skill and
   class documents that no pack has ever provided (Part 4.1).

The owner's thesis holds: runes make derivation free, so every field that exists only to hold a
render result is deletable the moment its sheet converts — and not before, or the conversion
re-enshrines it. The schema work and the UI work are one schedule.

And the framing that sets the order: **this is not a cleanup with some content attached — the
system is about to ship the content it has always been missing.** The derived tier is wholesale
generation, not a merge; there is nothing on the system side to reconcile against (Part 4.3).
When it lands, the character generator works for the first time. That is the feature, it goes
first, and everything else is built against the clean data it produces.

---

## Decision 1 — the target component architecture

### Keep the primitives; add a second batch, by measured recurrence

`module/ui/parts/` earned its place (evidence 1.2) and stays as is. Add:

| New primitive | Replaces | Uses | When |
|---|---|---|---|
| `MinMaxField` | the `.minmaxwrapper` current/max pair | ~17 (8 actor+creature, 9 ship) | phase 2 |
| `RollableStat` | `.rollable[data-key][data-roll][data-label]` labels — the data-attribute convention becomes props plus an `onroll` callback | ~18 | phase 2 |
| `PipTrack` | the XP and treatment pips **currently built as HTML strings in JS** | 4 sites; kills `xp.html` and `treatment.html` (Decision 2) | phase 2 |
| `StatPanel` | `circle-statwrapper` / `mainstatwrapper` + title + dials, hand-rolled with inline `style=` at every call site | 11+, ships only | phase 3 |
| — | `.list-roll` folds into `ItemCell` — it already takes an optional click; a `roll` prop adds the class, no new component | 33 | phase 2 |

Each lands with a `test/ui-parts.test.ts` contract spec pinning its stylesheet selector,
mutation-checked, exactly as §20 did.

### Add one tier above primitives: sections

The evidence (1.1) shows `actor-sheet` and `creature-sheet` share 24 of 25 bindings and
byte-identical item-list blocks. That is too much sharing for primitives alone and too little
for one sheet. The answer is **shared sections — and still two sheets**:

```
module/ui/parts/sections/
  ItemPanel.svelte     one item-list block: header, ItemList of typed rows, controls,
                       hideWeight — instantiated per taxonomy (armor / gear / weapons /
                       skills+conditions; ships reuse it for crew / cargo / modules / repairs)
  HealthBlock.svelte   the paired health/wounds MinMaxFields
  ArmorBlock.svelte    the AP / DR readout
```

`CharacterSheet.svelte` and `CreatureSheet.svelte` each compose these and keep their genuinely
divergent parts local — the character's dial header, saves and calm/stress panic split; the
creature's enable-gated stats, swarm rescaling and `abilities` panel. **No variant-flag
mega-component.** A flag-driven single sheet is where this abstraction stops paying: the headers
differ structurally, not parametrically, and a component that branches on "am I a creature"
throughout is harder to read than two sheets sharing sections.

The two ship sheets share the same CRUD sections in phase 3 and stay two sheets — though the
plain `ship-sheet.js` is non-default, was forked from SBT, and partially binds dead markup
(1.7). **Product call for the owner, flagged now so phase 3 is sized right: convert it, or
delete it and ship SBT as the only ship sheet.** Recommendation: delete it; two ship sheets is
the fork's accident, not a design.

Where abstraction stops, stated as rules:

- **Recurrence 1 gets no primitive.** The class sheet's inline creation row and its nested
  list-of-lists (1.3) become well-formed *local* components with real state — the fix for
  reading six fields by DOM index is a Svelte bind, not a shared abstraction.
- **A section that needs more than ~3 divergence props splits.** Cheapest falsifier: build
  `ItemPanel` against `actor-sheet`'s blocks, then apply it to `creature-sheet`. If it sprouts
  flags beyond list-taxonomy and `hideWeight`, the sharing hypothesis was wrong — split it and
  keep only the primitives. That evidence is bought early (phase 2's first unit) before the
  hard sheets depend on it.

Small adjacent cleanup: one shared `readSheetSettings()` for the `useCalm` / `hideWeight` /
`androidPanic` triple copied verbatim across four sheets (1.8). Dead listener bindings (1.7)
die with their sheets; no tooling needed.

### CSS: keep the hybrid, schedule the dissolution after phase 3

§13's parked question. Position: **the hybrid decision stays until the last Handlebars template
is gone**, because the global class names are shared with unconverted sheets until then —
scoping mid-phase would fork every shared selector. Afterwards, dissolve `css/mosh.css`
component-by-component: move a rule into the owning component's `<style>`, delete the global
rule, update the ui-parts contract spec (the class-name contract dissolves with it),
screenshot-diff. Trailing, low-risk cosmetic work — schedule it opportunistically, never as a
gate.

---

## Decision 2 — the data model

### The change boundary first — because "improve as you go" needs one

The owner's licence to improve mechanics is not a licence to rewrite them. The line:

**May change (shape, state ownership, and mechanics whose current form is a defect):**
derivations moving into `prepareDerivedData` (`weight.capacity`/`current`, evidence 1.8);
presentation fields deleted; the two `ObjectField`s tightened; the generator rebuilt on a draft
store with its dice formulas read from `character-creation.json` instead of hardcoded strings;
condition pips derived; the settings-read triple deduplicated; the maintenance `name.split`
hack deleted once its data is fixed.

**Must not change in phases 1–2 (and only deliberately ever):** the roll pipeline —
`parseRollString`, `parseRollResult` (~400 lines), `compare` — whose unit specs are the
de-facto rules spec; the `prepareDerivedData` arithmetic (armour points, damage reduction, net
HP, bleeding, swarm), also unit-pinned; check/save/panic semantics; item CRUD semantics. Any
change here is its own proposal that changes the specs first, on purpose. The practical test:
**if a unit spec has to change for the edit to pass, the edit is out of bounds for a
conversion wave.**

### What gets deleted, grounded in Part 3

Three classes of deletion, each made in the DataModel **and** `template.json` together, each
riding the wave that removes its last reader:

**a. Render artifacts** (exist only because Handlebars could not compute):

| Field | Dies in | Replaced by |
|---|---|---|
| `character.xp.html` (a *number*), `creature.xp.html` | phase 2, with the actor/creature sheets | `PipTrack` + `$derived` |
| `condition.treatment.html` — including the copies persisted in 50 shipped items | content: phase 1 rescue; schema: phase 2 | `PipTrack` from `treatment.value` |
| `weapon.ranges.value` | phase 2 (the converted item sheet already derives it) | `$derived` |
| `character.weight.current` / `.capacity` — computed only in the sheet today | phase 2 | computed in `prepareDerivedData`, not stored |
| `ship.megadamage.html`, `ship.megadamage.menu` | **phase 3**, with the SBT conversion | `$derived` list |

**b. Dead fields** (Part 3's audited dozen): `weapon.wound`, `ability.text`, `crew.text`,
`module.offline`, `class.source`/`author`/`link`, and the duplicate top-level
`character.stressdesc` (keep `other.stressdesc`, the used one) — one commit, both files, in
phase 0. The ship entries on that list — `images.beauty`, `supplies.hull.25/.50/.75`,
`megadamage.menu.html` — are equally dead but **wait for phase 3**, so that phases 1–2 touch no
ship schema at all and the SBT stopgap's e2e specs cannot be disturbed. Honour Part 3's caveat
throughout: anything reached by computed key (`stats[attribute].*`) is alive; the prune list is
only the audited set.

**c. The class adjustment ObjectFields**, tightened to exactly what the code reads (1.5):

```js
base_adjustment: SchemaField({
  strength: num(0), speed: num(0), intellect: num(0), combat: num(0),
  sanity: num(0), fear: num(0), body: num(0), max_wounds: num(0),
  skills_granted: ArrayField(StringField),          // skill UUIDs
}),
selected_adjustment: SchemaField({
  choose_stat: ArrayField(SchemaField({
    modification: num(0), stats: ArrayField(StringField),
  })),
  choose_skill_and: SchemaField({
    trained: num(0), expert: num(0), expert_full_set: num(0),
    master: num(0), master_full_set: num(0),
  }),
  choose_skill_or: ArrayField(ArrayField(SchemaField({
    name: str(''), trained: num(0), expert: num(0), expert_full_set: num(0),
    master: num(0), master_full_set: num(0), from_list: ArrayField(StringField),
  }))),
}),
```

`from_list_names`, `skills_granted_object` and `common_skills_object` become `$derived` in the
converted class sheet — the precondition, exactly as the model's own comment says. Two side
effects are features: `NumberField` coerces the string values the current dialog writes, and
the schema retires the legacy nested-array form of `skills_granted` that the generator itself
calls "legacy, we should never have this case" (a named migration, since a stored class could
hold it). This shape is the contract the class sheet renders, the generator reads, and the
phase-1 content build emits — it gets a generated type (Decision 4) so all three agree at
compile time.

**Do not redesign this shape to match `mothership-data`'s `classes.json`.** The book shape
(`adjustments: [{kind, target, value, choose}]`) is better in the abstract, but the runtime
shape is what the code reads today. Simplify-to-used cuts the other way: tighten what is used;
the content build is the adapter that maps book → runtime. Revisit only if the generator
rebuild finds the runtime shape actively fighting it.

### `template.json` and the oracle

`template.json` stays the oracle through all of the above — every deletion is a deliberate
two-file change, which is the oracle working as designed. Its retirement is Decision 4's
business: once a generated, committed type snapshot exists and its staleness check is
mutation-proven, it takes over the "schema changes must be deliberate" job and `template.json`
goes (v16 removes support regardless).

### Make Part 3's audit a standing test

One new vitest spec, using the same `field-stubs` walk: every declared leaf is either
referenced literally as `system.<path>` or matched by a maintained allowlist of dynamic-access
patterns (`stats[attribute].value/.mod/.label/.rollLabel`, …). `sheet-bindings.test.ts` already
proves every binding has a field; this proves every field has a reader. A new field with no
reader fails CI and must be used or allowlisted with a reason. Cheap, and it converts the
one-off measurement into a ratchet.

---

## Decision 3 — state ownership

**§10's convention extends unchanged to every document sheet** — all six remaining sheet
conversions. It is correct because a Foundry re-render *is* the change signal, including edits
from other clients; a snapshot refresh per render loses nothing and mirrors nothing. Keep it.

**The generator gets a second, explicitly named pattern: the draft store.** Not an exception to
§10 — §10 governs sheets *of* a document; the generator is a wizard whose product is one batch
write. Today the DOM is the truth (1.6). Target:

```
module/ui/generator/draft.svelte.js   class CharacterDraft — $state fields for rolled stats,
                                      health, credits; chosen class UUID; applied base/selected
                                      adjustments; chosen skill UUIDs; patch/trinket/loadout
                                      results; removePreviousItems flag
```

Rules for it: the Actor document is read once at open and written once at submit (the
`_updateObject` batch plus embedded-item creates become `draft.apply(actor)`); sub-dialogs are
DialogV2 promises that **resolve values into the draft and never touch the window's DOM**
(kills the `this._element` reach-back); every derived display (skill names, running totals) is
`$derived` from the draft; the step dice formulas come from `character-creation.json`'s typed
module rather than hardcoded strings. Re-render recovery becomes automatic because the draft
owns the state, and the dialogs become individually testable functions.

Assignment, complete: six document sheets → document store; `actor-generator` → draft store;
`class-sheet` → document store plus `$derived` resolution plus ordinary local `$state` for its
ephemeral creation-row form (ephemeral form state in a component is not mirroring — the
convention guards *document* data only).

---

## Decision 4 — TypeScript

Where types pay, in order of return:

1. **The content system (phase 1) — typed from day one.** New code under `scripts/`, which
   `npm run check` already covers. This is where the `selected_adjustment` class of bug — a
   renamed key silently skipping a generation path — actually gets caught, because the build
   emits the shape the generator reads.
2. **The class-adjustment contract type**, generated, imported by the content build and by
   JSDoc `@type` in `class-sheet` and the generator.
3. **Generated document types.** The runtime source of truth is `defineSchema()` — do not
   hand-write a parallel `.d.ts` that drifts, and do not introduce a third schema language.
   `test/field-stubs.ts` already walks the real schemas; a `scripts/generate-types.ts` built on
   it emits `types/system.d.ts` (leaf types per document type), committed, with a CI staleness
   check. New `module/ui/**` code and `module/data/` opt in via `// @ts-check` + JSDoc imports.
4. **`checkJs` flips per file as phase 5 planned** — models and `ui/` first, then the roll
   pipeline as `actor.js` is split. Unchanged from the existing plan.

**Direction of generation — the owner's question answered both ways, deliberately:**

- **Content: JSON Schema first.** `mothership-data/schema/*.schema.json` exists, validates the
  corpus, and serves the Python side. Generate TS types from it (`json-schema-to-typescript`)
  for the build script. Writing TS first and emitting JSON Schema would make this repo upstream
  of the data repo's validator — backwards. The rescued tier's source files get schemas in the
  same idiom, validated by the same step (Decision 6).
- **Runtime documents: `defineSchema()` first.** It is the live registered schema; anything
  else is a copy. Types are generated *from* it.

This also answers "TypeScript might be better than JSON": yes — as **generated output from the
two existing sources**, never as a third hand-maintained definition. When the generated
snapshot is trusted (staleness-checked, mutation-tested like the current oracle), it replaces
`template.json` as the deliberate-change ratchet. That is the end state of the equivalence
tests, not a day-one change.

Cost and risk: the generator script is about a day; the risk is the snapshot being *less*
strict than the current oracle (validators and coercions are not expressible in a `.d.ts`).
Mitigation: the snapshot carries the initial-value tree too (a JSON block beside the types),
preserving exactly what the oracle asserts today. Cheapest disproof: mutate a default and
confirm the staleness check fails before deleting `template.json`.

---

## Decision 5 — what is a document, and what is code

**The criterion.** A record ships as a Foundry document if and only if people interact with it
as a thing at the table: dragged onto a sheet, browsed and read as prose, linked from chat via
`@UUID`, or drawn from a RollTable. If the only consumer is code, it is a typed module the code
imports — no document, no ids, no migration surface.

The two cases the criterion was sharpened on:

- **The 151 triggered macros stay documents — but stop being authored.** They are load-bearing
  precisely as documents: 125 `@UUID` references from rolltables, 22 from condition items, more
  from `actor.js` chat strings and both lang files, and a `@UUID` link is the only way chat can
  offer a one-click "apply what the table just said" — **a content link cannot carry
  parameters, so the advantage variants are forced by the mechanism, not a modelling error.**
  The fix is generation: one typed table in the content source — `(stable id, name, API
  call)`, ids pinned to today's `_id`s — emits all 151 plus the 11 hotbar macros. Measured
  reality check: 105 of 151 are referenced by shipped content, and the wound tables genuinely
  reference `[+]`/`[-]` variants. Whether the 46 unreferenced ones ship is a product call —
  unreferenced is not unused, since browsing the pack and dragging to the hotbar is a use this
  measurement cannot see. Recommendation: keep them; generated, they cost one table row each.
- **The 50 conditions stay documents** — dragged onto actors, carrying per-instance
  `treatment.value` state, their descriptions linking triggered macros, their `_id`s referenced
  by the `initModifyItem` macros. The clearest possible documents. `treatment.html` is stripped
  by the rescue (Decision 2).

Dataset by dataset:

| Source | Verdict | Why |
|---|---|---|
| `skills.json` (42), `classes.json` (4) | **documents — new packs, phase 1** | the generator scans compendia for exactly these types (Part 4.1); skills are dragged, prerequisites are UUIDs. The headline: the generator becomes functional for the first time. |
| `weapons.json` (22), `armor.json` (5), `equipment.json` (44) | **documents — new packs, phase 1** | dragged onto sheets; loadout tables must resolve to them. |
| `trinkets.json`, `patches.json` (100 each) | **RollTables** with text results | the generator draws them; class items' `roll_tables` point at them. |
| `loadouts.json` (4×10) | **RollTables** whose results link the new equipment/weapon documents | same. |
| `panic.json`, `wounds.json` (5×10), `death.json` | **rebuild the existing rolltables** from PSG data, keeping their current `_id`s (settings defaults pin them) | already documents; now sourced. |
| `character-creation.json` | **typed module** consumed by the generator | replaces the hardcoded `"2d10+25"` formulas; nobody browses a creation step. |
| `contractors.json`, `pets.json`, `cover.json`, `radiation.json`, `medical-treatments.json`, `shore-leave.json`, `rules-index.json` | **do not ship now** | no runtime consumer; "what breaks if this is not there" — nothing. The pipeline makes adding any of them later one build-config entry. Shipping them as reference compendia anyway is a product option, listed for the owner, recommended against until a feature reads them. |
| existing `conditions` (50) | documents, **rescued** (Decision 6's straddle ruling) | above. |
| existing `maintenance` (100) | documents, **rescued in phase 3** — description moved out of `name`, killing `ship-sheet-sbt.js:142`'s `split('.')` hack | 2.3b. |
| existing `hotbar` (11), `triggered` (151) | documents, generated from the macro table | above. |
| existing `rolltables` (14) | documents — 10 rebuilt from PSG data or cleaned in phase 1; the 4 ship tables (Bankruptcy, Distress, Maintenance Issues, Megadamage) rescued in phase 3 | settings pin their ids. |

---

## Decision 6 — the content system: two tiers, one pipeline

### Shape

`mothership-data` stays the upstream for the derived tier and keeps its whole job: PDF →
validated JSON is done and not in question. This repo gains the **adapter**, and the rescued
tier lands in the same format so that after the rescue the tiers differ only in provenance:

```
content/
  data/            vendored copy of mothership-data/data/*.json (~148 KB), with a sync
                   script and a provenance note — a fresh clone must build without Python
  local/           the rescued tier, in the same record idiom: conditions.json,
                   maintenance.json, ship-tables.json, macros.json (the generation table),
                   hotbar.json — maintained as source from the rescue onward
  schema/          JSON Schemas for content/local/* , same idiom as mothership-data's
  ids.json         the id registry: stable content id → Foundry _id, per pack
scripts/
  build-content.ts content/* + ids.json → packs/_source/**  (then packs.sh as today)
  rescue.ts        one-shot, kept for audit: packs/_source → content/local, with the
                   enumerated-transform proof below
  sync-content.ts  refresh content/data from a mothership-data checkout; fails on drift
                   it cannot explain
```

**One typed source format, one validator, one pack generator.** The validator runs
`content/schema/` over `content/local/` and the vendored schemas over `content/data/`; the
generator does not know which tier a record came from. Provenance survives only in the build
manifest.

Vendoring rather than a submodule or sibling-path dependency: the build must be reproducible
from this repo alone, and 148 KB of reviewable JSON is cheaper than a cross-repo toolchain
dependency. (Least-certain choice in this section; a submodule is the fallback if double-commit
drift proves annoying.)

### The derived tier is wholesale generation, not a merge

The system ships no skills, classes, weapons, armour or equipment (2.1), and the companion
builder module ships none either (Part 4.1). There is nothing to reconcile against, so no
reconciliation machinery gets built. The build maps book records → runtime schema (the
Decision 2 class shape, the existing item schemas) and emits.

### The rescue is a one-way door — so it is a program, not an edit

The moment packs generate from `content/local/`, the current pack JSON stops being the source,
and anything not carried across is gone — there is no upstream to re-extract. So the rescue is
an explicit, reviewable transformation with a losslessness proof:

1. `rescue.ts` reads today's `packs/_source`, emits `content/local/*`, and `build-content.ts`
   regenerates `packs/_source` from it.
2. A field-level diff over all affected documents is asserted against an **enumerated
   transform list** — dropped `_stats` debris / `lastModifiedBy` / `folder` / `sort`, the 8
   maintenance `name` → `description` moves, the `treatment.html` strips, regenerated
   filenames. **Any difference not matching an enumerated rule fails the run.** `_id`, `name`
   (post-move), `system`, `img`, `command` and every `@UUID` are proved carried.
3. The before-tree is tagged in git; the diff report is committed alongside the rescue for
   review.
4. Thereafter the existing round-trip guarantee (§7) applies to the generated packs.

The rescue machinery is exercised **first on conditions in phase 1** (50 documents, needed by
the character tier) and reused on the ship content in phase 3 (200+ documents) — the risky
program gets its shakedown on the smaller, earlier set.

### The conditions straddle: rescue all 50 — and the cross-check does not survive measurement

> **Correction, measured 2026-08-12 during phase 0.** The ruling below rests on "15 of 50
> conditions match PSG content by name". Re-measured against the whole vendored corpus, **12**
> match as an exact quoted string — and **10 of those 12 are panic-table results**, not condition
> definitions (`Coward`, `Doomed`, `Deflated`, `Frightened`, `Haunted`, `Loss of Confidence`,
> `Nightmares`, `Spiraling`, `Suspicious`, `Death Wish`). The other two are `Bleeding` (a wound
> type and a weapon property) and `Cryosickness` (a rules-index entry).
>
> **There is no conditions dataset upstream at all.** So a build-time check that "warns when one of
> the 15 PSG-matching entries drifts from the extraction's text" would be comparing a condition's
> description against a *panic result's* description — different documents describing different
> things. **Do not build it.** The straddle is not a straddle: all 50 conditions are rescued tier,
> full stop, which makes the ruling below simpler rather than weaker.
>
> The genuine relationship the measurement did turn up is worth capturing instead: 8 panic results
> carry `grantsCondition: true` and name a shipped condition. That is a real cross-reference — a
> panic result should be able to apply the condition it names — and it is the seed for the
> advantage/disadvantage requirement above. Note `Loss of Confidence` (packs) vs `Loss Of
> Confidence` (upstream) differ in capitalisation, so the join must be case-insensitive.

### The original ruling: rescue all 50, cross-check the 15

Part 4.2: 15 of 50 conditions match PSG content by name; 35 have no source. Ruling: **rescue
all 50 into one maintained `content/local/conditions.json`**, and add a build-time cross-check
that warns when one of the 15 PSG-matching entries drifts from the extraction's text. Not the
alternative (regenerate 15, rescue 35 into the same file) because: the set is one coherent
product with one authorship model and cross-references into the macro pack; the PSG "match" is
by name, not by prose, so regeneration would change shipped text as a side effect of a
pipeline decision; and two update paths inside one file is exactly the two-pipeline outcome
the owner ruled out. The PSG extraction serves as reviewer, not author, for those 15.

### What an emitted document contains

The packer (`fvtt package pack` keys off `_id` in the body) needs `_id`, `_key`, `name`,
`type`, `img`, `system`, and for macros `command`/`scope`. Emit exactly that plus
`ownership: {default: 0}` and a minimal `_stats` — `systemId` and `systemVersion` stamped from
`system.json` at build time, nothing else. **Dropped: `lastModifiedBy`, `folder`, `sort`,
`exportSource`, timestamps** — the exported-world debris of 2.3 disappears as a side effect of
generating instead of exporting, as do the stale `Compendium_mosh_` filenames (regenerated
slugs; review-only, per the packer contract).

Provenance is retained **outside** the shipped packs: the build writes
`build/content-manifest.json` mapping every emitted `_id` to its source record — PSG page for
the derived tier, "rescued from pre-fork packs" for the other. That answers "where did this
value come from" without shipping a byte of metadata. Whether descriptions also carry a
human-visible `Source: PSG p.22` footer is a one-line product call; default off.

### Id stability — the hard requirement

Existing worlds, rolltable `documentUuid`s, settings defaults, `actor.js` strings, condition
descriptions and lang files all reference today's `_id`s. Rules:

1. `content/ids.json` is **seeded once from the current `packs/_source`** — every existing
   document keeps its `_id` forever.
2. New records get an id allocated on first build **only** under an explicit `--allocate`
   flag, and the updated registry is committed. An unregistered record without the flag fails
   the build. Ids are never derived from names or content — a rename must never move an id.
3. Retiring a document removes it from the registry with a recorded reason; the integrity
   tests make silent disappearance impossible.

### How it is tested

- **Determinism** — build twice, byte-identical `packs/_source`.
- **Id preservation** — every `_id` in the pre-pipeline packs is emitted or explicitly retired.
- **The rescue proof** — the enumerated-transform diff above, run as a test while the rescue
  lands.
- **Referential integrity** — every `@UUID` in emitted content resolves to an emitted
  document; every settings rolltable default resolves (extends the existing e2e invariant);
  every class `roll_tables` entry and skill prerequisite resolves, prerequisites pointing
  down-tier (mirroring `mothership-data`'s own invariant, now against Foundry UUIDs).
- **Count pinning** — the existing e2e compendium spec extends to the new packs.
- **The capstone**: an e2e spec that generates a character from a class end to end — pick
  Marine, accept the skill dialogs, submit, assert stats, skills and loadout on the actor. It
  exercises the pipeline, the packs, the class schema and the generator in one spec, and it is
  the integration test the system has never had. Written first against the *current* generator
  (characterisation), then required of the rebuilt one.

---

## Decision 7 — the revised execution plan

Keep `run-to-the-end.md`'s machinery whole — the ten standing rules, the gate, worktrees,
assignment by hazard. Two rules join it: **11.** a content build must pass determinism + id
preservation + referential integrity (+ the rescue proof, when rescuing) before landing;
**12.** every schema deletion rides the wave that removes its last reader, changes
`template.json` in lockstep, and is named a migration in the record.

**The order is the owner's: build correctly from the PSG content; character mechanics and
sheets against that clean data; then ships conform.** This inverts `run-to-the-end.md`'s
easiest-first sequencing, and the trade is worth stating rather than smoothing over: the four
hardest units (`class-sheet`, `actor-generator`, `actor-sheet`, `creature-sheet`) now run
*before* the mechanical ship units instead of after them. That is acceptable — the conventions
easiest-first existed to settle are settled (nine conversions, the parts layer, §10, §20, §21)
— but phase 2 deliberately opens with its one low-risk unit (the primitives/sections batch) so
the hard sheets do not start cold, and the falsifier for `ItemPanel` fires before anything
depends on it. I would not go further than that; re-litigating the order buys nothing.

One property to hold explicitly: **phases 1–2 touch no ship schema and no ship sheet code.**
`ship-sheet-sbt` carries its §22 debt — the write-during-render, the persisted
`megadamage.html`, the `String()` stopgap — until phase 3, and
`test/e2e/ship-megadamage.spec.ts` (4 specs) must stay green untouched through phases 1–2.
Phase 1's macro/rolltable generation pins the ship documents' ids and content unchanged, so
nothing content-side disturbs them either.

```
Phase 0 — preludes (days)
  P0.1  dead templates (run-to-the-end Wave 0, unchanged)              orchestrator
  P0.2  dead-field prune, character/item scope only (Part 3 dozen minus
        the ship entries) + the standing usage test                    Sonnet
  P0.3  creature-settings window (old Wave 1; mechanical, §12 resolved) Sonnet

Phase 1 — the content system: ship the missing content                ← the feature
  C1  pipeline scaffold: vendored data, ids.json seeded from packs/_source,
      build-content.ts, validators, determinism/id/integrity tests     Opus (the id
      registry and the transform design are the design-bearing parts)
  C2  rescue machinery + conditions rescue (50 docs; treatment.html
      stripped from content; enumerated-diff proof; PSG cross-check)   Opus design,
                                                                       Sonnet sweep
  C3  macro generation table (162 rows, ids pinned); derived packs:
      skills, classes, weapons, armor, equipment, trinket/patch/loadout
      tables; panic/wounds/death rebuilt on pinned ids                 Sonnet, against C1's tests
  C4  wire-up: system.json packs, e2e counts, settings resolve;
      milestone: the content is browsable in a real Foundry            orchestrator

Phase 2 — the character core, against clean data
  C5  primitives batch 2 + sections (MinMaxField, RollableStat, PipTrack,
      ItemPanel, HealthBlock) + contract specs; ItemPanel falsifier    Opus (sets the
                                                                       section pattern)
  C6  class-sheet: commit 1 derive, commit 2 tighten the schema +
      template.json + generated contract type                          Opus
  C7  actor-generator on the draft store; formulas from
      character-creation.json; capstone e2e (characterisation first)   Opus  (needs C3+C6)
  C8  creature-sheet                                                   Opus
  C9  actor-sheet — last, per the settled reasoning; deletes xp.html,
      treatment.html, ranges.value, weight with template.json          Opus

Phase 3 — ships conform to the established pattern
  C10 ship content rescue: maintenance (name→description move), the 4
      ship rolltables, ship macro rows reviewed — same machinery as C2 Sonnet, rule 11
  C11 ship schema cleanup: megadamage.html/.menu deleted, images.beauty,
      supplies.hull.25/50/75 pruned, with template.json                with C12
  C12 ship-sheet-sbt: pays §22 in full — no write during render,
      $derived megadamage, String() stopgap gone; the megadamage e2e
      specs rewritten against outcomes, deckplan converted or folded in Opus
  C13 plain ship-sheet: convert (Sonnet) or delete — owner's call from
      Decision 1; recommendation: delete

After phase 3 (both trailing, ungated)
  C14 CSS dissolution, component-by-component, screenshot-verified
  C15 TypeScript: generated document types; oracle handover from
      template.json once mutation-proven; checkJs per file; actor.js
      split into tested modules (its own plan, as before)
```

Parallelism: phase 1 is internally parallel after C1 (C2 ‖ C3); phase 0 runs beside C1. Within
phase 2, C8 can run beside C7 (different files; both after C5/C6). The only cross-phase
dependency is C7 on C3. `system.json` and `lang/` stay orchestrator-merge-only (extends rule
9).

Product calls for the owner, none blocking phase 1 start except the first: the source footer
(C1 emits it or not); the seven no-consumer datasets (later, unless wanted as reference packs);
the 46 unreferenced macros (keep, recommended); the plain ship sheet (C13).

---

## Risk register

| Risk | Mitigation |
|---|---|
| The rescue loses content it can never recover (one-way door) | The enumerated-transform proof: any field-level diff not matching a listed rule fails; before-tree tagged; diff report committed; machinery shaken down on 50 conditions before the 200+ ship documents. |
| Id churn breaks existing worlds / rolltable links / macro `initModifyItem` targets | Registry seeded from current packs; ids never derived from content; id-preservation test; retirement is explicit and recorded. |
| A "dead" field is reached by computed key and gets pruned | Prune only Part 3's audited list; the standing usage test carries the dynamic-access allowlist so every later prune is grounded the same way. |
| "Improve as you go" bleeds into the rules mechanics | The Decision 2 boundary: if a unit spec must change for an edit to pass, the edit is out of bounds for a conversion wave. Roll pipeline and derivation arithmetic are spec-pinned and untouchable in phases 1–2. |
| The generator rebuild loses behaviour that has no spec | Characterisation first: the capstone e2e is written against the current generator, then required of the rebuilt one. |
| SBT's stopgap breaks while phases 1–2 run | Phases 1–2 touch no ship schema or sheet code by construction; `ship-megadamage.spec.ts` stays in the gate's e2e run throughout. |
| Class-schema tightening mangles stored class items | No classes shipped before phase 1, so only hand-made items predate it; NumberField coerces the string writes; the legacy nested `skills_granted` form is a named migration; round-trip specs before and after (rule 4). |
| `ItemPanel` turns out to be a false sharing | C5 falsifies it (build for actor's blocks, apply to creature, count divergence props) before C8/C9 depend on it. |
| Vendored data drifts from `mothership-data` | `sync-content.ts` diffs on demand; CI never depends on the sibling repo. |
| TKG third-party policy — the shipped transcription grows from ~0 to skills, classes, weapons, gear text | §19's framing covers transcribed content and the inherited packs alike; the *volume* change is flagged to the owner before C3 lands. |
| Generated types weaker than the template.json oracle | The snapshot carries the defaults tree; handover only after mutation-testing the staleness check; both exist until then. |

---

## Where I am least sure, and what would settle it

1. **The conditions straddle ruling** — rescue all 50 with a PSG cross-check, versus
   regenerating the 15 so PSG-sourced text is authoritative. I chose one authorship model per
   file; the cost is that the 15 stay hand-maintained where an extraction exists. Settled by:
   running the cross-check once — if the 15 already match the extraction closely, switching
   them to derived later is a mechanical, id-preserving change and the ruling can be revisited
   cheaply.
2. **Retiring `template.json` in favour of a generated snapshot.** The generation is easy; the
   question is whether the snapshot ratchets as hard as the hand-locked oracle. Settled by:
   building the generator and mutation-testing the staleness check — a default change, a
   dropped nested key, a type change must each fail CI. If any survives, keep `template.json`.
3. **Keeping all 151 generated macros vs culling the 46 unreferenced.** Reference-counting
   cannot see hotbar use, so the data cannot decide it. Product judgment; the cost of keeping
   is near zero once generated, which is why I recommend keep, weakly.
4. **Vendoring `content/data` vs a submodule.** Vendoring wins on clone-and-build simplicity;
   it loses if the corpus changes often. Settled by: how often `sync-content.ts` actually runs
   over the next month.

No measurement is outstanding — Parts 3 and 4 closed the gaps this plan leans on. The
dynamic-access allowlist must exist (P0.2) before any prune beyond the audited dozen.


---

## Decisions taken by the owner, 2026-08-12

These settle the product calls the plan left open. A new session should treat them as given.

| Question | Decision |
|---|---|
| The plain (non-default) ship sheet — C13 | **Deprecate now, delete later.** Not converted, not removed: marked deprecated so it stops accruing work, with removal a separate later call. |
| The 46 unreferenced triggered macros | **Keep, for now.** As the plan recommended — reference counting cannot see hotbar use, so nothing proves them dead. |
| Backward compatibility | **Not a constraint.** Schemas may change freely; breaking existing worlds is acceptable, consistent with §18. |
| Stable document ids | **Valuable, and kept.** See below — the reason is not backward compatibility. |

### Decided 2026-08-12, after the phase-0 measurements

| Question | Decision |
|---|---|
| How the 50 conditions get their advantage/disadvantage modifier, given only 3 have upstream data | **Seed the 3, leave 47 neutral.** C2 adds `modifiers` to the condition schema and fills in `Frightened`, `Nightmares` and `Spiraling` (all `disadvantage`) from the panic results that grant them. The other 47 ship `[]`. No rule is invented from `severity`, and no content is authored on a guess — the 47 are authored later, against a feature that already works end to end. |

### Why stable ids still matter with backward compatibility abandoned

Not for old worlds. For the content's **own internal integrity**: the shipped packs contain
**269 `@UUID` cross-references** — 169 to macros, 100 to maintenance items — from rolltable
results and item descriptions. Panic and wound results link to the stress/calm macros; maintenance
items link to their effect macros.

Regenerate with fresh ids and all 269 break, requiring a rewrite pass over content in the same
build that produced it. Seeding the id registry from `packs/_source` keeps them valid for free.
So Decision 6's id registry stays exactly as planned; only its *justification* changes.

### New requirement — weapons usable from the character sheet

> "weapons that have been added to a character sheet can be clicked on to use and will use the
> character's current stats and conditions"

Measured against what exists:

- **Already true:** clicking a weapon fires `.weapon-roll` → `actor.rollCheck(null,'low','combat',null,null,item)`, which resolves against the character's live Combat stat (`actor-sheet.js`). Damage has its own `.dmg-roll`.
- **Not true:** **conditions do not affect any roll.** The only condition the code reads is
  `Bleeding`, and only to accumulate a derived `bleeding` value (`actor.js:52-54, 92-94`).
  Conditions are otherwise descriptive items with a `severity` and prose.

So the requirement is one new mechanic, not a rewrite: **conditions must contribute
advantage/disadvantage to the rolls a character makes.**

It is well-founded in the data, which is why it belongs after phase 1 rather than before:

- `mothership-data` already models effects mechanically — **125 `modifiers` fields with the
  vocabulary `{disadvantage: 22, advantage: 13}`**, plus `grantsCondition` (8 true).
- That vocabulary is exactly what the roll pipeline already speaks: `parseRollString` translates
  `[+]` / `[-]` into keep-highest / keep-lowest formulas, and it is unit-tested.

> **Correction, measured 2026-08-12 during phase 0.** The "125" above conflates two counts. 125
> records carry a `modifiers` **key**; only **35** carry a non-empty value — and the
> `{disadvantage: 22, advantage: 13}` vocabulary is the breakdown of those 35, not of 125. They sit
> in `weapons.json` (14), `wounds.json` (11), `panic.json` (7), `armor.json` (2) and
> `shore-leave.json` (1).
>
> **None of them is on a condition, because there is no conditions dataset upstream.** The only
> condition-linked modifiers reachable from the corpus are indirect: 8 panic results carry
> `grantsCondition: true` and name a condition this system already ships — Coward, Frightened,
> Nightmares, Loss Of Confidence, Deflated, Doomed, Haunted, Spiraling — and of those, exactly
> **three** also carry a modifier (`Frightened`, `Nightmares`, `Spiraling`, all `disadvantage`).
>
> So the feature cannot be delivered by generation. **The condition → modifier mapping is new
> authored data on the rescued conditions**, seeded by those three and otherwise decided by us (or
> derived from the existing `severity` field, which is a design question, not a data one). The
> requirement stands and the roll pipeline still speaks the vocabulary; the estimate does not — it
> is an authoring job on 50 documents, not a wiring job over an existing corpus. Worth the owner
> knowing before C2 fixes the condition schema, since that is the moment the field has to exist.

**Consequence for the content filter:** `modifiers` and `grantsCondition` are *gameplay* data and
must survive the "cut metadata, keep gameplay" rule. A naive strip to name + description would
delete the very fields this feature runs on.

**Where it lands:** phase 2, with `actor-sheet` (C9) or as its own small unit straight after —
it needs C3's content shipped and the condition schema settled. It also changes the roll pipeline's
*inputs* but not its arithmetic, so it stays inside Decision 2's change boundary. Add e2e cover:
a character with a disadvantage-granting condition rolls `[-]`, and the same character without it
does not.
