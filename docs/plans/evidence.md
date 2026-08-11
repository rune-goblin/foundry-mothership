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

**`triggered/` — 151 macros that are 50 checks times three.** The naming is `X`, `X_plus`,
`X_minus`, and the bodies differ by one token:

```
Body_Save          game.mothershiprpg.initRollCheck('1d100','low','body',null,null,null);
Body_Save_plus     game.mothershiprpg.initRollCheck('1d100 [+]','low','body',null,null,null);
Body_Save_minus    game.mothershiprpg.initRollCheck('1d100 [-]','low','body',null,null,null);
```

151 documents, 148 distinct bodies, every body a single line 56–72 characters long. Advantage and
disadvantage are **parameters**, not content, and they have been multiplied into the compendium.

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
shape than what it currently ships (2.3). `MODERNIZATION.md` §19 already establishes the licence
position: this is transcribed from the published book, so no third-party code licence reaches it,
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
