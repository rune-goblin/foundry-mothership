# Compendium packs

**Packs are distribution, not repository.** The five 1e compendia are built from tracked
JSON; the LevelDB output is gitignored and rebuilt by CI.

```
packs/_source/<dir>/*.json   ← tracked, reviewable, the source of truth (326 documents)
packs/<compendium_id>/       ← build output, gitignored
```

| source dir | compendium id | docs |
|---|---|---|
| `conditions` | `conditions_1e` | 50 |
| `maintenance` | `items_maintenance_1e` | 100 |
| `hotbar` | `macros_hotbar_1e` | 11 |
| `triggered` | `macros_triggered_1e` | 151 |
| `rolltables` | `rolltables_1e` | 14 |

Source directory names are deliberately shorter than the compendium ids. **The ids cannot
be renamed** — they are baked into every rolltable's `documentUuid`, into `lang/en.json`
`@UUID[...]` links, and into existing worlds.

## Commands

```bash
./scripts/packs.sh unpack           # LevelDB → JSON sources (after editing in Foundry)
./scripts/packs.sh pack             # JSON sources → LevelDB (before running/shipping)
./scripts/packs.sh unpack rolltables   # one source dir
```

Uses the `fvtt` CLI (global if present, else `npx @foundryvtt/foundryvtt-cli@3`).

## The Foundry lock

A running Foundry takes an **exclusive LevelDB lock** on every pack it can see. `packs.sh`
refuses to run while Foundry is open — that guard is deliberate, not paranoia. Close
Foundry, or set `ALLOW_FOUNDRY_RUNNING=1` if you are certain this repo is not linked into a
running instance's data dir.

The e2e harness sidesteps this by cloning packs into `test/foundry-data/` rather than
linking them (`scripts/setup-test-env.ts`).

## Filenames encode the sign

`fvtt` writes `<Name>_<id>.json`; `packs.sh` renames to a readable slug. **The `+`/`-` must
survive**: macros come in pairs — `+1 Stress` vs `-1 Stress`, `Panic Check [+]` vs `[-]` —
and a naive slug collapses each pair onto one filename, losing which is which. The slug maps
leading/trailing signs to `plus`/`minus` and leaves mid-word hyphens alone, so `Well-Rested`
stays readable. A uniqueness guard fails loudly rather than letting one document silently
overwrite another; it is what caught this originally.

Filenames are for review only — `fvtt package pack` keys off each document's `_id` in the
JSON body, so renaming is safe.

## Editing content

1. `./scripts/packs.sh pack` and open Foundry (or `npm run setup` first).
2. Edit in the Foundry UI.
3. Close Foundry, `./scripts/packs.sh unpack`, review the JSON diff, commit.

Editing the JSON directly is fine too — `pack` then verifies it compiles.

## Verification

`test/e2e/compendiums.spec.ts` asserts every pack loads with the document count its source
holds, that the `+`/`-` pair survived, that the android panic macros read the
`table1ePanicStressAndroid` setting rather than a hardcoded id, and that nothing references
a deleted `_0e` pack.

CI checks each built pack carries `.ldb`, `CURRENT` and `MANIFEST` — **a pack missing those
opens as an empty database rather than failing**, so an incomplete build would ship as a
system that installs cleanly and contains nothing.
