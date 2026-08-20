# Compendium packs

The source chain is one-way — packs are distribution, not repository:

```
content/books/psg/*.ts        ← the source of truth (typed catalogs)
  → npm run content           → packs/_source/<dir>/*.json   (tracked, generated — never hand-edit)
  → ./scripts/packs.sh pack   → packs/<compendium_id>/       (LevelDB, gitignored, rebuilt by CI)
```

The nine 1e compendia; source dirs are shorter than their ids on purpose:

| source dir | compendium id |
|---|---|
| `armor` | `armor_1e` |
| `classes` | `classes_1e` |
| `conditions` | `conditions_1e` |
| `equipment` | `equipment_1e` |
| `hotbar` | `macros_hotbar_1e` |
| `triggered` | `macros_triggered_1e` |
| `rolltables` | `rolltables_1e` |
| `skills` | `skills_1e` |
| `weapons` | `weapons_1e` |

**The ids cannot be renamed** — they are baked into rolltable `documentUuid`s,
`lang/en.json` `@UUID[...]` links, and existing worlds. Document `_id`s are minted by
`npm run content -- --allocate` and must stay stable for the same reason.

`packs.sh` uses the `fvtt` CLI (global if present, else `npx @foundryvtt/foundryvtt-cli@3`).
`unpack` (LevelDB → JSON) exists for inspecting what a built pack really holds — its output
is not a source. The Foundry LevelDB lock, the pack-never-deletes trap and the
pack → setup → e2e sequence are in `CLAUDE.md`'s gotchas.

## Verification

`test/e2e/compendiums.spec.ts` asserts every pack loads with the document count its source
holds. CI checks each built pack carries `.ldb`, `CURRENT` and `MANIFEST` — **a pack missing
those opens as an empty database rather than failing**, so an incomplete build would ship as
a system that installs cleanly and contains nothing.
