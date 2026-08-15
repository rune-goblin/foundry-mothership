# MoSh — architecture audit

**Date:** 2026-08-13, after S8 (commit `2824634`).
**Scope:** the whole shipping codebase — `module/` (runtime), `content/` + `scripts/` (pipeline and tooling), `test/` (both tiers) — ~19,800 lines across 130 files.
**Method:** five parallel reviewers, one per subsystem, each reading its slice in full and applying the C2 catalog (code smells, anti-patterns, SOLID, DRY, Law of Demeter, Tell-Don't-Ask). Findings the synthesis judged consequential were re-verified against the source by hand; those are marked **✓ verified**.
**Findings:** 7 critical, 34 major, 30 minor, 7 nits — 45 `[local]`, 33 `[cross-cutting]`.

This document has three parts. **Part I** explains the architecture as it stands, for a developer new to the repo. **Part II** is the findings, grouped by subsystem, each tagged with severity and scope. **Part III** is the recommendations: the root-cause themes, a proposed target structure, and a sequenced remediation plan that maps onto the queued S9 unit.

**Triage workflow:** every finding starts `[open]` (tag omitted). As work lands, append a status tag after the scope tag — `[local] [done]`, `[cross-cutting] [deferred]`, `[local] [skipped]` — and add a one-line `**Resolution (date):** …` under the finding. Keep findings in place; `grep -v -e '\[done\]' -e '\[skipped\]' docs/audits/architecture-audit.md | grep '^####'` lists what is outstanding.

---

# Part I — The architecture as it is today

## The one-screen version

MoSh is a Foundry VTT **system** (id `mothershiprpg`): Foundry supplies the application, database, and document framework; this package supplies the Mothership rules, sheets, and content. Four layers, four flows:

```
content/books/psg/*.ts        (the book, as typed TypeScript catalogs)
        │  npm run content
        ▼
packs/_source/**/*.json       (generated, committed)
        │  ./scripts/packs.sh pack
        ▼
packs/ (LevelDB)  ──shipped──►  Foundry loads system.json
                                        │
                        dist/mothershiprpg.js  (Vite bundle of module/)
                                        │
        ┌───────────────────────────────┼──────────────────────────────┐
        ▼                               ▼                              ▼
module/mosh.js                  module/data/*.js               module/ui/**
boot + game.mothershiprpg       TypeDataModel schemas          ApplicationV2 shells
macro API                       for 2 actor + 7 item types     mounting Svelte 5
        │                               ▲                              │
        └────────► module/actor/actor.js ◄─────────────────────────────┘
                   (2,394 lines: derivation, the roll pipeline,
                    dialogs, chat cards, mutation, ammo — the hub)
```

The tests bracket both ends: 273 vitest specs prove the pure logic, schemas, and the entire content build in Node with thin Foundry stubs; 116 Playwright specs drive a real headless Foundry against the built packs.

## Boot and the runtime core

The Vite entry is `module/index.js`: two side-effect imports — `css/mosh.css` (hand-authored, bundled to `dist/mothershiprpg.css`) and `module/mosh.js`. Everything else happens in `mosh.js` (619 lines), which is simultaneously the boot script, the macro API, a dialog, and a document-lookup library.

`Hooks.once('init')` (`module/mosh.js:18-88`) does all registration in one closure:

1. Assembles the public API `game.mothershiprpg` — the document classes plus seven functions: `rollItemMacro`, `rollStatMacro`, `initRollTable`, `initRollCheck`, `initModifyActor`, `initModifyItem`, `noCharSelected`. This surface is load-bearing: 104 shipped pack macros call the `init*` functions and `noCharSelected`.
2. Calls `registerSettings()` (`module/settings.js`): six visible world settings (`macroTarget`, `critDamage`, `damageDiceTheme`, `panicDieTheme`, `hideWeight`, `autoStress`), a settings menu opening `RolltableConfigApp`, and seven hidden `table1e*` string settings whose defaults are the document ids of the panic/wound/death rolltables.
3. Sets `CONFIG.Combat.initiative` (1d100), the document classes, and `CONFIG.Actor/Item.dataModels` from `module/data/`. The DataModels are authoritative; `template.json` is the inert test oracle.
4. Unregisters the core v1 sheets and registers the five Svelte-backed ApplicationV2 sheets from `module/ui/`.
5. Registers three Handlebars helpers; only `compare` (`module/compare.js`, a comparator table that replaced an old `eval`) is used — by the chat templates, which are the one place Handlebars survives.

`Hooks.once('ready')` registers a `hotbarDrop` handler that writes script macros invoking `game.mothershiprpg.rollItemMacro("<name>")`. Three `diceSoNiceReady` blocks add the dice colorsets the theme settings name. `Hooks.on('preCreateActor')` stamps prototype-token defaults.

The API functions own only *target resolution*: each reads `macroTarget` and dispatches to `game.user.character` or every controlled token's actor, then delegates to `MothershipActor` methods. `mosh.js` also exports `fromIdUuid` — a 120-line id-or-uuid resolver that scans compendia and world collections; `actor.js` imports it back from the entry, forming a cycle.

## Documents, data models, derivation

Two document classes back everything. `MothershipActor` (`module/actor/actor.js`, 2,394 lines) carries essentially all runtime behaviour. `MothershipItem` (`module/item/item.js`, 32 lines) is nearly empty; all item behaviour — ammo, reload, description-to-chat — lives on the actor.

`module/data/actor-models.js` and `item-models.js` define `TypeDataModel`s for the two actor types (`character`, `creature`) and seven item types (`item`, `skill`, `weapon`, `armor`, `ability`, `condition`, `class`). Small factories (`num`, `str`, `pool`, `stat`) keep declarations compact; `WEAPON_RANGES`, `ROLL_SCOPES`, `ROLL_MODIFIERS` are proper `choices` enums. `test/actor-models.test.ts` / `item-models.test.ts` assert field-for-field equivalence with `template.json`.

`prepareDerivedData` (`actor.js:10-18`) dispatches on `this.type` to `_deriveCharacter` (21-71) or `_deriveCreature` (74-115). Both sum equipped-armor points into `stats.armor`, compute `netHP` from wounds and health, and total Bleeding severity; the character adds carried weight and Strength/10 capacity, the creature scales `stats.combat` by remaining wounds when `swarm.enabled`. Derivation mutates `this.system` in place (Foundry's model), which is why stored data is always asserted via `doc.toObject().system`.

## The life of a roll

A sheet button or a compendium macro (via `game.mothershiprpg.initRollCheck`) calls `actor.rollCheck(rollString, aimFor, attribute, skill, skillValue, weapon, overrideDamagaRollString)` (`actor.js:1100-1533`). Null parameters are back-filled by DialogV2 prompts — `chooseAttribute` (806), `chooseSkill` (895), `chooseAdvantage` (1045) — with `conditionModifier`/`conditionNote`/`conditionPreselect` (776-803) preselecting the advantage/disadvantage button a condition names (S8).

`rollCheck` computes `rollTarget = stat.value + stat.mod + skillValue`. `parseRollString` (143-177) turns the mini-language (`1d100 [+]`, aim `low`) into Foundry keep syntax (`{1d100,1d100}kl`); `new Roll(...).evaluate()` rolls it; `parseRollResult` (180-576) post-processes — zeroes 10/100 results, picks the kept die with crit-aware rules (doubles are criticals, ≥90 auto-fails, panic keeps the worst failure), overwrites the Roll's `_total`, sets `success`/`critical`, and builds the outcome HTML. `rollCheck` renders `templates/chat/rollCheck.html` and posts via `toMessage`. A failed check with `autoStress` on adds a Stress point through `modifyActor`; a critical failure puts a panic-check button on the message. Both parsers are pinned by dedicated unit suites — the tests are the spec.

`rollTable` (593-764) handles RollTables; the sentinel `tableId === 'panicCheck'` remaps to the settings-registered panic table and rolls `1d20` aimed high against Stress. `modifyActor` (1536-1860) is the single mutation engine: it resolves a dotted `fieldAddress` string against the actor, clamps to sibling `min`/`max`, rolls health past zero into wounds, updates, and narrates to chat. Around it sit `modifyItem`, the reload flow, condition damage (`takeBleedingDamage` etc.), the cover dialog, and item-description chat — the surface the 104 shipped macros call.

## The UI layer

Every window follows one pattern: a thin ApplicationV2 shell (`*App.js`) owns the Foundry window — options, title, form persistence, drag-and-drop — and a Svelte 5 component owns everything inside it. The shell's `_renderHTML()` mounts the component exactly once, caches the node, and on later renders refreshes a store; `_preClose()` unmounts. Eight shells exist: the item-sheet base (with a `static COMPONENT` slot for the simple types), class and skill subclasses that resolve stored UUIDs, the two actor sheets (on `ActorSheetV2`, which supplies drag/drop), creature settings, the generator, and the rolltable config menu.

Reactivity flows through `createDocumentStore` (`module/ui/document-store.svelte.js`): Foundry documents are not reactive, so the store holds a `$state.raw` snapshot the shell rebuilds on each Foundry render. Components read `store.current` through `$derived` and never mirror document data into local state. Writes go the other way by two routes: form fields carry `name="system.…"` and Foundry's `submitOnChange` persists them; imperative mutations call `actor.update(...)` directly, and the resulting re-render refreshes the snapshot.

`module/ui/parts/` is the shared vocabulary — list primitives, `Tabs`, field primitives, `SheetHeader`, `Editor`, plus the `activate.js` keyboard shim and the `dropTarget` attachment. All emit global `css/mosh.css` class names, pinned by `test/ui-parts.test.ts` as a deliberate stylesheet contract. Above them sits the sections tier (`parts/sections/`): `HealthBlock`, `ArmorBlock`, and `ItemPanel`, which owns the frame both actor sheets share.

The generator is the exception: `GeneratorApp` constructs a `CharacterDraft` (`generator/draft.svelte.js`), a runes class holding all wizard state; the actor is read once at open and written once in `apply()`.

`templates/` still holds nine Handlebars files, none dead but none UI-layer: six chat cards and three dialog partials, all rendered from `actor.js`. They leave when the chat pipeline modernizes.

## The content pipeline

Content begins as typed TypeScript catalogs in `content/books/psg/` — one file per PSG dataset, plus the citation helper `source.ts` (`psg(page, section)` stamps every record with book/version/page). Each array ends `as const satisfies readonly X[]`, so ids become literal union types and cross-references are compile-checked: a class granting a misspelled skill fails `npm run check`, not a runtime lookup.

`npm run content` runs the build (`scripts/content/pipeline.ts`) over the book's `PackDefinition`s. The PSG adapters (`scripts/content/books/psg/`) translate book shapes onto the runtime schema. Ids stay stable via `content/ids.json`, managed by `IdRegistry`: ids are random Foundry ids, never name-derived, so renames never move them; a record absent from the registry fails the build unless `--allocate` mints one; deleting a record without a `retired` entry fails `checkIdPreservation`.

`emit()` writes exactly the JSON `fvtt package pack` needs, with sorted keys so bytes are deterministic. Three guards run before writing: `checkModelFields` imports the **real** DataModels under field stubs and rejects any key or enum value the schema would silently discard on load; `checkReferences` resolves every `@UUID` against what this build emitted; `checkIdPreservation` catches vanished ids.

`./scripts/packs.sh pack` compiles `packs/_source/` to LevelDB. `npm run setup` symlinks the repo into Foundry's Data dir but **copies** packs; `npm run deploy` makes a link-free release rehearsal. The dev loop after a content change: `npm run content` → `./scripts/packs.sh pack` → `npm run setup` → `npm test` → `npm run test:e2e`.

`macros.ts` (1,346 lines) is the one catalog that is mostly JavaScript-in-strings: 77 triggered macros (mostly one-line `game.mothershiprpg.*` calls, hand-unrolled across stat/save/wound × plain/[+]/[-]) and 8 hotbar macros of 40–120 embedded lines each.

## The test architecture

**The vitest tier** (`npm test`, 273 specs) runs in Node with no Foundry. Two thin shims make that possible: `test/setup.ts` defines `globalThis.Actor = class {}` so `actor.js` can load, and `test/field-stubs.ts` stubs `foundry.data.fields` as *recorders* — each field class captures its `initial`/`choices`/nested schema, so tests walk the real shipped schema. On these sit the pure-logic suites (both roll parsers, condition modifiers, derivation, the generator rules), the Svelte primitives in jsdom, and the content pipeline (proven against a purpose-built fixture book, including that every guard *fails* when it should).

**The guard-rail tests** each pin a past incident. `actor-models`/`item-models` hold the schemas to `template.json`. `sheet-bindings` extracts every literal `system.*` binding from the Svelte sheets and asserts the schema declares it — the guard against this repo's signature bug, where `SchemaField` silently discards undeclared keys. `field-usage` is the inverse ratchet: every declared schema leaf must have a reader, with a shrink-only grandfather list.

**The e2e tier** (`npm run test:e2e`, 116 specs) drives a real headless Foundry v14. `setup-test-env.ts` clones the developer's live Foundry Data dir copy-on-write into `test/foundry-data/`, de-symlinks the pack directories, and repoints the world manifest; `global-setup.ts` preflights the world, joins as GM, and asserts every compendium's document count matches `packs/_source` — the check that has repeatedly caught ghost packs. Specs share one worker and one GM page; isolation comes from `__e2e_`-prefixed throwaway documents deleted in `afterEach`.

What each tier proves: vitest proves the roll mathematics, derivations, schema agreements, and the entire content build; e2e proves Foundry wiring — form persistence, dialogs, packs, and the shipped content as Foundry reads it back. The seam between them is where the gaps live (see T1/T2).

---

# Part II — Findings

## Summary

The codebase is two codebases. The **new work** — the DataModels, the content pipeline, the id registry, the guard-rail tests, the e2e harness, the parts/ layer, the generator draft — is disciplined, deterministic, and self-verifying; the reviewers' "clean" lists for those areas are long and genuine. The **inherited core** — `module/actor/actor.js` and the macro half of `module/mosh.js` — is where the haphazard origins survive: one God Object holding the roll engine, six dialogs, chat rendering, and the mutation engine; stringly-typed dispatch on display names and sentinel arguments; fire-and-forget async; and at least eight user-visible bugs, every one of them in the ~80% of `actor.js` that no test tier reaches (T1/T2). The findings cluster into seven themes, taken up in Part III.

Three findings were reported independently by two reviewers (the broken `rollStatMacro`, the five-fold `macroTarget` copy-paste, the never-resolving dialog promises); duplicates are merged below with a note.

## The bug list — user-visible defects to fix first

| # | Bug | Where | Status |
|---|---|---|---|
| C1 | Death Save macro reads settings namespace `"mosh"`, which no longer exists — all three buttons throw | `content/books/psg/macros.ts:827,833,839` | ✓ verified |
| RC1 | `preCreateActor` writes token-bar paths and a `vision` field the schema discards — every created actor has broken bars, characters lack vision | `module/mosh.js:164-178` | ✓ verified |
| RC3 | Hotbar macros for gear/armor/ability/condition crash: `printDescription(item.id)` after `duplicate()` loses the `id` accessor | `module/mosh.js:257,280` | ✓ verified |
| RC5 | `game.mothershiprpg.rollStatMacro` calls `actor.rollStatSelect`, defined nowhere — throws when invoked | `module/mosh.js:316` | ✓ verified |
| F2 | `rollTable` without a roll string always prompts "Panic Check" with `1d20`, for any table; the correct table-aware prompt below it is unreachable | `module/actor/actor.js:630-655` | ✓ verified |
| F5 | The sheet's damage button spends ammo: the ammo block runs for any weapon call before the `damage` branch is reached — attack-then-damage double-spends | `module/actor/actor.js:1196-1224` | ✓ verified |
| F4 | Bleeding/radiation chat cards embed a pre-rename image path (`systems/foundry-mothership/...`) and a bare placeholder filename — broken images from a shipped macro | `module/actor/actor.js:2129,2182` | reported |
| F22 | A creature landing on Panic result 19 throws: the android check reads `system.class.value`, absent from the creature schema | `module/actor/actor.js:697-703` | reported |
| C2 | The Wound Roll macro hard-codes five wound-table `_id`s in HTML strings that no integrity guard scans | `content/books/psg/macros.ts:1255-1307` | reported |
| U14 | XP clamps to 16 on a 15-pip track — one invisible extra click state | `CharacterSheet.svelte:91`, `CreatureSheet.svelte:83` | reported |

Every entry above also appears as a full finding below, in its subsystem.

## Runtime core (`module/mosh.js`, `settings.js`, `index.js`, `item.js`, `system.json`)

#### RC1. preCreateActor writes token fields that do not exist — Silently Failing Write — Critical `[local] [done]`
- **Where:** `module/mosh.js:164-178`
- **What:** The hook sets `bar1.attribute: "system.health"` / `bar2.attribute: "system.hits"` although `TokenDocument#getBarAttribute` resolves against `actor.system` (so the paths must be bare), and sets `prototypeToken.vision`, a field the v10+ `PrototypeToken` schema replaced with `sight.enabled` — the schema silently discards it, the same bug class as the armour-`equipped` incident. The comment "use full system path" asserts the opposite of Foundry's behaviour, and `system.json`'s `primaryTokenAttribute`/`secondaryTokenAttribute` disagree with the hook about what the bars show.
- **Why it matters:** Every actor created since this hook landed has non-functional token bars and characters without vision.
- **Direction:** Write bare paths and `sight.enabled`; decide once (manifest or hook) which mechanism owns bar defaults; add an e2e assertion on a created actor's `prototypeToken`.
- **Resolution (2026-08-13):** `init.ts`'s `onPreCreateActor` writes bare paths and `sight.enabled`; `test/e2e/remake.spec.ts` asserts a created actor's `prototypeToken` (R4a/R5).

#### RC2. `foundry.appv1` referenced at init — Deprecated API on a removal clock — Critical `[local] [done]`
- **Where:** `module/mosh.js:55,58`
- **What:** Sheet unregistration dereferences `foundry.appv1.sheets.ActorSheet`/`ItemSheet`, the v1 namespace scheduled for removal in v16.
- **Why it matters:** The day v16 ships, this line becomes a `TypeError` inside `init` — a boot-killing crash.
- **Direction:** Drop the unregister calls if the core defaults no longer shadow the system sheets, or guard the lookup so a missing namespace is a no-op.
- **Resolution (2026-08-13):** `registerSheets` in `init.ts` guards the v1 lookup behind `if (v1 !== undefined)` (R4a).

#### RC3. Hotbar macros for gear crash on `item.id` — `id` vs `_id` — Critical `[local] [done]`
- **Where:** `module/mosh.js:257,280`
- **What:** `rollItemMacro` round-trips the item through `foundry.utils.duplicate()` (a JSON clone that keeps `_id` but loses the `id` accessor) then calls `printDescription(item.id)` — i.e. `printDescription(undefined)`, which throws.
- **Why it matters:** The shipped hotbar path for every non-weapon, non-skill item throws instead of posting a chat card; `actor.js:1210` shows the working convention is `_id`, so the codebase mixes two identity vocabularies.
- **Direction:** Pass `_id` (or better, pass the Document and stop cloning), and add an e2e spec that fires a gear hotbar macro.
- **Resolution (2026-08-13):** `rollItem` in `api.ts` passes the whole item document, never a clone; every gear/armour/ability/condition hotbar macro posts its card (divergences R4a-6, R4b-1).

#### RC4. UUIDs parsed by `split(".")`, guards placed after the dereference — Primitive Obsession — Major `[local] [done]`
- **Where:** `module/mosh.js:199-209, 248-252, 271-275`
- **What:** `createMothershipMacro` reconstructs the actor by splitting `data.uuid` and assuming the `Actor.<id>.Item.<id>` shape (a token-actor drop throws), and both it and `rollItemMacro` place their `if (!item)` warnings *after* expressions that already threw when the item is missing.
- **Why it matters:** The designed warnings are unreachable; users get stack traces instead of messages.
- **Direction:** Resolve the drop with `fromUuid(data.uuid)` and hoist each null-check above the first dereference.
- **Resolution (2026-08-13):** `lookup()` resolves the UUID and `createItemMacro` in `init.ts` warns before any dereference (R4a).

#### RC5. `rollStatMacro` calls a method that does not exist — Lava Flow on the public API — Major `[local] [done]`
- **Where:** `module/mosh.js:295-317` (export at `:24`)
- **What:** The function ends in `actor.rollStatSelect(stat)`, defined nowhere; it computes a `selected` variable it never uses and carries its null guard as commented-out code. Zero shipped macros call it. (Found independently by two reviewers; the actor-layer duplicate F3 is merged here.)
- **Why it matters:** Dead code masquerading as a published API member throws for any user macro that tries it.
- **Direction:** Delete it from the file and the API object (safe: no shipped macro references it), or implement the stat picker via the existing `chooseAttribute` flow.
- **Resolution (2026-08-13):** `rollStatMacro` is gone; `promptCheck` is the real stat-picker entry point (divergence RC5, R4a).

#### RC6. The macroTarget dispatch is copy-pasted five times — DRY / Missing Abstraction — Major `[cross-cutting] [done]`
- **Where:** `module/mosh.js:240-286, 322-342, 350-370, 378-398, 406-426`; re-inlined in 13 shipped triggered macros. (The actor-layer duplicate F24 is merged here.)
- **What:** `rollItemMacro` and the four `init*` functions each repeat the identical ~20-line read-setting / branch character-vs-token / warn / loop block, and the shipped content restates it again.
- **Why it matters:** A change to targeting semantics is a five-site runtime edit plus a content regeneration, and the copies have already drifted.
- **Direction:** Extract one `forTargetActors(fn)` resolver used by all five and *add* it to `game.mothershiprpg` (keeping the five existing signatures — pack macros call them) so future content calls the abstraction.
- **Resolution (2026-08-13):** `forTargetActors` in `api.ts` is the one targeting resolver every verb, the shim and the content call (R4a).

#### RC7. The entry module is a grab-bag and imports itself into a cycle — Big Ball of Mud seed — Major `[cross-cutting] [done]`
- **Where:** `module/mosh.js` (whole file); `module/actor/actor.js:1`
- **What:** One file owns boot registration, the public API, a dialog, a document resolver, and a number formatter (`formatCreditsNumber`, no callers); because `fromIdUuid` lives there, `actor.js` imports the side-effectful entry while the entry imports `actor.js`.
- **Why it matters:** The cycle works by hoisting accident, importing `mosh.js` anywhere registers hooks (untestable in isolation), and the entry is a gravitational home for every future utility.
- **Direction:** Split into `init` (hooks/registration only), `macros` (the `game.mothershiprpg` functions), and a `lookup` module both `actor.js` and the entry import downward. See Part III.
- **Resolution (2026-08-13):** `init.ts` is hooks-only and imports downward; the API, lookup and macro logic are separate modules with no cycle back into it (R0–R4).

#### RC8. `fromIdUuid` — a God Function scanning every pack per call — Shotgun Search — Major `[local] [done]`
- **Where:** `module/mosh.js:473-594`
- **What:** A 120-line resolver that linearly scans every compendium index per call, falls back to searching all eight world collections when no type is given (its own comment admits id collisions are possible), and defines eight identical nested `filter(...)[0]` helpers.
- **Why it matters:** It runs on the hot roll path (three `actor.js` call sites, once per table roll), each call is O(all packs), and the ambiguous fallback can return the wrong document.
- **Direction:** Replace the world-collection helpers with one `game[collection].get(id)` keyed by a type map, and prefer full UUIDs in new content so the scan becomes the legacy path.
- **Resolution (2026-08-13):** `lookup.ts` replaces the scan with a UUID-first, typed-collection, compendium-fallback chain (R4a).

#### RC9. `MothershipItem` is a husk with wiring to nowhere — Lava Flow — Minor `[local] [done]`
- **Where:** `module/item/item.js:9-31`
- **What:** `prepareData` computes three locals and discards them; the `chatListeners`/`_onChatUseSkill` pair is registered by no hook and calls two methods that exist nowhere (`_getChatCardActor`, `actor.rollSkill`). (The actor-layer duplicate F17 is merged here.)
- **Why it matters:** Doubly dead code — unwired and unrunnable — invites someone to "just hook it up" into a crash.
- **Direction:** Reduce the class to an empty subclass until item behaviour actually exists — or give it the real behaviour F15 proposes.
- **Resolution (2026-08-13):** `documents/item.ts` gives `MothershipItem` real behaviour — `fire()`, `reload()`, `toChat()` (R1).

#### RC11. Vocabulary from cut content survives in live dispatch — Lava Flow — Minor `[local] [done]`
- **Where:** `module/mosh.js:256,279` (`item.type == "repair"`); `module/settings.js:72` ("for players and ships"); `module/ui/settings/RolltableConfigApp.js:7` ("14 settings" — seven exist)
- **What:** A branch on an item type that no longer exists, a hint promising cut ship behaviour, and a stale count.
- **Why it matters:** Dead vocabulary is exactly how this repo's two dead "sources" (`scss/`, `_macros/`) got started.
- **Direction:** Delete the `repair` branch and re-word the two texts.
- **Resolution (2026-08-13):** the `repair` branch, the "for players and ships" hint and the stale "14 settings" count are gone with the files that carried them (R4a/R4b).

#### RC12. Debug `console.log` as the only observability; `init*` neither await nor catch — Logging Noise / Swallowed Errors — Minor `[local] [done]`
- **Where:** `module/mosh.js` (10 sites), `module/settings.js` (6 log-only `onChange` handlers); the `async init*` bodies
- **What:** Unconditional logs fire on boot and every API call (dumping raw item objects), and the `init*` functions fire-and-forget the actor calls they trigger, so failures surface only as unhandled rejections. (See also F26 for the 37 sites in `actor.js`.)
- **Why it matters:** Production consoles fill with internal state while real errors have no handling.
- **Direction:** Delete the logs and log-only handlers; `await` the delegated calls so a rejection reaches the caller.
- **Resolution (2026-08-13):** `debug.ts` is the one gated channel; every delegated call in `api.ts`/`documents/actor.ts` is awaited (R0–R4).

#### RC13. Rolltable ids duplicated from `content/ids.json` — Hidden Coupling — Minor `[cross-cutting] [done]`
- **Where:** `module/settings.js:104-151`
- **What:** The seven hidden settings' defaults are bare 16-character document ids whose source of truth is the content pipeline, with nothing tying the two together.
- **Why it matters:** A re-minted id breaks panic/wound/death rolls silently in every world on the defaults, with nothing connecting failure to cause.
- **Direction:** Generate the defaults from `content/ids.json` (a tiny generated `module/data/table-ids.js`), or at minimum pin the pairing with a vitest spec.
- **Resolution (2026-08-13):** `tables/tables.ts` states the seven table ids from `content/ids.json`'s own values, and `test/tables.test.ts` re-derives them from the registry so a re-mint fails CI (R2).

#### RC14. Settings bypass i18n; `macroTarget`'s scope contradicts its own dialog — Inconsistent Interface — Minor `[local] [done]`
- **Where:** `module/settings.js:6-101`; `module/mosh.js:439-441`
- **What:** Every setting name/hint/choice is hardcoded English (Foundry localizes registration keys automatically, and a `pt-BR` translation ships), and `macroTarget` is world-scoped while the `noCharSelected` dialog tells the *player* to change it — a door only the GM can open.
- **Why it matters:** The translation is structurally incomplete and the dialog misdirects players.
- **Direction:** Move the strings to `Mosh.*` keys; make `macroTarget` client-scoped or re-word the dialog.
- **Resolution (2026-08-13):** every setting is a `Mosh.*` key and `macroTarget` is client-scoped (`settings.ts`, R4a).

#### RC15. Three copy-pasted `diceSoNiceReady` hooks — DRY — Nit `[local] [done]`
- **Where:** `module/mosh.js:104-152`
- **What:** Three identical `Hooks.once` blocks differing only in a name and two colours; the colorset names couple by magic string to the theme settings' defaults two files away.
- **Direction:** One hook iterating a colorset array shared with the settings defaults.
- **Resolution (2026-08-13):** `init.ts`'s `onDiceSoNiceReady` iterates the shared `DICE_COLORSETS` array once (R0/R4a).

## Documents, data, and the roll pipeline (`module/actor/actor.js`, `module/data/`, `module/item/`)

#### F1. MothershipActor does everything — God Object — Critical `[cross-cutting] [done]`
- **Where:** `module/actor/actor.js:7-2395`
- **What:** One class holds derivation, a roll-string parser, roll enrichment, six DialogV2 prompt builders, chat-HTML rendering, table rolling, ammo/reload inventory logic, and the actor-mutation engine. Responsibility clusters, measured: 10-115 derivation; 118-140 flavor lookup; 143-576 roll parsing/enrichment (including chat HTML); 579-590 dead helper; 593-764 table rolling; 776-803 condition helpers; 806-1097 three dialogs; 1100-1533 check/attack/damage/rest-save; 1536-1972 mutation + chat; 1975-2109 reload; 2112-2268 condition damage; 2271-2333 cover dialog; 2335-2393 description chat.
- **Why it matters:** Every feature change lands in the same 2,394-line file with shared mutable conventions; it is the root of most findings in this section, and its untestability is the root of T1/T2.
- **Direction:** Split along the visible cluster boundaries — a roll engine (pure), a chat-card renderer, a dialog module in `module/ui/`, an inventory service on the item — keeping the actor methods as thin, signature-stable façades because pack macros call them by name. Part III sketches the target.
- **Resolution (2026-08-13):** the God Object is gone — `documents/actor.ts` (406 lines) holds derivation and thin named methods; the roll engine, dialogs, chat rendering, tables and mutation each moved to their own module under `module/` (R0–R5, the whole remake).

#### F2. rollTable's fallback dialog is hardcoded to Panic and shadows the correct one — Buggy + Dead Code — Major `[local] [done]` ✓ verified
- **Where:** `module/actor/actor.js:630-655`
- **What:** The first `if (!rollString)` block always titles the dialog "Panic Check" and rolls `1d20` for any table, and because it assigns `rollString`, the second, table-aware `if (!rollString)` block at 650 is unreachable.
- **Why it matters:** Any non-panic table rolled without an explicit roll string gets the wrong die and the wrong prompt, while the correct code sits dead below it.
- **Direction:** Delete the pre-fetch block; let the post-fetch prompt (which knows `tableName`/`tableDie`) handle the null case, seeding the panic die inside the `panicCheck` sentinel branch.
- **Resolution (2026-08-13):** `checks/tables.ts` prompts with the table's own name and die; the panic-only shadowing block is gone (R2).

#### F4. Stale asset paths in condition-damage chat cards — rename leftover — Major `[local] [done]`
- **Where:** `module/actor/actor.js:2129` (`systems/foundry-mothership/images/...`), `:2182` (`src="icon_file_attribute_health.png"`)
- **What:** `takeBleedingDamage` embeds the pre-§18-rename system id in its image path; `takeRadiationDamage` embeds a bare placeholder filename.
- **Why it matters:** `takeBleedingDamage` is called from a shipped pack macro, so users see broken images; hand-built HTML strings escaped the rename that templates got.
- **Direction:** Point both at the real `systems/mothershiprpg/...` path, and move these chat cards onto the existing Handlebars templates so paths live in one place.
- **Resolution (2026-08-13):** `chat/cards.ts`'s `asset()` is the one path constant every card image goes through (R2).

#### F5. A standalone damage roll spends ammo — Sequential Coupling / double-spend — Major `[local] [done]` ✓ verified
- **Where:** `module/actor/actor.js:1196-1222` (ammo block) vs `:1224-1302` (damage branch); triggered from `CharacterSheet.svelte:104`, `CreatureSheet.svelte:111`
- **What:** The ammo-decrement block runs for any call carrying a weapon before the `specialRoll === 'damage'` branch is reached, so the sheet's separate damage button consumes shots in addition to the attack that already did.
- **Why it matters:** Attack-then-damage — the sheet's natural flow — decrements `curShots` twice per shot fired.
- **Direction:** Gate the ammo block on the roll being an attack, or better, move ammo accounting into a weapon-owned `fire()` invoked only by the attack path (F15).
- **Resolution (2026-08-13):** `documents/item.ts#fire()` is reachable only from the attack path; `test/checks-damage.test.ts` asserts the damage module's import graph cannot reach it (R1/R3).

#### F6. Dialog promises that never resolve are awaited — Broken Promise — Major `[cross-cutting] [done]`
- **Where:** `module/actor/actor.js:1975-2032` (`askReload`, `outOfAmmo`, awaited at 1210/1216/2058), `:2271-2333` (`chooseCover`); `module/mosh.js:432-462` (`noCharSelected`). (RC10 is merged here.)
- **What:** These wrap DialogV2 in `new Promise(resolve => …)` but no button callback ever resolves, so every `await` parks forever; the flows work only because the button callbacks act independently.
- **Why it matters:** Any future code placed after one of these awaits silently never runs, and each call leaks a pending promise.
- **Direction:** Use `DialogV2.wait()`/`confirm()`/`prompt()` (real promises) for all five, matching the resolve-in-callback pattern the three roll dialogs already get right.
- **Resolution (2026-08-13):** `dialogs/svelte-dialog.ts` wraps `DialogV2.wait`, resolving on every button and on dismissal (R3).

#### F7. modifyActor is two 140-line copies of itself — Duplicated Code — Major `[local] [done]`
- **Where:** `module/actor/actor.js:1588-1714` vs `:1716-1858`
- **What:** The flat-value and rolled-value branches repeat the clamp/rollover/update/flavor/message pipeline nearly verbatim, and have already drifted (`Mosh.HealthZeroMessage` vs `HealthZeroMessage2` at 1665/1799).
- **Why it matters:** Every rules tweak must be made twice.
- **Direction:** Resolve the change amount up front (constant or roll result), then run one shared apply-and-narrate path.
- **Resolution (2026-08-13):** `mutation/mutate.ts` is the one mutation engine — one plan, one awaited update (R1).

#### F8. parseRollResult: 400 lines mixing die-picking with chat HTML — Long Method — Major `[local] [done]`
- **Where:** `module/actor/actor.js:180-576`
- **What:** One method re-parses the roll string, mutates die results, runs four near-identical `[-]/[+]` × `kh/kl` quadrants of crit-aware keep logic (281-385), then builds `outcomeHtml`/`rollHtml` presentation strings inline (445-570).
- **Why it matters:** The rules are stated four times (the quadrants differ only in which die a crit favors), and the embedded HTML means a styling change edits the dice engine.
- **Direction:** Reduce the quadrants to one keep function parameterized by crit preference, and move HTML building into the chat-card layer; `test/parse-roll-result.test.ts` pins the behaviour for the refactor.
- **Resolution (2026-08-13):** `rolls/resolve.ts` is a pure function over an `EvaluatedRoll`, with no chat HTML inside it (R0).

#### F9. rollCheck: 434 lines of branch-per-use-case — Long Method / Divergent Change — Major `[local] [done]`
- **Where:** `module/actor/actor.js:1100-1533`
- **What:** Attack, damage-only, rest-save, and plain-check flows interleave through one method via sentinel checks, with the wound-effect string munge duplicated wholesale inside it (1252-1272 vs 1407-1427) and the `"Str/10"` sentinel tested twice.
- **Why it matters:** Each added rule multiplies the interleavings; duplication has already appeared within the single method.
- **Direction:** Extract the damage flow (it already returns early) and the flavor assembly into named helpers; hoist the wound munge into one function.
- **Resolution (2026-08-13):** `checks/checks.ts` dispatches on the `CheckKind` union; attack, damage, rest-save and plain checks are named branches, not sentinel-tested interleavings (R3).

#### F10. Fire-and-forget updates read back stale state — Race Hazard — Major `[cross-cutting] [done]`
- **Where:** `module/actor/actor.js:1624,1759` (unawaited `this.update`), `:1657-1666` (reads `this.system.hits` right after), `:2163-2169`/`:2223-2229` (seven concurrent unawaited `modifyActor` calls), `:1204` (unawaited `updateEmbeddedDocuments`)
- **What:** `modifyActor` never awaits its `update()` yet immediately derives message text from `this.system`; radiation/cryo fire seven overlapping calls, each a separate database round-trip.
- **Why it matters:** Chat can describe pre-update state, interleaved same-document updates are order-dependent, and errors from unawaited promises vanish.
- **Direction:** `await` writes before reading back; let stat-wide damage build a single multi-field update object.
- **Resolution (2026-08-13):** `mutation/mutate.ts` awaits its one update before anything reads the result (R1, same fix as F7).

#### F11. Every consumer re-parses the roll string by substring — Primitive Obsession — Major `[cross-cutting] [done]`
- **Where:** `module/actor/actor.js:149-171, 210-234, 243, 281, 334, 392`; fragments also built by concatenation in `chooseAdvantage:1051` and `rollTable:624`
- **What:** The mini-language is decoded ad hoc at each site (`includes('[')`, `substr(0, indexOf('['))` four ways per die size) instead of once into a value (die, sign, advantage).
- **Why it matters:** The same lexing exists in at least six places with different edge handling — the four-way `1d10`/`-1d10` comparison is one die size away from silently not matching.
- **Direction:** Parse the string once into a small record at the pipeline mouth and pass that through; the unit tests pin the observable behaviour.
- **Resolution (2026-08-13):** `rolls/spec.ts`/`parse.ts` parse the mini-language once into a `RollSpec`; every consumer reads the record (R0).

#### F12. Dotted field addresses resolved by reduce, updates built by JSON.parse — Stringly Typed — Major `[cross-cutting] [done]`
- **Where:** `module/actor/actor.js:668-673, 1559-1579, 1622, 1757`; call sites in `mosh.js` and 39 pack macros
- **What:** `modifyActor` navigates `'system.other.stress.value'` by split-and-reduce, infers `min`/`max`/`label` siblings by popping the last segment (an unnamed `{value,min,max,label}` pod contract with the schemas), and constructs update payloads with `JSON.parse('{"path": n}')`.
- **Why it matters:** A `NaN`/`undefined` value makes `JSON.parse` throw where an object literal would not, and the address format is baked into shipped macros — the string is load-bearing.
- **Direction:** Keep accepting the dotted string at the API boundary but resolve it immediately to a typed accessor in one helper; build updates with computed-key object literals.
- **Resolution (2026-08-13):** `mutation/address.ts` resolves the dotted string once into a typed `FieldAddress`; updates are built as object literals (R1).

#### F13. Table and flavor identity by munged display names — Stringly Typed dispatch — Major `[cross-cutting] [partial]`
- **Where:** `module/actor/actor.js:658-666` (`tableName.slice(-5) === 'Wound'`), `:681,697` (`tableName === 'Panic Check'`), `:705-708` (name → lang-key munge), `:1259-1263, 1414-1418` (wound-label → key chains), `:121,698` (class name `'android'`)
- **What:** Behaviour keys off human-readable names — table titles, wound-effect labels, class names — normalized by chained `replace` into lang-key fragments.
- **Why it matters:** Renaming a table or class (or translating one — `pt-BR` exists) silently changes game behaviour: wounds stop auto-applying, androids stop short-circuiting.
- **Direction:** Carry machine identity as data — a flag on the table document, a passed roll-kind enum, and the class item's `robotic` boolean (the schema already has it; the TODO at line 123 says as much).
- **Resolution (2026-08-13):** table and flavor identity is a `TableKey` record now (setting, id, die, `wound`), not a munged name (R2). `isRobotic` in `tables/tables.ts` reads the class item's `robotic` flag first, and R7 has the generator embed that item, so every character made from here on answers by flag. The name fallback **stays**, deliberately: it is the only thing a character generated before R7 — or filled in by hand — knows, and deleting it would turn every Android already in a world back into a human on Panic 19. It retires with a migration that grants those characters their class item, and `isRobotic`'s comment names that condition.

#### F14. Sentinel values smuggled through unrelated parameters — Control Coupling — Major `[cross-cutting] [done]`
- **Where:** `module/actor/actor.js:613` (`tableId === 'panicCheck'`), `:1126` (`attribute === 'damage'`), `:1144` (`attribute === 'restSave'`); callers in both sheets
- **What:** A table id that is not a table id and an attribute that is not an attribute select whole alternate code paths.
- **Why it matters:** The sentinels defeat reasoning about parameter meaning and force each method to un-overload its own arguments; `ROLL_SCOPES` already names these rolls as first-class values.
- **Direction:** Add explicit entry points — `rollPanic()`, `rollDamage(weapon)`, `rollRestSave()` — sharing the internal pipeline, keeping the old signatures as thin delegating wrappers for shipped macros. Pairs with U4.
- **Resolution (2026-08-13):** `CheckKind` (R0) and the named verbs `rollStat`/`rollWeapon`/`rollPanic`/`rollRestSave` on `documents/actor.ts` and `api.ts` (R3/R4) replace every sentinel; `attribute === 'damage'`/`'restSave'` are gone, and `WeaponOptions.roll` is its own typed field.

#### F15. Anemic Item, all weapon behaviour on the actor — Feature Envy — Major `[cross-cutting] [done]`
- **Where:** `module/item/item.js:5-32`; `module/actor/actor.js:1196-1222, 2035-2109`; acknowledged by the warning comment at `module/ui/actor/items.js:59`
- **What:** Ammo accounting, reload, and description-to-chat live on `MothershipActor`, reaching into `weapon.system.*` and mutating a duplicated snapshot the UI must deliberately hand over as source data.
- **Why it matters:** The actor knows every field of the weapon's ammo model, the item class knows nothing, and the "rollCheck mutates the weapon it is handed" contract is fragile enough that a UI-layer comment exists to warn about it.
- **Direction:** Give `MothershipItem` `fire()`/`reload()` methods that update themselves; have the actor ask the item (Tell-Don't-Ask).
- **Resolution (2026-08-13):** `documents/item.ts` owns `fire()`/`reload()`/`toChat()`; the actor asks the item (R1).

#### F16. Dead code: unreachable statements, uncalled methods, vestigial branches — Lava Flow — Minor `[local] [done]`
- **Where:** `module/actor/actor.js:579-590` (`getRollTableData`, never called), `:755-763, 1524-1532, 1850-1853` (statements after `return`, including the Dice-So-Nice waits), `:2159-2268` (`takeRadiationDamage`/`takeCryoDamage`, zero callers repo-wide), `:609-610` (variables never set)
- **What:** Several methods and branches are unreachable or reference cut content.
- **Why it matters:** Dead paths — especially the post-`return` DSN waits, which look intentional — mislead readers about what runs.
- **Direction:** Delete the unreachable statements and uncalled methods; if radiation/cryo return with the Warden's manual, they live on the archive branch with the rest.
- **Resolution (2026-08-13):** the dead code died with `actor.js`; radiation/cryo damage had zero callers and were not carried into the remake (R5 deletion).

#### F18. fromIdUuid's null result is consumed unchecked — Swallowed failure — Minor `[cross-cutting] [done]`
- **Where:** `module/mosh.js:473-594`; consumed at `module/actor/actor.js:641-648, 1874`
- **What:** The resolver returns `null` on any miss and `rollTable`/`modifyItem` immediately dereference `.name`/`.type` on the result.
- **Why it matters:** A stale table id in a setting or macro surfaces as `Cannot read properties of null` deep in a roll instead of "table not found".
- **Direction:** Fail loudly (`ui.notifications`) on `null` at the callers; prefer storing full UUIDs so the scan fallback can retire (RC8).
- **Resolution (2026-08-13):** `lookup()` returns a `LookupResult`, and every caller checks `.found` before reading; `notifyMiss` is the one failure path (R4a).

#### F19. The enrichment step rewrites Foundry Roll internals — Inappropriate Intimacy — Major `[local] [done]`
- **Where:** `module/actor/actor.js:212-233` (`die.result = 0`), `:393-395` (`enrichedRollResult._total = …`)
- **What:** `parseRollResult` mutates the evaluated `Roll`'s die results and private `_total` in place, and that object is then persisted via `toMessage`.
- **Why it matters:** It depends on undocumented `Roll` internals a Foundry bump can break silently, and the stored chat roll no longer matches what the dice showed.
- **Direction:** Compute the kept value and zero-based translation into the enrichment record without touching the `Roll`; render the adjusted number from the template.
- **Resolution (2026-08-13):** `rolls/resolve.ts` reads an `EvaluatedRoll` through readonly interfaces and returns a new `Outcome` record; nothing writes back into the `Roll` (R0).

#### F20. Localization doubles as a data table with a silent fallback — fail-quietly — Minor `[cross-cutting] [done]`
- **Where:** `module/actor/actor.js:118-140`; data-lookup uses at `:1268, 1423`
- **What:** `getFlavorText` returns its argument when the lang key is missing, and the wound-effect flow uses lang entries to map wound tokens to macro-link strings.
- **Why it matters:** A renamed key degrades invisibly into raw token text in chat, and translators can break game links.
- **Direction:** Lang files for prose only; move the wound-token → macro map into a code constant; warn on a genuinely missing key.
- **Resolution (2026-08-13):** the wound-token map is `checks/damage.ts`'s `WOUND_EFFECTS` and `chat/cards.ts`'s `TABLE_FLAVOR`, both code constants; lang files carry prose only (R2/R3).

#### F21. Rulebook constants embedded inline — Magic Numbers — Minor `[cross-cutting] [done]`
- **Where:** `module/actor/actor.js:182` (doubles set), `:246-270, 410, 511` (auto-fail `90` in ten comparisons), `:634` (`1d20` panic die), `:697` (panic result `19`), `:69` (Strength/10 capacity), `:186-192` (`999` sentinels)
- **What:** The PSG's crit, auto-fail, panic, and encumbrance numbers appear as bare literals at every use site.
- **Why it matters:** The ≥90 rule alone is written ten times; errata or a house-rule setting means a scavenger hunt.
- **Direction:** Hoist into named constants in a `rules.js` beside `ROLL_SCOPES`; let the crit-highlight loop reuse the die-picker's success predicate.
- **Resolution (2026-08-13):** `rules.ts` names every PSG constant once — `AUTOFAIL_AT`, `CRIT_DOUBLES`, `PANIC_DIE`, `WOUND_ROLLOVER`, `XP_PIPS`, `STR_CAPACITY_DIVISOR` among them (R0).

#### F22. Creature rolling Panic result 19 crashes on missing class — Null dereference — Minor `[local] [done]`
- **Where:** `module/actor/actor.js:697-703` (unguarded `this.system.class.value`; contrast the guard at `:121`)
- **What:** The android heart-attack substitution reads `system.class.value` without the type check `getFlavorText` performs; creatures have no `class` in their schema.
- **Why it matters:** `initRollTable` runs for any controlled token, so a creature landing on panic 19 throws mid-message.
- **Direction:** Route the android decision through one guarded helper — or the class item's `robotic` flag per F13.
- **Resolution (2026-08-13):** `isRobotic` in `tables/tables.ts` answers `false` for any non-character actor instead of dereferencing a field creatures do not have; `test/e2e/remake.spec.ts`'s Panic Check spec exercises the path (R2).

#### F23. chooseSkill builds its list by placeholder string surgery — Poor Man's Templating — Minor `[local] [done]`
- **Where:** `module/actor/actor.js:907-958`
- **What:** A `[RADIO_*]` placeholder block is cloned per skill with chained `replace` calls, injecting `item.name` as a raw DOM id and user-editable `system.description` HTML unescaped, beside hand-tuned dialog-height pixel math.
- **Why it matters:** A second, worse templating system beside the Handlebars partial the same dialog already loads; rich-text descriptions can smuggle markup into the dialog.
- **Direction:** Move the row into the existing `choose-skill-dialog` template and pass the skill array as data.
- **Resolution (2026-08-13):** `dialogs/ChooseSkill.svelte` renders the row list as markup, not string surgery; descriptions arrive pre-enriched (R3).

#### F25. _deriveCharacter and _deriveCreature share three verbatim blocks — Duplicated Code — Minor `[local] [done]`
- **Where:** `module/actor/actor.js:23-57` vs `:76-110`; defensive `??=` at `:43, 93, 99`
- **What:** The armor, netHP, and bleeding derivations are copy-pasted between the two type methods, and both re-default fields the schemas now guarantee.
- **Why it matters:** An armor-stacking fix must land twice; the `??=` guards are pre-DataModel fossils implying the schema might not provide the field.
- **Direction:** Extract the shared blocks into private helpers; drop the guards (`test/derive-character.test.ts` covers the behaviour).
- **Resolution (2026-08-13):** `deriveArmor`/`deriveNetHP`/`deriveBleeding` in `documents/actor.ts` are shared functions `_deriveCharacter` and `_deriveCreature` both call; `test/derive-creature.test.ts` asserts the sharing (R4a).

#### F26. Persistent console.log narration throughout the pipeline — Debugging Leftover — Nit `[cross-cutting] [done]`
- **Where:** `module/actor/actor.js` (37 occurrences), `module/mosh.js` (10 — see RC12)
- **What:** Every roll, dialog exit, and flavor lookup logs one to three lines, including the whole enriched roll object.
- **Direction:** One namespaced debug channel gated on a flag; delete the narration.
- **Resolution (2026-08-13):** `debug.ts` is the one gated channel; the narration is gone (R0–R4, same fix as RC12).

## The UI layer (`module/ui/**`)

#### U1. Character and creature sheets duplicate ~300 lines of rows and tabs — Copy-and-Paste Programming — Critical `[cross-cutting]`
- **Where:** `module/ui/actor/CharacterSheet.svelte:269-568` vs `module/ui/creature/CreatureSheet.svelte:254-544`
- **What:** The five row snippets (`armorRow`, `gearRow`, `skillRow`, `conditionRow`, `weaponRow`), the items/skills/weapons tab panels, the XP-track block, and the helper closures are byte-for-byte copies — only `ItemPanel`'s frame is genuinely shared — and the copies have already diverged once (the creature's weapon handlers thread `swarmDamage`; the character's do not).
- **Why it matters:** Every column, control, or roll change is made twice and verified twice; silent divergence is how the swarm difference will accrete accidental siblings.
- **Direction:** Promote the row snippets and repeated tab panels into `parts/sections/`, leaving each sheet its genuinely different header and the swarm hook.

#### U2. Six shells hand-copy the mount-once lifecycle — Missing Abstraction — Major `[cross-cutting]`
- **Where:** `module/ui/item/ItemSheetApp.js:52-79`, `actor/CharacterSheetApp.js:84-109`, `creature/CreatureSheetApp.js:93-118`, `creature/CreatureSettingsApp.js:32-55`, `generator/GeneratorApp.js:41-63`, `settings/RolltableConfigApp.js:72-93`
- **What:** The `#component/#root/#store` fields, mount-once `_renderHTML`, `_replaceHTML`, and `_preClose` unmount repeat near-verbatim in six files, with per-file drift (`flushSync` in two, `app` prop in one, `store.refresh` arity varying).
- **Why it matters:** The lifecycle is the one place a mistake leaks components or Svelte state, and the contract must stay correct in six places as Foundry's render pipeline evolves.
- **Direction:** Extract a `SvelteApplicationMixin(Base)` owning root/mount/refresh/unmount, with `COMPONENT`, `_context()`, and a needs-flush flag as the subclass surface.

#### U3. Actor-shell `_context()` and UUID resolution are duplicated pairwise — Duplicated Code — Major `[cross-cutting]`
- **Where:** `CharacterSheetApp.js:57-78` vs `CreatureSheetApp.js:59-82`; `ClassSheetApp.js:21-29` vs `SkillSheetApp.js:17-27`; child-window positioning copied between `generateCharacter` and `configureCreature`
- **What:** The enrich helper, `hideWeight` read, and item projection are copied between the actor shells; the keyed `fromUuid` resolver is copied between the class and skill shells.
- **Why it matters:** Fixes such as the creature shell's "AppV1 never enriched notes" repair must be discovered per copy.
- **Direction:** Fold shared context-building into the mixin or a small `actor-context.js`; export the UUID resolver from one module.

#### U4. Every roll call threads a seven-slot positional API of nulls — Long Parameter List — Major `[cross-cutting] [done]`
- **Where:** `CharacterSheet.svelte:86-110`, `CreatureSheet.svelte:78-116`, against `actor.js:1100`
- **What:** Components call `actor.rollCheck(null, 'low', key, null, null, null)` and five variants, each caller memorizing which of seven positions means what.
- **Why it matters:** The UI is coupled to the least legible legacy signature in the system; every new call site is a fresh chance to transpose arguments.
- **Direction:** Give the actor intention-revealing wrappers — `rollStat(key)`, `rollSkill(id)`, `rollWeapon(id, {damageOverride})` — with `rollCheck` as the compatibility layer beneath (pairs with F14).
- **Resolution (2026-08-13):** `documents/actor.ts`/`api.ts` grew the named verbs (R4), and both actor sheets call them — `actor.rollStat(key)`, `actor.rollSkill(id)`, `actor.rollWeapon(id, {roll, damage})`, `actor.rollPanic()` — with no `rollCheck(null, …)` call left anywhere in `module/ui/` (R5's call-site swap). `rollCheck`'s legacy shape survives only in `api/legacy.ts`, for macros already imported into worlds.

#### U5. Game rules live inside components — Business Logic in the Presentation Layer — Major `[cross-cutting] [done]`
- **Where:** `CreatureSheet.svelte:96-102` (swarm dice scaling), `CreatureSettings.svelte:18-31` (swarm-toggle stat rewrite), `CharacterSheet.svelte:90-93` + `CreatureSheet.svelte:82-85` (XP clamp), `actor/items.js:62` (`RANK_BONUS`, shadowing the schema default at `item-models.js:71`)
- **What:** Swarm damage scaling, the swarm stat rewrite, XP bounds, and the skill-rank bonus table are Mothership rules encoded in the view.
- **Why it matters:** Rules in components are invisible to the vitest tier, unreachable from macros and the API, and (per U1) get copied per sheet.
- **Direction:** Move each onto the owning document; let components call them.
- **Resolution (2026-08-13):** all four sites moved at R7. `swarmDamage(itemId)`, `setSwarm(enabled)` and `stepXp(delta)` are methods on `documents/actor.ts`, unit-tested in `test/actor-document.test.ts`; the sheets call them and hold no arithmetic. `ui/actor/items.js` reads `rankBonus()` from `rules.ts` — its own `RANK_BONUS` table is gone.

#### U6. Hard-coded English throughout the newer windows — i18n leak — Major `[cross-cutting]` [partial]
**Resolution (2026-08-13):** R7's dialog conversions keyed every string inside the five converted dialogs and retired the `generator/dialogs.js` and `actor/items.js` sites this finding cited. Remaining for S9: `Generator.svelte`'s button literals, `CreatureSettings.svelte`'s "Swarm", `createItem`'s `New ${type}`, the XP milestone captions, and the RolltableConfig strings.
- **Where:** `Generator.svelte:188,221,240,253`; `RolltableConfigApp.js:17-35,58`; `RolltableConfig.svelte:43`; `CreatureSettings.svelte:45`; `CreatureSettingsApp.js:25`; `actor/items.js:57,66-104`; `generator/dialogs.js:98`; `generator/draft.svelte.js:108,194`; the XP milestone captions in both sheets
- **What:** Roughly a dozen sites bake English into markup and dialogs while a `pt-BR` translation ships. (Same theme as RC14 on the settings side.)
- **Why it matters:** Portuguese users get a half-translated system; each leak is invisible until someone plays in the other locale.
- **Direction:** Route every user-visible literal through `localize`/`format` with new `Mosh.*` keys.

#### U7. `label for=` never matches an input id — a11y: broken label association — Major `[cross-cutting]`
- **Where:** `parts/Field.svelte:27`, `parts/CheckField.svelte:6`, `parts/MinMaxField.svelte:27`, `parts/sections/ArmorBlock.svelte:23`
- **What:** Labels set `for={name}` but the inputs carry only `name`, no `id`, so the association resolves to nothing.
- **Why it matters:** Clicking a label focuses nothing and assistive technology announces unlabelled fields on every sheet built from these primitives.
- **Direction:** Have the field primitives stamp `id={name}` (or nest the input in the label) — one fix per primitive covers every sheet.

#### U8. Everything clickable is a div, span, img, or bare anchor — a11y / Reinventing `<button>` — Major `[cross-cutting]`
- **Where:** `parts/activate.js` (the enabler); `parts/ItemControl.svelte`, `parts/RollableStat.svelte`, `parts/ItemCell.svelte`; `Generator.svelte` (five `svelte-ignore a11y_*` suppressions); `RolltableConfig.svelte:36-44`
- **What:** The layer contains no native `<button>`; every control is a non-interactive element given `role="button"`, `tabindex`, and the hand-rolled Enter/Space shim, with lint suppressions where even that fails.
- **Why it matters:** `onActivate` re-implements half of what `<button>` provides free, and the suppressed generator images show the pattern fighting the compiler — squarely the queued S9 debt.
- **Direction:** Restyle `<button type="button">` under the existing `mosh.css` classes inside the primitives, which deletes `onActivate` and the suppressions at their source.

#### U9. Right-click decrement has no keyboard equivalent — a11y: keyboard parity — Minor `[cross-cutting]`
- **Where:** `actor/items.js:11-15` (`stepBy`), `parts/ItemCell.svelte:22-30`
- **What:** The +/- cells increment on click/Enter/Space but decrement only on `contextmenu`, which no keyboard path produces.
- **Direction:** Map Shift+Enter or arrow keys to the decrement in the interactive cell primitive.

#### U10. Three modules build dialog UI as concatenated HTML strings — Stringly Typed UI — Major `[cross-cutting] [done]`
- **Where:** `generator/dialogs.js:49-142`, `class/stat-option.js:15-22`, `actor/items.js:69-86`
- **What:** DialogV2 content is assembled by template literals, with escaping hand-rolled in one file (`esc`) and absent in the other two, in a codebase whose UI is otherwise Svelte.
- **Why it matters:** String-built markup gets no compile checking and re-solves escaping per file — the failure mode the Svelte migration exists to end. (`actor.js:907` is the worst offender; see F23.)
- **Direction:** One helper that mounts a small Svelte component as DialogV2 content; delete `esc`.
- **Resolution (2026-08-13):** the roll dialogs this finding named worst (`actor.js:907`, merged as F23) went at R3 — `dialogs/svelte-dialog.ts` plus six Svelte components. R7 took the last three: `generator/dialogs.js` (`SkillPicker`/`BonusOption`/`StatChoice`), `ui/actor/items.js`'s `promptNewSkill` (`NewSkill.svelte`), and `ui/class/stat-option.js` (`StatOption.svelte`), all mounted through the same helper. `esc` died with the last template literal, and `test/ui-dialogs.test.ts` asserts what each one answers — none of it was reachable from a test before.

#### U11. Tab markup claims ARIA roles it does not complete — a11y — Minor `[local]`
- **Where:** `parts/Tabs.svelte:15-31`, `parts/TabPanel.svelte`
- **What:** Anchors carry `role="tab"`/`aria-selected` but there is no `tablist`, no `tabpanel`/`aria-labelledby`, no arrow-key navigation.
- **Direction:** Complete the pattern inside the two primitives — one fix covers every sheet.

#### U12. Dead `app` prop on the item-sheet mount — Dead Code — Minor `[local]`
- **Where:** `module/ui/item/ItemSheetApp.js:63`
- **What:** The shell passes `app: this` but no item component reads it.
- **Direction:** Drop the prop; `RolltableConfigApp`, the one window needing `close()`, already passes it explicitly.

#### U13. Component and shell import each other — Circular Dependency — Minor `[local]`
- **Where:** `settings/RolltableConfig.svelte:2` ↔ `settings/RolltableConfigApp.js:2`
- **What:** The App imports the component while the component imports `ROLLTABLE_GROUPS` back from the App.
- **Direction:** Move `ROLLTABLE_GROUPS`/`ROLLTABLE_KEYS` into a `settings/rolltable-groups.js` both import.

#### U14. XP clamps to 16 on a 15-pip track — Off-By-One — Minor `[local] [done]`
- **Where:** `CharacterSheet.svelte:91` and `CreatureSheet.svelte:83` (clamp `Math.min(16, …)`) vs `count={15}` at `CharacterSheet.svelte:340`
- **What:** The stepper allows a stored 16 that renders identically to 15 — an invisible extra state where right-click appears to do nothing on the first press.
- **Direction:** Make the clamp and pip count one named constant on the document side (with U5).
- **Resolution (2026-08-13):** `actor.stepXp(delta)` clamps to `rules.ts`'s `XP_PIPS`, and both sheets draw `count={XP_PIPS}` — the clamp and the track are the same number, so the sixteenth state cannot exist (R7).

#### U15. Ability descriptions render raw, unenriched HTML — Inconsistent Handling — Minor `[local]`
- **Where:** `CreatureSheet.svelte:204` (`{@html ability.system.description}`)
- **What:** Every other rich-text field goes through `enrichHTML`; the creature's ability blurbs are injected stored, so `@UUID` links and inline rolls never resolve there.
- **Direction:** Enrich ability descriptions in `CreatureSheetApp._context()` beside `description`/`biography`/`notes`.

#### U16. Row/header flex-grow constants are hidden couplings — Magic Numbers — Minor `[cross-cutting]`
- **Where:** `CharacterSheet.svelte:272` (header `grow: 2.5`) vs `:380` (row `grow={2.55}`); `:288` (`1.5`) vs `:430` (`1.54`); same pairs in `CreatureSheet.svelte`
- **What:** Column alignment depends on nearly-equal magic constants split between an `ItemPanel` headers array and its row snippet, per sheet.
- **Direction:** Let each taxonomy's column spec (label, grow) live once and drive both the header and the row cell (falls out of U1).

#### U17. `at()` re-implements `foundry.utils.getProperty` — Reinventing the Wheel — Nit `[local]`
- **Where:** `CharacterSheet.svelte:84`
- **Direction:** Call the Foundry utility or precompute the five identity values in `_context()`.

#### U18. `$derived` wraps constants; sibling sheets disagree — Needless Complexity — Nit `[local]`
- **Where:** `CharacterSheet.svelte:34,46-52` vs `ClassSheet.svelte:23-30`
- **What:** A never-changing document reference and static localized arrays are wrapped in `$derived` on two sheets and plain `const` on others.
- **Direction:** Reserve `$derived` for reads of `store.current`; make constants `const`.

#### U19. Stale-values window on the settings form — Mount-Once Without Refresh — Nit `[local]`
- **Where:** `settings/RolltableConfigApp.js:72-80`
- **What:** `values` is read from `game.settings` once at mount; an external settings change never reaches the open window — a quiet exception to the layer's own refresh-on-render convention.
- **Direction:** Pass values through a refreshable store as the document sheets do, or note the exception where the pattern is defined.

#### U20. `CircleStat` ships with no consumer — Speculative Generality — Nit `[local] [done]` ✓ closed
- **Where:** `parts/CircleStat.svelte`, kept alive only by `test/ui-parts.test.ts:23`
- **What:** The primitive is imported by nothing but its own test.
- **Direction:** Delete it and its spec, or annotate which queued conversion claims it.
- **Closed 2026-08-15, first branch:** deleted with its three specs in the DS8 stat-display
  unit at Mark's direction; git history recovers it if the Shipbreaker tier returns.

## The content pipeline and tooling (`content/`, `scripts/`)

#### C1. Death Save macro reads a settings namespace that no longer exists — Shipped bug via Stringly Typed code — Critical `[local] [done]` ✓ verified
- **Where:** `content/books/psg/macros.ts:827,833,839`
- **What:** The Death Save dialog's three buttons call `game.settings.get("mosh","table1eDeath")`, but every setting registers under `mothershiprpg` (`module/settings.js:146`) — `settings.get` throws and all three buttons are dead.
- **Why it matters:** A shipped macro is broken at the exact moment a character is dying, and no tier catches it: `npm run check` sees a string, the integrity checks see no `@UUID`, no e2e spec clicks these buttons.
- **Direction:** Fix the namespace, then add a build-time guard that greps emitted macro commands for `settings.get('<ns>','<key>')` pairs and verifies both against the registered set.
- **Resolution (2026-08-13):** the Death Save macro's three buttons roll the death table through the new API; no `"mosh"` namespace read remains (R4b, divergence C1).

#### C2. Wound Roll macro embeds bare document ids every integrity guard is blind to — Magic Strings — Major `[local] [done]`
- **Where:** `content/books/psg/macros.ts:1255,1268,1281,1294,1307`
- **What:** The radio values hard-code five wound-table `_id`s inside HTML strings, bypassing the id registry; `checkReferences`' regex requires a `Compendium.` prefix, so these are checked nowhere.
- **Why it matters:** The subsystem's promise is that no shipped reference can dangle; these are the one class that can, and they break silently.
- **Direction:** Have the loader inject them the way `documents.ts` already injects condition ids, or read them from the `table1e*` settings at click time like the panic macro does.
- **Resolution (2026-08-13):** the Wound Roll macro is `game.mothershiprpg.promptWound()`; no table id appears in a macro string (R4b, divergence C2).

#### C3. 1,346 lines of JavaScript the type-checker never sees — Stringly Typed Logic at scale — Major `[cross-cutting] [done]`
- **Where:** `content/books/psg/macros.ts` (whole file)
- **What:** Macro bodies are unchecked JS-in-TS strings: the targeting boilerplate is copy-pasted into ~10 commands (restating what `initModifyActor` already does), three "set field to N" macros each inline a 35-line function with dead parameters and comments narrating the wrong field, and five hotbar dialogs repeat the same DialogV2+HTML scaffold.
- **Why it matters:** C1 and C2 are this smell's concrete cost — bugs in strings survive every static tier — and each new book multiplies the surface.
- **Direction:** Grow the typed-record approach `ConditionMacro` proves out: typed shapes (roll-check macro, set-field macro, chooser dialog) from which the loader generates commands, and add the missing `game.mothershiprpg` entry points so bespoke bodies shrink.
- **Resolution (2026-08-13):** `macros.ts` fell from 1,346 lines to 490 at R4b's typed-record generation, and to 360 once R5 turned the last hand-written hotbar dialogs into one-liners; the stat/save/table/modify families generate from `VARIANTS`/`WOUND_TABLES`, not by hand.

#### C4. Nothing verifies the committed `packs/_source/` matches the catalogs — Stale Generated Artifact — Major `[local] [done]`
- **Where:** `test/content-psg.test.ts:22` (builds to a tmpdir); `scripts/build-content.ts`
- **What:** The tests prove the build is deterministic and correct, but nothing diffs a fresh build against the committed `packs/_source/**`, so editing a catalog and forgetting `npm run content` ships stale output.
- **Why it matters:** "The book is the source" is enforced only up to the commit boundary.
- **Direction:** One vitest spec: run `build()` in memory and byte-compare against `packs/_source` — `canonical()`'s determinism makes this strict equality.
- **Resolution (2026-08-13):** `test/content-freshness.test.ts` (R6) runs `build()` in memory and byte-compares every emitted file against the committed `packs/_source/**`.

#### C5. `npm run test:e2e` rebuilds packs but never propagates them to the harness — Half-Automated Process — Major `[local] [done]`
- **Where:** `package.json` (`"test:e2e": "npm run build && ./scripts/packs.sh pack && playwright test"`); `scripts/setup-test-env.ts:26-41`
- **What:** The script packs into the repo's `packs/`, but the harness clones the live Foundry Data dir, whose packs date from the last manual `npm run setup` — the script performs two thirds of the documented three-step sequence and omits the step that makes packing effective.
- **Why it matters:** CLAUDE.md records this exact trap costing four e2e cycles, yet the npm script still embodies it; a green e2e run can be testing last week's packs.
- **Direction:** Insert `npm run setup` into the script (or teach `setup-test-env.ts` to source packs from the repo) so the one command is the whole sequence.
- **Resolution (2026-08-13):** `package.json`'s `test:e2e` now runs `build → packs.sh pack → npm run setup → playwright test` (R6).

#### C6. What ships is listed in three places — Duplicated Knowledge — Major `[cross-cutting]`
- **Where:** `scripts/setup.ts:26` (`LINKED`), `scripts/deploy.ts:17-18` (`FILES`/`DIRS`), `.github/workflows/release.yml:49-53` (zip list); the LevelDB-cruft filters in all three
- **What:** The ship manifest and the LOCK/LOG exclusion rules each exist in three hand-maintained copies, bound only by comments.
- **Why it matters:** deploy.ts's own header states the stake — drift means `npm run deploy` stops rehearsing the release.
- **Direction:** One exported `scripts/ship-manifest.ts` consumed by setup and deploy, with a test asserting release.yml's zip arguments name the same entries.

#### C7. Two divergent Foundry-Data-dir detectors — Copy-and-Paste Programming — Minor `[cross-cutting]`
- **Where:** `scripts/foundry-data.ts:9-24` vs `scripts/setup-test-env.ts:26-41` (which also re-declares `SYSTEM_ID`)
- **What:** `setup-test-env.ts` reimplements `detectFoundryData()` with a different candidate list — macOS-only paths, no win32/XDG branches.
- **Why it matters:** On Linux the harness and `npm run setup` look in different places, so they can clone from and install to different Data dirs.
- **Direction:** Import `detectFoundryData` and `SYSTEM_ID` from `foundry-data.ts`, folding the extra candidate into the shared list.

#### C8. The sign-preserving slug lives in TypeScript and in Python — Duplicated Algorithm — Minor `[cross-cutting]`
- **Where:** `scripts/content/slug.ts:22-32` (`fileSlug`) vs `scripts/packs.sh:56-63` (`name_files`); dead `slug()` at `slug.ts:6-17`
- **What:** The unpack path re-implements `fileSlug` in embedded Python, with only comments asserting agreement; `slug()` itself has no importers.
- **Why it matters:** Drift makes `packs.sh unpack` rename every file the pipeline wrote, churning the committed tree.
- **Direction:** Delete `slug()`; pin agreement with a test feeding fixture names through both implementations.

#### C9. The macro cross-product is unrolled by hand — DRY (mechanical data) — Minor `[local] [done]`
- **Where:** `content/books/psg/macros.ts:31-752`
- **What:** ~50 of the 77 triggered macros are a cross-product — {9 stats/saves, 6 tables} × {plain, [+], [-]} — each record differing by two tokens, spanning ~700 lines.
- **Why it matters:** Every correction to the call shape (C1 shows one) is an N-site edit; ids are pinned in `ids.json`, so a generator loop emits byte-identical documents at no risk.
- **Direction:** Generate the systematic records from the roll/scope lists, keeping only the bespoke macros as literals.
- **Resolution (2026-08-13):** the stat/save × advantage and wound-table families are generated from `VARIANTS`/`WOUND_TABLES` in `content/books/psg/macros.ts`, not unrolled by hand (R4b).

#### C10. `MACRO_LABEL` restates macro names with a silent fallback — Quiet Degradation — Minor `[local] [done]`
- **Where:** `scripts/content/books/psg/documents.ts:10-18,34`
- **What:** Link labels for condition descriptions are a second hand-written map, and a missing key falls back `?? id`, shipping a raw contentId as player-facing prose.
- **Why it matters:** The pipeline elsewhere fails loudly on every join; this one degrades invisibly into published text.
- **Direction:** Derive the label from the macro record's own `name`; throw on a miss.
- **Resolution (2026-08-13):** `scripts/content/books/psg/documents.ts` renders each action's label through `formatAction`/`actionLabel` at read time; `MACRO_LABEL` is gone (R4b).

#### C11. Foundry field semantics are hand-emulated in the stubs — Shadow Implementation risk — Minor `[local]`
- **Where:** `scripts/model-schema.ts:17-57` (notably the `blank`/`choices` interplay)
- **What:** The stubs encode behavioural claims about Foundry that the model guard's verdicts depend on; an unknown field class fails loudly, but a semantics change in an upgrade would skew the verdicts silently.
- **Why it matters:** The guard's authority rests on the emulation staying faithful, and nothing exercises it against a real Foundry.
- **Direction:** Pin the assumptions with one e2e probe document asserting Foundry's clean/validate behaviour matches the stub's.

#### C12. `emit()` returns a placeholder the caller must patch — Temporarily Invalid Object — Nit `[local]`
- **Where:** `scripts/content/emit.ts:104` (`filename: ''`), patched at `pipeline.ts:66-70`
- **Direction:** Compute the filename inside `emit()` (it has `record.name`), or drop the field and let the pipeline carry it.

## The test architecture (`test/`, `test/e2e/`)

#### T1. The macro-facing half of the actor API is tested by nothing — test-coverage — Critical `[cross-cutting] [done]`
- **Where:** `module/actor/actor.js:1536-2394` (`modifyActor`, the damage takers, `chooseCover`, `printDescription`)
- **What:** Roughly 850 lines reachable only through `game.mothershiprpg.*` from the 104 shipped macros have zero coverage in either tier — `compendiums.spec.ts` inspects macro *text* but never executes one, and no unit spec touches these methods.
- **Why it matters:** This is the declared public API the shipped packs depend on; a regression in `modifyActor`'s field addressing ships green through both tiers. Note that most of the bug list — C1, RC1, RC3, RC5, F2, F4, F5, F22 — lives on exactly this untested surface.
- **Direction:** One e2e spec per macro family executing a real pack macro against a `__e2e_` actor and asserting the stored result; pull `modifyActor`'s pure arithmetic out where vitest can reach it.
- **Resolution (2026-08-13):** the macro-facing surface is decomposed into unit-tested services (`mutate.test.ts`, `checks.test.ts`, `tables.test.ts`, `api.test.ts`, `api-legacy.test.ts`, …), and `test/e2e/remake.spec.ts` executes one real compendium macro per verb family (`initRollCheck`, `initRollTable`, `initModifyActor`, `initModifyItem`) against a `__e2e_` actor, reading the stored result back (R5).

#### T2. Roll resolution is covered only to the dialog boundary — test-coverage — Major `[local] [done]`
- **Where:** `module/actor/actor.js:1100-1535` (`rollCheck`), `:593-775` (`rollTable`), `:806-1099` (the dialogs)
- **What:** The parsers' unit suites prove the math exhaustively, but the ~600 lines of orchestration around them — target selection, skill bonus, crit flavour, the damage chain, the chat card — are asserted only up to "the dialog opened". Only ~20% of `actor.js` (≈515 lines: the parsers, `_deriveCharacter`, the condition resolvers) is reachable by vitest as stubbed; the rest hits `game.*`/`ChatMessage`/`DialogV2`/`Roll` on entry, so the ceiling will not move without extraction or e2e.
- **Why it matters:** The seam where a correct parse becomes a wrong chat message is exactly the code no tier observes.
- **Direction:** Extend the condition-modifiers e2e pattern past the button click — assert the resulting ChatMessage and actor writes for one success, one crit, one panic path.
- **Resolution (2026-08-13):** `test/e2e/remake.spec.ts` asserts the posted `ChatMessage` for a Strength Check that succeeds, one that crits, and a Panic Check that fails — the three paths this finding asked for (R5).

#### T3. Page-object logic is copy-pasted across the e2e specs — Duplicated Code — Major `[cross-cutting]`
- **Where:** `character-sheet.spec.ts:9-66`, `creature-sheet.spec.ts:9-74`, `class-sheet.spec.ts:10-57`, `skill-sheet.spec.ts:10-67`, `creature-settings.spec.ts:40-58`, `actor-generator.spec.ts:64-90`
- **What:** `stored()` exists in six near-identical copies, `dropOn()` in three, `addItem`/`itemField`/`open` and the cleanup `afterEach` in five to eight, while `fixtures/foundry-clients.ts` owns only login; copies have already drifted (some `afterEach` blocks close windows, most do not).
- **Why it matters:** Every change to the cleanup contract or drop protocol is an eight-file edit.
- **Direction:** Move `stored`/`itemField`/`dropOn`/`addItem` and a shared `cleanupE2eDocuments` into the fixtures file, ideally as an auto-`afterEach` fixture.

#### T4. Fixed sleeps stand in for negative-case settling — nondeterminism — Minor `[local]`
- **Where:** `class-sheet.spec.ts:137,148`, `skill-sheet.spec.ts:156,177`
- **What:** Four `waitForTimeout(500)` calls give a rejected drop "time to have been a no-op" before asserting nothing changed.
- **Direction:** Leave an observable completion marker (a counter, or await the update hook) and poll for that.

#### T5. Pack counts are hand-maintained in two tiers while a third derives them — Duplicated Knowledge — Minor `[cross-cutting]`
- **Where:** `e2e/compendiums.spec.ts:32-42` vs `content-psg.test.ts:30-45` vs `e2e/global-setup.ts:23-33`
- **What:** `global-setup` derives expected pack sizes from `packs/_source`; `compendiums.spec` restates the same nine counts by hand.
- **Direction:** Keep the book-count pin in `content-psg.test.ts` (the transcription guard); let `compendiums.spec` reuse the derivation.

#### T6. field-usage's "reader" is a whole-corpus substring match — vacuous assertion risk — Minor `[local]`
- **Where:** `test/field-usage.test.ts:29-32,93`
- **What:** A schema leaf counts as read if `system.<path>` appears anywhere in the concatenated corpus — including in a comment or another type's sheet.
- **Direction:** Acceptable as a ratchet; if it starts rubber-stamping, strip comments and scope shared paths per type.

#### T7. Generator choreography picks skills by option index — fragile test — Minor `[local]`
- **Where:** `e2e/actor-generator.spec.ts:116,163,176,205`
- **What:** `selectOption(…, {index: i + 1})` binds the test to the alphabetical order of the 42 shipped skills, against the harness's own stable-selectors convention.
- **Why it matters:** The Warden's book will add skills; a re-ordered dropdown breaks the Expert-unlock step obliquely.
- **Direction:** Select by skill name.

#### T8. `_deriveCreature` has no unit test though it is stub-reachable — test-coverage — Minor `[local] [done]`
- **Where:** `module/actor/actor.js:74-115`; contrast `test/derive-character.test.ts`
- **What:** The creature derivation — including the swarm rule that scales combat by remaining wounds — is unit-untested.
- **Why it matters:** The swarm multiplication is the one derived value with real game consequence on the creature; a sign error survives every tier.
- **Direction:** Clone the `derive-character` pattern — the same `prototype.call` harness works unchanged.
- **Resolution (2026-08-13):** `test/derive-creature.test.ts` covers `_deriveCreature`, including the swarm combat-scaling rule (R4a).

## Clean — checked and genuinely fine

- **The stable-id machinery** (`scripts/content/ids.ts`): collision-checked minting, retirement-with-reason, sorted serialization pinned byte-for-byte by test — exemplary.
- **The guard set** (`model-guard` against the real `defineSchema()`, `checkReferences`, `checkIdPreservation`, `checkSettingsDefaults` with its own self-check) — unusually strong; every guard is proven to *fail* when it should.
- **The catalogs' compile-time joins** — the "TypeScript instead of JSON" bet pays off as designed: misspelled cross-references are compile errors.
- **`packs.sh`** — `set -euo pipefail`, pack list read from `ids.json`, lock guard, slug-collision failure instead of silent overwrite.
- **The e2e boot chain** — staged-then-swapped clones, stale-lock clearing keyed on the port being free, a preflight whose every failure mode names its cause and fix.
- **e2e isolation discipline** — one worker, prefix-based self-healing cleanup, settings restored in `try/finally`, dice unfrozen in `afterEach`, `toObject()` used where derivation would lie.
- **The Foundry stubs are not an inner platform** — `model-schema.ts` records rather than emulates, fails loudly on unknown field classes, and its one reimplemented semantic is cross-checked against real Foundry by `data-models.spec.ts` (C11 asks to widen that check).
- **`document-store.svelte.js`** — the `$state.raw` snapshot with getter access is the right shape; the document stays the single source of truth; zero `$effect` in the entire UI layer.
- **Mount/unmount hygiene** — every shell unmounts in `_preClose`; no leak path found (U2 asks to write the pattern once, not to fix it).
- **`drop-target.js` / `activate.js`** — single implementations with correct teardown (U8 asks to retire `activate.js` for a better reason).
- **The generator draft** — state fully in the runes class, one write in `apply()`; `skills.js` and `table-result.js` are pure and testable.
- **DataModel factories and enums** — `pool`/`stat` composition and the `choices` enums are the model for future schema work.
- **`module/compare.js`** — the comparator table that replaced an `eval`, warned, tested.
- **`system.json`** — id, packs, manifest/download shape all match the repo rules; the nine `documentTypes` are exactly the shipped nine.
- **`game.mothershiprpg` signature stability** — all 104 shipped macro call sites match the current signatures; no drift.
- **No stale `data.*` update paths, no `Actor.create` misuse, no v1 APIs beyond RC2** anywhere in the runtime.
- **`templates/`** — all nine Handlebars files are live; no dead templates.
- **No mystery guests in the unit tier** — every fixture is declared beside its use with its rationale stated.

---

# Part III — Recommendations

> **Superseded in part (2026-08-13):** the owner reframed the conclusion — one good codebase
> containing a legacy mess — and chose a **remake over refactoring**: the legacy core was parked
> and rebuilt as TypeScript services with the PSG book as the spec. The legacy remake landed in
> full (R0–R7; its plan file was deleted 2026-08-15, git history recovers it) and replaced the
> wave sequence below. The themes, target structure, and findings in this document remain the
> evidence base — resolved findings carry `[done]` tags; the open U-series is the live remainder.

## The seven themes behind the 78 findings

1. **One God Object holds the whole game loop** (F1 → F7, F8, F9, F14, F15, T2). `actor.js` is not just long; it is the reason the roll pipeline is untestable, the reason chat styling lives in a dice engine, and the reason every bug on the list survived — vitest cannot reach 80% of it.
2. **Strings carry meaning that types and data should carry** (F11, F12, F13, F14, RC3, RC4, C2, C3, U10). Roll strings re-lexed six ways, dispatch on display names, sentinel arguments, dotted addresses, ids in HTML, macro logic in string literals. Two shipped bugs (C1, C2) are direct costs.
3. **Async is fire-and-forget** (F6, F10, RC12). Promises that never resolve, updates never awaited then read back, seven concurrent writes to one document. Today it mostly works by accident; it is the class of defect that becomes unreproducible flake later.
4. **Duplication sits exactly on the seams that change together** (U1, U2, U3, RC6, F7, F25, T3, C6, C7, C8, C9). Character/creature, flat/rolled, the five macro wrappers, the six shells, the six `stored()` copies, the three ship manifests. Several have measurably drifted already — drift is not hypothetical.
5. **Rules live in the wrong layer** (U5, F21, F20, U14). Swarm math in a component, the ≥90 rule in ten literals, wound-macro links in a translation file. There is no single place a reader can ask "what are the numbers of this game?"
6. **Writes that the platform silently discards** (RC1, and historically the armour-`equipped` incident). The project already built the right antibody (`sheet-bindings`); RC1 shows the same disease on the token schema, outside the guard's reach.
7. **The tests are strong where the code is new and absent where the code is old** (T1, T2, T8). The correlation is perfect: every verified bug lives on the untested inherited surface. Coverage is not a formality here — it is the enabling condition for every refactor this document proposes.

## Target structure

The shape to converge on, preserving every load-bearing signature (`game.mothershiprpg.*`, the actor method names shipped macros call, the dotted-address format):

```
module/
  index.js                 entry: css + init import (unchanged)
  init.js                  hooks/registration only — nothing importable elsewhere
  api.js                   game.mothershiprpg surface + forTargetActors(fn)
  lookup.js                fromIdUuid's replacement (typed, O(1) world lookups)
  rules.js                 named PSG constants: CRIT_DOUBLES, AUTOFAIL_AT=90,
                           PANIC_DIE, XP_PIPS=15, RANK_BONUS, STR_CAPACITY_DIVISOR…
  rolls/
    parse.js               parseRollString + the parse-once roll record (F11)
    resolve.js             parseRollResult minus HTML — pure, unit-tested
  chat/
    cards.js               all chat-card rendering (templates stay Handlebars for now)
  documents/
    actor.js               derivation + thin façades: rollCheck/rollTable/modifyActor
                           delegate inward; rollStat/rollSkill/rollWeapon/rollPanic
                           added as the named entry points (F14/U4)
    item.js                fire(), reload(), toChat() — the item owns its fields (F15)
  ui/                      as today, plus:
    svelte-mixin.js        SvelteApplicationMixin (U2/U3)
    dialogs/               the Svelte-in-DialogV2 helper + converted dialogs (U10/F23)
    parts/sections/        the actor-sheet row/tab sections (U1)
```

Two rules make the split safe: **façades keep their names and signatures** (the macros' contract), and **each extraction lands with the test that was impossible before it** — that is the point of extracting.

## Sequence

**Wave 1 — the bug list, plus the guard that catches its class.** Fix the ten bug-list entries (all `[local]`, each an afternoon or less). Alongside: the e2e spec that executes one macro per family (T1's direction — it would have caught C1, RC3, RC5, F4), the `prototypeToken` assertion (RC1), and C5's one-line fix to `test:e2e` so the harness stops testing stale packs. C4's build-freshness spec is one test and closes a whole failure class.

**Wave 2 — the seams, without moving code.** DialogV2's real promise API for the five broken wrappers (F6); `await` the writes (F10); `forTargetActors` (RC6); the typed dotted-address helper (F12); delete the dead code (F16, RC5, RC9, RC11, U12, C8's dead `slug()`); silence the logs (F26/RC12). These shrink `actor.js` and `mosh.js` before anything moves, and none changes an observable behaviour.

**Wave 3 — the S9 structural work, now evidence-backed.** This audit confirms S9's queued list and sharpens it:
- *The `actor.js` split* → the target structure above; extract `rolls/` first (pure, already spec-pinned by the parser tests), then `chat/`, then item behaviour (F15), then the named roll entry points (F14/U4).
- *The Svelte architecture audit* → its concrete work orders are U1 (sections rows), U2/U3 (the mixin), U10 (Svelte-in-DialogV2), U5 (rules out of components), and the a11y quartet U7/U8/U9/U11 — fixed once in the primitives, inherited by every sheet.
- *`checkJs`* → flip it file-by-file starting with the new small modules (`rules.js`, `rolls/`), where it is nearly free; the audit's stringly-typed findings are exactly the bugs `checkJs` catches.
- *The CSS dissolution* → nothing here contradicts it; U8's restyled buttons are the natural first styles to move into scoped blocks.
- *`template.json` retirement* → unblocked; the equivalence tests are the only consumer, and they can pin against a committed snapshot instead.
- Add to S9 from this audit: the i18n sweep (U6/RC14 — one pass, mechanical), the settings-id generation (RC13), and the macro typed-records (C3/C9), which the Warden's Operations Manual will otherwise multiply.

**What not to do:** no rewrites, no new frameworks, no schema reshaping. The DataModels, the pipeline, the parts layer, and both test harnesses are sound foundations — the work is moving the inherited core onto them.
