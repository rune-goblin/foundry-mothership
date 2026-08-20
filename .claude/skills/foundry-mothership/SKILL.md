---
name: foundry-mothership
description: >-
  Authoring the Mothership RPG system for Foundry VTT v14 — sheets, windows, dialogs,
  DataModels, hooks, settings, compendium packs, the Vite build, the test tiers. Use for any
  work in this repo touching Foundry, Svelte, system.json or packs.
---

# Mothership — Foundry system authoring

`CLAUDE.md` holds the project rules, commands and gotchas; nothing here repeats it.

| Need | Use |
|---|---|
| Any sheet or window | ApplicationV2 + Svelte 5 — `references/svelte-in-applicationv2.md` |
| A dialog | `svelteDialog()` from `module/dialogs/svelte-dialog.ts` |
| Structured data | `foundry.abstract.TypeDataModel` in `module/data/{actor,item}-models.js` |
| A widget | `module/ui/parts/` — assemble from these before writing markup |
| Runtime logic | the typed services: `documents/`, `checks/`, `mutation/`, `rolls/`, `tables/`, `chat/`, `api/` |

`templates/` holds chat cards only.

## Reference files — read the one that fits

| Read | When |
|---|---|
| `references/svelte-in-applicationv2.md` | building any window — the shell, the document store |
| `references/foundry-api.md` | the `foundry.*` namespaces, hooks, documents, settings |
| `references/testing.md` | authoring specs, or a green run you don't trust |
| `references/packs.md` | compendium content — the source chain, ids, verification |
| `references/build.md` | the Vite build, `npm run setup`'s scaffold, the release zip |

## Rules the references assume

**Change roll behaviour in the pipeline, never at a call site.** `rolls/parse.ts` reads
`1d100[+]`/`[-]` into a `RollSpec`; `rolls/resolve.ts` turns an evaluated `Roll` into an
`Outcome` — zero-based dice, the 90+ auto failure, doubles-as-criticals; `checks/checks.ts`
runs a check on top of both. Their unit tests are the spec.

**Grep the installed app before guessing at an API:** `/Applications/Foundry Virtual
Tabletop.app/Contents/Resources/app/public/scripts/foundry.mjs`. Or
https://foundryvtt.com/api/, v14 build.
