# Player's Survival Guide

| | |
|---|---|
| Title | *Mothership Sci-Fi Horror RPG — Player's Survival Guide* |
| Publisher | Tuesday Knight Games |
| Edition | 1e |
| Printing | v1.2 |
| Book id | `psg` — the directory name, the `BOOKS` entry in `scripts/content/books.ts`, and the `provenance.book` stamped on every document this book emits |

## What this repo took

Twelve datasets, each one with a runtime consumer. Every other table in the book is either
Warden's material or has no consumer here, and is not transcribed.

| Dataset | Emits |
|---|---|
| `skills.ts` | 42 skill Items |
| `classes.ts` | 4 class Items |
| `weapons.ts` | 22 weapon Items |
| `armor.ts` | 5 armor Items |
| `equipment.ts` | 44 item Items |
| `trinkets.ts`, `patches.ts` | 2 RollTables, 100 rows each |
| `loadouts.ts` | 4 RollTables, one per class |
| `wounds.ts` | 5 RollTables, 50 rows |
| `panic.ts` | 1 RollTable, 20 rows, plus the conditions its results grant |
| `death.ts` | 1 RollTable, 4 rows |
| `character-creation.ts` | the generator's step formulas — a typed module, not documents |

`source.ts` is the citation helper — one printing, so only the page and section vary across the
136 records that cite it. `../common.ts` holds the value types every book shares, and
`scripts/content/books.ts` names the book. `content/ids.json` pins each emitted document's `_id`
so a rebuild does not invalidate worlds built on an earlier one.

## Typed catalogs, not JSON

Each dataset is `export const X = [...] as const satisfies readonly T[]`, so its ids become literal
union types. The three cross-reference sets are then **compiler-enforced** rather than validated at
runtime: the 42 skills' prerequisites, the classes' granted skills, and the loadout mapping in
`gear.ts`. A wrong id is a compile error, and `tsc` even suggests the right one.

What the JSON Schemas checked and types cannot — row counts, a table covering its die without a gap
or an overlap — moved to `test/content-catalogs.test.ts`. The rest of what they checked (enums,
tuple lengths, the `10 | 15 | 20` skill bonus) is in the types. Ajv, the 13 schema files and
`scripts/content/validate.ts` are deleted.

## Imported once, owned here

The corpus was extracted by `runegoblin/modules/mothership-data`, a Python pipeline, and copied in
on 2026-08-12; the JSON became these catalogs by a one-time mechanical transform, verified
byte-identical on re-serialisation. **That folder is not under version control** — it has no `.git`
directory, so there is no revision to pin and no upstream to sync against. The corpus is owned by
this repo from now on: fix a defect here, in this directory, and do not rebuild a sync script. The
`CHECKSUMS` file and `sync-content.ts` that once guarded a copy relationship are deleted, because
the relationship does not exist.

Two things are worth fixing at the source if the corpus is ever re-extracted: the loadout rows name
their items in free text rather than by id (`gear.ts` is the hand-checked mapping that closes it),
and there is no conditions dataset at all — the panic results that grant one are where the
conditions pack comes from.

## Licence

Transcribed from the published book, so no third-party *code* licence reaches it. It answers to
Tuesday Knight Games' third-party policy like the rest of this system — `MODERNIZATION.md` §19.

## Adding the next book

Copy the shape: `content/books/<id>/` with its typed catalogs, its `source.ts`, and a `BOOK.md` like
this one; a loader module beside `scripts/content/books/psg.ts`; one entry in `BOOKS`. Then
`npm run content -- --allocate` mints ids for its packs and rewrites `content/ids.json`, which is
committed. Nothing else moves — the emitter, the DataModel guard and the manifest are book-agnostic,
and the build refuses a book that reuses another's pack name or compendium.
