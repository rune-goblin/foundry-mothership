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
| `skills.json` | 42 skill Items |
| `classes.json` | 4 class Items |
| `weapons.json` | 22 weapon Items |
| `armor.json` | 5 armor Items |
| `equipment.json` | 44 item Items |
| `trinkets.json`, `patches.json` | 2 RollTables, 100 rows each |
| `loadouts.json` | 4 RollTables, one per class |
| `wounds.json` | 5 RollTables, 50 rows |
| `panic.json` | 1 RollTable, 20 rows, plus the conditions its results grant |
| `death.json` | 1 RollTable, 4 rows |
| `character-creation.json` | the generator's step formulas — a typed module, not documents |

`schema/*.schema.json` validates them, `common.schema.json` holds the shared value types, and
`scripts/content/books.ts` names the book. `content/ids.json` pins each emitted document's `_id`
so a rebuild does not invalidate worlds built on an earlier one.

## Imported once, owned here

The JSON was extracted by `runegoblin/modules/mothership-data`, a Python pipeline, and copied in
on 2026-08-12. **That folder is not under version control** — it has no `.git` directory, so there
is no revision to pin and no upstream to sync against. The corpus is owned by this repo from now
on: fix a defect here, in this directory, and do not rebuild a sync script. The `CHECKSUMS` file
and `sync-content.ts` that once guarded a copy relationship are deleted, because the relationship
does not exist.

## Licence

Transcribed from the published book, so no third-party *code* licence reaches it. It answers to
Tuesday Knight Games' third-party policy like the rest of this system — `MODERNIZATION.md` §19.

## Adding the next book

Copy the shape: `content/books/<id>/` with its datasets, its `schema/`, and a `BOOK.md` like this
one; a loader module beside `scripts/content/books/psg.ts`; one entry in `BOOKS`. Then
`npm run content -- --allocate` mints ids for its packs and rewrites `content/ids.json`, which is
committed. Nothing else moves — the validator, the emitter, the DataModel guard and the manifest
are book-agnostic, and the build refuses a book that reuses another's pack name or compendium.
