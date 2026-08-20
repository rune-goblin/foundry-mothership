# Foundry API (v14) — quick reference

Ground truth is the installed app, not memory:
`/Applications/Foundry Virtual Tabletop.app/Contents/Resources/app/public/scripts/foundry.mjs`.

## Globals

`game`, `ui`, `canvas`, `CONFIG`, `CONST`, `Hooks`, `foundry`, `Roll` and the document
classes (`Actor`, `Item`, `Macro`, …) are ambient — never import them. No typings package
is installed.

**Not** globals (write the namespaced form): `duplicate`, `mergeObject`, `getProperty`,
`setProperty`, `expandObject` → `foundry.utils.*`; `renderTemplate` →
`foundry.applications.handlebars.renderTemplate`; `Actors`/`Items` (where `registerSheet`
lives) → `foundry.documents.collections.*`.

## Namespaces

- `foundry.utils` — `mergeObject`, `deepClone`, `randomID`, `debounce`, `fromUuid`/`fromUuidSync`.
- `foundry.abstract` — `Document`, `DataModel`, `TypeDataModel`.
- `foundry.data.fields` — schema fields.
- `foundry.applications.api` — `ApplicationV2`, `DialogV2`, `DocumentSheetV2`,
  `HandlebarsApplicationMixin`.
- `foundry.applications.sheets` — `ActorSheetV2`, `ItemSheetV2`.
- `foundry.applications.ux.TextEditor.implementation.enrichHTML(...)`.

## Hooks

- **Lifecycle:** `init` (register settings, document classes, dataModels, sheets) →
  `i18nInit` → `setup` → `ready` → `canvasReady`.
- **Documents:** `create/update/delete{Actor,Item,…}` and `preCreate/preUpdate/preDelete*`
  (return `false` to cancel).
- **Applications:** `render{ClassName}`, `close{ClassName}`.

## Documents

`Doc.create(data)`, `doc.update(changes)`, `doc.delete()`;
`create/update/deleteEmbeddedDocuments('Item', …)` — the v9-era
`updateEmbeddedEntity`/`OwnedItem` forms are gone. With DataModels registered, validation is
strict: nothing half-valid reaches the database.

## Settings

```js
game.settings.register('mothershiprpg', key, { scope: 'world'|'client'|'user', config, type, default, onChange });
game.settings.get('mothershiprpg', key);
```

`registerMenu` for config apps (used for the rolltable config).

## UI entry points

- `ApplicationV2` statics `DEFAULT_OPTIONS`, `PARTS`; lifecycle `_prepareContext`,
  `_renderHTML`, `_replaceHTML`, `_preClose`; `actions` for delegated clicks.
- Dialogs: `DialogV2.wait({...})`, or `svelteDialog()`.
- Toasts: `ui.notifications.info/warn/error`.
- Open V2 windows live in `foundry.applications.instances` (not `ui.windows`, which held V1).

## Packs at runtime

```js
const pack = game.packs.get('mothershiprpg.rolltables_1e');
await pack.getIndex();      // .size is the document count
await pack.getDocument(id);
await pack.getDocuments();
```

Building packs is a separate workflow — see `packs.md`.
