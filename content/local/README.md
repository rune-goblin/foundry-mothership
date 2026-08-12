# `content/local/` — the rescued tier

Empty on purpose. This is where content whose only surviving copy is the inherited compendia
lands, once it has been rescued out of `packs/_source/` into the same record idiom the vendored
`content/data/` uses. From that point the packs are generated and this directory is the source.

`content/schema/*.schema.json` validates whatever appears here; `scripts/build-content.ts` emits
it; `content/ids.json` pins every `_id` so the 269 `@UUID` cross-references inside the shipped
content keep resolving.

| Fills this directory | Unit | What lands |
|---|---|---|
| conditions | **C2** | `conditions.json` — 50 items, `treatment.html` stripped, cross-checked against the 15 PSG matches |
| macros | **C3** | `macros.json`, `hotbar.json` — the generation table: one row per macro, ids pinned to today's |
| ship content | **C10** | `maintenance.json` (the `name` → `description` move), `ship-tables.json` — Bankruptcy, Distress, Maintenance Issues, Megadamage |

The derived tier — skills, classes, weapons, armour, equipment and the PSG-sourced tables — does
**not** live here. It is generated straight from `content/data/`, which is vendored, not
maintained. After the rescue the two tiers differ only in provenance: one validator, one
generator, and the generator does not know which tier a record came from.

See `docs/plans/architecture.md` Decision 6.
