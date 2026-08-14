# Evidence pack for the architecture review

Measured 2026-08-12 against the tree at `d279206`, by three census passes over the unconverted
sheets plus a direct inspection of the content pipeline. **Counts are live counts** — HTML
comments stripped first, because a previous pass inflated its numbers by counting commented-out
markup.

This file is input to a design, not a design.

---

## Part 1 — the UI

### 1.1 Two pairs of sheets are substantially the same sheet twice

**`actor-sheet.js` (658) vs `creature-sheet.js` (660).** 24 of 25 `activateListeners` bindings are
identical. The four item-list blocks (armor / items / skills+xp+conditions / weapons) are
**byte-identical** apart from indentation, including the duplicated `hideWeight` branch. The
`.minmaxwrapper` health blocks and the armour AP/DR block are byte-identical. Genuine divergence:
the header stat panel (character has circle dials and saves; creature has optional per-monster
stats behind `{{#if system.stats.X.enabled}}`), creature's swarm damage rescaling, actor's
calm/stress panic split, creature's `abilities` item type.

**`ship-sheet-sbt.js` (475) vs `ship-sheet.js` (274)** — "one sheet forked twice". The item CRUD
plumbing, tab scaffolding and list rendering are the same; the stat panels and item taxonomies
genuinely differ (SBT: crew, repairs, megadamage, sidebar drawer, deckplan/setup popouts; plain:
abilities, ammo/reload UI, a different stat set and header fields SBT has no UI for at all).

### 1.2 Primitives that exist and generalise

`ItemList` / `ItemRow` / `ItemImage` / `ItemCell` / `ItemControls` / `ItemControl`, `Tabs` /
`TabPanel`, `CircleStat` / `CircleStats`, `Editor`, `CheckField` — full coverage of the list, tab,
dial and editor shapes across all six remaining sheets. That is the main evidence they were the
right primitives.

### 1.3 Primitives that are missing, by measured recurrence

| Shape | Combined live uses | Note |
|---|---|---|
| `.minmaxwrapper` — paired current/max input | ~17 (8 actor+creature, 9 ship) | No primitive. `MinMaxField` alongside `Field`/`CheckField`. |
| Rollable stat label — `.rollable[data-key][data-roll][data-label]` | ~18 (actor+creature) | No primitive. Would replace the `data-*` convention with props. |
| Pip track — `.char-pip-button` / treatment pips | 4 (xp ×2, treatment ×2) | **Built as HTML strings in JS.** See 1.4. |
| Stat-panel wrapper — `circle-statwrapper` / `mainstatwrapper` with title + dials + action | 11+ (ships) | Hand-rolled with inline `style=` at every call site. |
| `.list-roll` click-to-roll cell | 20+13 | Distinct from `.rollable`; decide whether it folds into `ItemCell`. |
| Inline multi-field creation row (class sheet) | 1, but read by **DOM index** | `class-sheet.js:204-251` reads six fields positionally. Nothing composes this. |
| Nested list-of-lists with a group header | 1 (class sheet skill groups) | `ItemList` is single-level. |

### 1.4 Presentation persisted into the data model — systemic, not local

Fields that exist **only** to hold rendered HTML, because a Handlebars template cannot compute:

| Field | Where written | Rendered by |
|---|---|---|
| `system.megadamage.html` | `ship-sheet-sbt.js:196`, **inside `getData()`** — a document write during render | `{{{system.megadamage.html}}}` |
| `system.megadamage.menu.html` | nothing (dead) | dead markup only — **zero live references** |
| `system.xp.html` | `actor-sheet.js:54-81`, `creature-sheet.js:91-118` | `{{{system.xp.html}}}` |
| `system.treatment.html` (condition items) | `actor-sheet.js:137-147`, `creature-sheet.js:177-187` | `{{{condition.system.treatment.html}}}` |

`treatment.html` is also **persisted in 50 shipped compendium items** (see 2.3).

Only `_prepareMegadamage` actually writes to the document during render. The actor/creature
equivalents mutate a render-local `toObject()` copy — safe **incidentally**, not structurally. A
Svelte port that hands the live document to a render-time helper turns them into real writes.

### 1.5 Free-form schema as a workaround for a rendering hack

`base_adjustment` and `selected_adjustment` are bare `ObjectField`s in `item-models.js:135-151`,
and the code comment says why: `class-sheet.js` writes `skills_granted_object`, `from_list_names`
and `common_skills_object` onto them during `getData()`, and a real `SchemaField` would strip them.

Nothing outside `class-sheet.js` and its own template reads those three fields. They are pure
render state that forced a schema hole.

The cost lands elsewhere: **`actor-generator.js` reads `selected_adjustment`'s exact shape**
(`choose_skill_and.{trained,expert,master,expert_full_set,master_full_set}`,
`choose_skill_or[i][j].from_list`, `choose_stat`) positionally, with no schema and no guards.
Renaming a key silently breaks character generation — it reads `undefined` and skips the path.

### 1.6 `actor-generator.js` has no state pattern in this codebase

772 lines, and between opening and submitting **the document is not the source of truth — the DOM
is**. Interim state lives in form input values written via `.prop("value", …)`, plus instance
fields (`skillsUuid`, `patchTable`, `trinketTable`, `loadoutTable`) with no re-render recovery.
Its four sub-dialogs return by resolving a Promise *and* reaching back into `this._element`.

`getData()` also mutates `this.object.system.class` in place to seed the template.

This is the one file the settled convention (document as source of truth, store refresh per
render) does not cover. It needs an explicit session/draft state distinct from any document.

### 1.7 Reachability drift already exists

`.weapon-ammo` and `.weapon-reload` are bound in `ship-sheet-sbt.js` with **zero live occurrences**
in its template — the markup was dropped when SBT was forked. The `.megadamage-sidebar-button`
handler is entirely commented out. Two windows converted last week were unreachable, one
duplicated live UI and was deleted.

Dead bindings are currently found only by grep. Nothing fails.

### 1.8 What is already healthy

All `name="system.*"` bindings in all four remaining actor/ship templates resolve against their
DataModels — `test/sheet-bindings.test.ts` passes 13/13 and is the gate. All actor/creature
listener bindings are reachable. `game.settings.get` reads (`useCalm`, `hideWeight`,
`androidPanic`) are duplicated verbatim across four sheets — a shared read, not a hazard.

`weight.capacity` / `weight.current` are computed **only in the sheet**, not in
`prepareDerivedData`. If sheets are to be pure views, that computation moves into the DataModel.

---

## Part 2 — the content pipeline

### 2.1 The system ships almost no content

| Declared pack | Type | Sources |
|---|---|---|
| `conditions_1e` | Item | 50 |
| `items_maintenance_1e` | Item | 100 |
| `macros_hotbar_1e` | Macro | 11 |
| `macros_triggered_1e` | Macro | 151 |
| `rolltables_1e` | RollTable | 14 |

There is **no skills, classes, weapons, armour or equipment compendium**. A player installing this
system hand-creates every skill and class item.

### 2.2 …and the character generator depends on content that does not exist

`actor-generator.js:557-583` scans **every** compendium for `type: "skill"` and `type: "class"`
documents. The system ships neither. The 772-line generator has nothing to work with out of the
box.

### 2.3 The unpacked sources carry the original authors' metadata

All **326** pack source files:

| Field | Value | Should be |
|---|---|---|
| `_stats.systemId` | `"mosh"` (326/326) | `mothershiprpg` — the §18 rename never reached content |
| `_stats.systemVersion` | `"0.4.0"` (326/326) | current is `0.0.0` |
| `_stats.coreVersion` | `"13.348"` (326/326) | running v14 |

Plus `_key`, `ownership`, `lastModifiedBy` (a stranger's user id), `folder`, `sort` on every
document. And 50 condition items persist `system.treatment.html` — **rendered presentation shipped
as content**, the same disease as 1.4.

### 2.3b The content itself is misshapen, not just its metadata

**`triggered/` — 151 macros over 116 distinct base names.** Where a check has advantage and
disadvantage variants, the bodies differ by one token:

```
Body_Save          game.mothershiprpg.initRollCheck('1d100','low','body',null,null,null);
Body_Save_plus     game.mothershiprpg.initRollCheck('1d100 [+]','low','body',null,null,null);
Body_Save_minus    game.mothershiprpg.initRollCheck('1d100 [-]','low','body',null,null,null);
```

Advantage and disadvantage are **parameters**, not content, and they have been multiplied into the
compendium — but the multiplication is smaller than it looks.

> **Corrected 2026-08-12, during phase 0.** An earlier version of this section read "151 macros
> that are 50 checks times three", with "every body a single line". Re-measured against
> `packs/_source/triggered`:
>
> | | |
> |---|---|
> | distinct base names | **116** (not 50) |
> | bases with 3 variants (base / `+` / `-`) | **16** → 48 documents |
> | bases with 2 variants | **3** → 6 documents |
> | bases with 1 variant | **97** |
> | single-line bodies | **130**; the other **21** are multi-line |
>
> So only about a third of the pack is variant multiplication. The remaining 97 — `Lower Minimum
> Stress to 2`, `Take Bleeding Damage`, `Roll on Panic Table` and the like — are genuinely distinct
> parameterised calls, and the 21 multi-line bodies wrap a `prep…()` function that resolves the
> target actor. **A generation table is still right, and still collapses 151 documents into 116
> rows plus a variants flag — but it is not a 50-row table and C3 should not be sized as one.**
>
> Name suffixes are also inconsistent in the data: most triples use ` +` / ` -`, four use
> ` [+]` / ` [-]`. The generator has to preserve each document's existing name exactly, because
> ids are pinned to it and the names are what a GM browses.

The whole pack calls six public API entry points and nothing else: `initRollCheck`,
`initRollTable`, `initModifyActor`, `initModifyItem`, `noCharSelected`, `noShipSelected`.

**`maintenance/` — the name field holds a description.** 8 of 100 repair items carry HTML and an
embedded `@UUID` link inside `name`:

```
name:        "Weak Frame. -1 Hull, -1 Upgrade.<br><br>@UUID[Compendium.…]{…}"
description: "<p>Maintenance Issue</p>"
```

The item has a perfectly good `system.description`, which holds the placeholder string
`"<p>Maintenance Issue</p>"` for all 100. The real content is in the wrong field.

The consequence is in the code: **`ship-sheet-sbt.js:142` does `i.name = i.name.split('.')[0]`** —
truncating every repair item's name at the first period, at render time, to recover something
displayable. A data defect became a rendering hack.

Filenames are derived from those names, so they are unbounded in length and still contain
`Compendium_mosh_…` — the §18 rename reached the document contents but not the filenames, so the
two now disagree.

### 2.4 There is a clean, validated, sourced dataset next door

`runegoblin/modules/mothership-data` — a Python pipeline: PDF → `extract.py` → `normalize.py` →
JSON-Schema validation (`schema/*.schema.json`) → `pytest`. 19 files, ~148 KB, in `data/`:

```
skills classes weapons armor equipment loadouts trinkets patches contractors
pets panic wounds radiation death cover shore-leave medical-treatments
character-creation rules-index
```

Every record is typed and attributed. A skill:

```json
{ "id": "archaeology", "name": "Archaeology", "tier": "trained", "bonus": 10,
  "description": "Ancient cultures and artifacts.", "prerequisites": [],
  "source": { "book": "Player's Survival Guide", "system": "mothership-1e",
              "version": "1.2", "page": 22, "section": "22.2" } }
```

This is exactly the content the system lacks (2.1) and the generator needs (2.2), in a better
shape than what it currently ships (2.3). The licence position is already established: this is
transcribed from the published book, so no third-party code licence reaches it,
and it answers to Tuesday Knight Games' third-party policy like everything else here.

### 2.5 Nothing in the runtime is type-checked

`tsconfig.json` sets `checkJs: false`. All of `module/**/*.js` — ~9,000 lines including every
DataModel, the roll pipeline and the generator — is unchecked. The `selected_adjustment` coupling
in 1.5 is precisely the class of bug types would catch at build time.

---

## The two threads are one problem

`xp.html`, `treatment.html`, `megadamage.html` and the free-form `ObjectField`s are all **schema
holes cut to accommodate Handlebars**. They cannot be closed until the UI stops needing them, and
they should not survive a runes rewrite that derives instead of persisting.

So the data model does not get cleaned up *before* or *beside* the UI work. It gets cleaned up
**as a consequence of it** — which means the target schema and the target component architecture
have to be designed together, or the second will re-enshrine the first.


---

## Part 3 — what the runtime actually uses

Measured by enumerating every leaf the DataModels declare (via `test/field-stubs.ts`, the same
helper the equivalence tests use) and checking each against all of `module/` and `templates/`.

**334 declared leaves. 202 referenced by literal `system.<path>`.** Of the remaining 132, the
overwhelming majority are per-stat scaffolding — `min`, `max`, `label`, `rollLabel` on every
character, creature and ship stat — reached through computed keys (`actor.js:1247,1256,1371,1373,
1428` use `stats[attribute].rollLabel/.value/.mod/.label`). Those are used, not dead. The same
applies to the four ship `stats.*.mod` leaves.

After excluding dynamic access, these declared fields have **no reference anywhere**:

| Type | Field | Note |
|---|---|---|
| `weapon` | `system.wound` | distinct from `woundEffect`, which is used |
| `ability` | `system.text` | |
| `crew` | `system.text` | |
| `module` | `system.offline` | |
| `class` | `system.source`, `system.author`, `system.link` | metadata, never read |
| `ship` | `system.images.beauty` | |
| `ship` | `system.megadamage.menu.html` | already known dead (1.4) |
| `ship` | `system.supplies.hull.25` / `.50` / `.75` | the sheet computes `hull.percentage` at render instead |

**`stressdesc` is declared twice.** `character` has it at the top level *and* inside `other`
(`actor-models.js:58` and `:75`; `template.json:57` and `:151`). Only `system.other.stressdesc.value`
is used — by `actor-sheet.html:161` and `actor-generator.js:717`. The top-level copy is dead in
both the model and the oracle.

That is roughly a dozen fields to drop, in the DataModel **and** `template.json` together. Small in
itself; the point is that the method — enumerate declared leaves, check each against real usage —
is cheap, repeatable, and should be a test rather than a one-off.

### The owner's direction on content

The Player's Survival Guide is the source of record and stays so. What gets cut is **metadata, not
gameplay data**: `source.book` / `version` / `page` / `section` in `mothership-data` carry
provenance useful to the extraction pipeline and useless at runtime. Gameplay fields — tiers,
bonuses, prerequisites, damage, costs, descriptions — are what the system needs and what should
survive the merge.


---

## Part 4 — coverage: what the PSG dataset supplies, and what has no source

### 4.1 The character generator has had no data source since the fork

`actor-generator.js:555-583` builds its skill and class lists by scanning `game.items` **and every
compendium** for `type: "skill"` and `type: "class"`.

- This system ships neither (2.1).
- The companion `mothership-character-builder` module ships three packs — `character-generator-journal`
  (JournalEntry), `-macros` (Macro), `-tables` (RollTable) — and **no skill or class documents
  anywhere**. Grepped: zero files declaring either type.

So the 772-line character generator has always depended on content the GM hand-creates, or that
lived in the original author's own world. It is UI with no shipped data. `mothership-data` supplies
exactly the missing half: 42 skills with tier/bonus/prerequisites, plus classes.

### 4.2 Two content tiers, by whether a source exists

| Tier | Datasets | Path |
|---|---|---|
| **Derived** — a complete, validated, tested source exists | skills, classes, weapons, armor, equipment, loadouts, trinkets, patches, contractors, pets, panic, wounds, radiation, death, cover, shore-leave, medical-treatments, character-creation | extraction → typed source → generated packs. The system currently ships essentially none of this. |
| **Rescued** — no rulebook available; the inherited packs are the only copy | all ship content (the 100-item `maintenance` pack, the Bankruptcy / Distress / Maintenance Issues / Megadamage rolltables, the ship macros in `triggered/`); **~35 of the 50 `conditions` items** | clean the inherited documents once, normalise into the same typed source, maintain as source thereafter |

Condition coverage measured by name against the whole PSG dataset: **15 of 50 match**. The
remainder — `Phobia`, `Suffocating`, `Bit Rot`, `Social Anxiety`, `Hypervigilance`, `Software Bloat`
and others, several of them android-specific — are not PSG content and share the ships' situation.

### 4.3 Why this matters for sequencing

The derived tier is not a *merge*. There is nothing on the system side to reconcile against — it
ships no skills, classes, weapons, armour or equipment at all. The extraction can be generated
wholesale, which is far simpler than merging two partial sets.

The rescued tier is the opposite: it is the only copy, so its cleanup is a one-way door and must be
an explicit, tested, reviewable transformation rather than a hand edit.

Both tiers should land in **one typed source format, one validator, one pack generator**. After the
rescue the distinction stops being visible in the codebase — it survives only as provenance.


---

## Part 5 — what a "condition" is, and why there are 50 of them

Measured 2026-08-12, prompted by the owner's observation that a condition is an **ongoing effect**
and that panic effects and conditions are the same kind of thing. Both are right, and the pack is
organised on exactly that principle — but the count needs the whole chain to explain.

### The chain is table → macro → condition

No rolltable references a condition directly. A panic result's description links a triggered macro
via `@UUID`, and that macro carries the condition's `_id` and applies it with `initModifyItem`.
**46 of the 151 triggered macros exist to apply a condition.** So the conditions pack is the set of
ongoing effects the four panic tables can inflict, plus the ones a Warden applies by hand.

### The four panic tables, and what each can inflict

The system ships **four** panic tables, selected by the `useCalm` and `androidPanic` settings:

| Table | Results | Distinct conditions it applies |
|---|---|---|
| Panic Check (Stress, Normal) | 20 | **10** — Coward, Death Wish, Deflated, Doomed, Frightened, Haunted, Loss of Confidence, Nightmares, Spiraling, Suspicious |
| Panic Check (Calm, Normal) | 28 | 16 — Anhedonia, Broken, Coward, Emotional Detachment, Escapism, Hallucinations, Hypervigilance, Insane, Losing Your Grip, Panicky, Phobia, Psychotic Episodes, Recurring Nightmares, Severe Anxiety, Social Anxiety, The Shakes |
| Panic Check (Stress, Android) | 20 | 6 — Ethical Directive Misread, Killswitch Engaged, Phobia, Turing Test Failure, Vocalization Failure, Worship Danger |
| Panic Check (Calm, Android) | 28 | 12 — the logic-core and directive faults: Bit Rot, Deviant Logic Core, Ethical Directive Failure/Misread, Faulty Heuristics, Fried Logic Core, Killswitch Engaged, Rampancy, Software Bloat, Threat Assessment Failure, Turing Test Failure, Vocalization Failure |

Union of the four, allowing for the overlaps (`Coward`, `Phobia`, `Killswitch Engaged`,
`Turing Test Failure`, `Vocalization Failure`, `Ethical Directive Misread` each appear in two):
**40 conditions**.

### The other 10 are environmental, and have no table at all

`Corrosive Atmosphere`, `Cryosickness`, `Exhausted`, `Extreme Cold`, `Extreme Heat`, `Irradiated`,
`Starving`, `Suffocating`, `The Bends`, `Toxic Atmosphere`. Nothing references them — no table, no
macro, no code. They are ongoing effects a Warden applies directly, which is a use no reference
count can see. 40 + 10 = **50**.

**So the pack is not inflated.** "There should be 20" is the row count of the Stress/Normal panic
table, which yields exactly 10 of the 50. The remaining 40 come from the other three tables and
from the environment.

### The consequence for C3, which is larger than the plan assumed

`mothership-data/panic.json` is **one** table — `{id, name, die, rule, results, source}` with 20
results — and it corresponds to Panic Check (Stress, Normal). There is **no Calm variant and no
Android variant upstream**, because Calm/Stress and android panic are this system's own settings
(`useCalm`, `androidPanic`), not PSG 1e core.

So C3 cannot "rebuild panic on pinned ids" from PSG data as written. Of 96 panic result rows, **20
are derivable and 76 are rescued tier** — the only copy is the inherited pack. The same caution
applies to any table the plan assumes is derivable: check it row-for-row against the corpus first.

One small disagreement worth recording: upstream flags **8** panic results `grantsCondition: true`,
while the system's Stress/Normal table applies **10** — it also treats `Death Wish` and
`Suspicious` as ongoing conditions. The system's reading is the one shipped content depends on.
