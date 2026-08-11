# Foundry API (v14) — quick reference

Everything lives under the `foundry.*` tree. The bare globals still exist but are
`@deprecated since v13 until v16` — don't write new code against them.

**Ground truth is the installed app**, not memory:
`/Applications/Foundry Virtual Tabletop.app/Contents/Resources/app/public/scripts/foundry.mjs`.
Grep it when unsure — that is how the deprecation windows, `BaseSheet`'s real identity, and
the DataModel-vs-`template.json` precedence in this system were all settled.

## Ambient globals (never import)

`game`, `ui`, `canvas`, `CONFIG`, `CONST`, `Hooks`, `foundry`, `Roll`, and the document
classes (`Actor`, `Item`, `Macro`, …). No typings package is installed — this repo's runtime
is unchecked JS (`checkJs: false`).

## What is and is not a global in v14

Confirmed by inspecting the `Object.assign(globalThis, …)` block:

| Still global | Not a global |
|---|---|
| `Application`, `FormApplication`, `Dialog`, `DocumentSheet` (all `@deprecated until v16`) | `duplicate`, `mergeObject`, `getProperty`, `setProperty`, `expandObject` |
| `Actor`, `Item`, `Hooks`, `Roll`, `TextEditor`, `CONFIG`, `CONST` | `renderTemplate`, `loadTemplates`, `Actors`, `Items` |

Use `foundry.utils.*`, `foundry.applications.handlebars.renderTemplate`,
`foundry.documents.collections.Actors`.

## Namespaces

- `foundry.utils` — `mergeObject`, `deepClone`, `duplicate`, `randomID`, `getProperty`,
  `expandObject`, `debounce`, `fromUuid`/`fromUuidSync`.
- `foundry.abstract` — `Document`, `DataModel`, `TypeDataModel`.
- `foundry.data.fields` — schema fields.
- `foundry.applications.api` — `ApplicationV2`, `DialogV2`, `HandlebarsApplicationMixin`.
- `foundry.applications.sheets` — `ActorSheetV2`, `ItemSheetV2`, `BaseSheet`
  (**`BaseSheet` is `HandlebarsApplicationMixin(DocumentSheetV2)`** — a V2 class; extending
  it with AppV1 methods is the bug that broke `ship-macros.js`).
- `foundry.applications.ux.TextEditor.implementation.enrichHTML(...)`.
- `foundry.appv1.api.*` / `foundry.appv1.sheets.*` — the legacy tree this system still uses.
- `foundry.documents.collections` — `Actors`, `Items` (where `registerSheet` lives).

## `game.*`

`game.user`/`game.user.isGM`, `game.users`, `game.actors`, `game.items`, `game.macros`,
`game.settings`, `game.i18n`, `game.packs.get('mosh.<pack>')`, `game.system.id`/`.version`,
`game.world.id`, `game.ready`, and this system's `game.mosh` API object.

## Hooks

- **Lifecycle:** `init` (register settings, document classes, dataModels, sheets) →
  `i18nInit` → `setup` → `ready` → `canvasReady`.
- **Documents:** `create/update/delete{Actor,Item,…}` and `preCreate/preUpdate/preDelete*`
  (return `false` to cancel). This system uses `preCreateActor` to set prototype token
  defaults.
- **Applications:** `render{ClassName}`, `close{ClassName}`.

## Documents, data, flags

`Doc.create(data)`, `doc.update(changes)`, `doc.delete()`;
`create/update/deleteEmbeddedDocuments(name, …)`.

- **Update paths use `system.`** — the `data.` alias was removed in v10. Six updates in this
  system were still writing `data.*` and silently doing nothing.
- **`updateEmbeddedEntity` / `OwnedItem` are long gone** — use `updateEmbeddedDocuments("Item", …)`.
- **Validation is now strict.** With DataModels registered, `Actor.create` with an
  out-of-schema value **returns `undefined`** (it does not throw) and surfaces the error in
  the UI. Nothing half-valid reaches the database.
- `doc.toObject().system` is the stored source; `doc.system` is the live object that
  `prepareDerivedData` has mutated.

## Settings

```js
game.settings.register('mosh', key, { scope: 'world'|'client'|'user', config, type, default, onChange });
game.settings.get('mosh', key);
```

29 are registered in `module/settings.js`. `registerMenu` for config apps (this system uses
it for the rolltable config).

## UI entry points

- `foundry.applications.api.ApplicationV2` (+ `HandlebarsApplicationMixin`, or mount Svelte —
  see `svelte-in-applicationv2.md`). Statics `DEFAULT_OPTIONS`, `PARTS`; lifecycle
  `_prepareContext`, `_renderHTML`, `_replaceHTML`, `_preClose`; `actions` for delegated clicks.
- Dialogs: `foundry.applications.api.DialogV2.wait({...})` — already used throughout.
- Toasts: `ui.notifications.info/warn/error`.
- V1 instances live in `ui.windows`; V2 in `foundry.applications.instances`. Code that walks
  open windows must check both while the migration is in progress.

## Packs (runtime)

```js
const pack = game.packs.get('mosh.rolltables_1e');
await pack.getIndex();      // .size is the document count
await pack.getDocument(id);
await pack.getDocuments();
```

Building packs is a separate workflow — see `packs.md`.
