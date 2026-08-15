# UI: Svelte 5 in ApplicationV2 — and converting MoSh's AppV1 sheets

Two halves: the generic Foundry↔Svelte glue, then **how to convert one of this system's
existing sheets**, which is the actual phase 4 job.

For the Svelte language itself, use Svelte's own tooling (bottom of this file) — don't
work from memory.

## The shell pattern

Every window is an `ApplicationV2`; Svelte renders its content. The shell is thin — mount
once, hand the component the app instance, unmount on close.

```js
// module/ui/ShipMacrosApp.js
import { mount, unmount } from 'svelte';
import ShipMacros from './ShipMacros.svelte';

const { ApplicationV2 } = foundry.applications.api;

export class ShipMacrosApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: 'mosh-ship-macros',
    tag: 'section',
    classes: ['mosh', 'sheet', 'ship'],
    window: { title: 'Ship Macros', resizable: false },
    position: { width: 320, height: 'auto' },
  };

  #component;
  #root;

  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
  }

  get title() { return `${this.actor.name}: Ship Macros`; }

  // AppV2 runs _renderHTML on every render; mount once and reuse the node, so a re-render
  // neither leaks a second component nor discards Svelte's reactive state.
  async _renderHTML() {
    if (!this.#component) {
      this.#root = document.createElement('div');
      this.#component = mount(ShipMacros, { target: this.#root, props: { app: this, actor: this.actor } });
    }
    return this.#root;
  }

  _replaceHTML(result, content) { content.replaceChildren(result); }

  async _preClose() {
    if (this.#component) {
      unmount(this.#component);
      this.#component = undefined;
      this.#root = undefined;
    }
  }
}
```

Lifecycle mapping:

- `_renderHTML()` — mount **once** into a detached element, cache both, return the cached
  node every later render. Re-mounting per render leaks the previous component and throws
  away reactive state.
- `_replaceHTML(result, content)` — `content.replaceChildren(result)`.
- `_preClose()` — `unmount()` so the component tears down.

## Svelte 5, not 4

`mount`/`unmount` from `svelte`, runes inside components. Do **not** use Svelte 4 forms
(`new Component({target})`, `$destroy()`, `export let`, `$:`, `on:click`). Older
Foundry-Svelte modules are often Svelte 4 — translate when copying.

## Converting a MoSh AppV1 sheet

The existing sheets follow one shape. Map it piece by piece rather than rewriting blind:

| AppV1 (today) | ApplicationV2 + Svelte |
|---|---|
| `static get defaultOptions()` | `static DEFAULT_OPTIONS` (note: **no** `template`) |
| `options.template` | the Svelte component itself |
| `getData()` | props passed at `mount`, plus `$derived` in the component |
| `activateListeners(html)` + `html.find(...).click(...)` | `onclick` handlers in markup |
| `this.object` | pass `actor`/`item` explicitly as a prop |
| `_updateObject(event, formData)` | call `doc.update({...})` directly from the handler |
| `submitOnChange: true` | an `onchange` that calls `doc.update()` |

**Things specific to this codebase, in rough order of how much trouble they cause:**

1. **`getData()` builds HTML strings.** e.g. `actor-sheet.js` assembles XP pips into
   `superData.xp.html` in a loop, and `parseRollResult` builds chat HTML. In a component
   that becomes markup with `{#each}`. Do not port string concatenation forward.
2. **Derived data is already computed for you.** `prepareDerivedData` fills
   `system.stats.armor.mod/total`, `system.netHP`, `system.bleeding`. Read them; don't
   recompute in the component.
3. **Settings are read per-sheet today.** Each `getData()` copies
   `game.settings.get('mothershiprpg', …)` into `data.system.settings.*` (`useCalm`, `hideWeight`,
   `androidPanic`). A component can read settings directly. `firstEdition` is gone — the 0e
   rules branches were removed, so there is no edition switch to carry forward.
4. **`class-sheet.js` mutates the model it renders from** — it writes `from_list_names` and
   `skills_granted_object` onto `system.selected_adjustment` during `getData()`. That is why
   those fields are free-form `ObjectField`s in the DataModel. A component should derive
   that into local state instead, and then those fields can be tightened to real schemas.
5. **Reactivity across clients.** A Foundry document update fires `updateActor`/`updateItem`
   hooks; the component needs to re-read. Simplest correct approach: keep the document as
   the source of truth and re-render on the hook, rather than mirroring into local state.

**Keep the e2e specs passing.** `test/e2e/sheets.spec.ts` asserts each sheet renders and
shows its actor, and that derived armour/net HP survive. Those are the regression net for
this work — a conversion that breaks them broke something real. Add a spec per converted
sheet for the interactions it owns.

## Wiring — done

Svelte 5 is installed and wired into vite, `npm run check` (`svelte-check` against
`tsconfig.svelte.json`) and vitest. `svelte.config.js` forces **runes mode on**, so Svelte 4
idioms are compile errors. Component `<style>` blocks are scoped and fold into the single
emitted `dist/mothershiprpg.css`.

**`module/ui/parts/` holds the shared primitives** — `ItemList`,
`ItemRow`, `ItemCell`, `ItemControls`, `ItemControl`, `Tabs`, `TabPanel`, `CircleStats`,
`Field`, `CheckField`, `Editor`, `SheetHeader`, and the `dropTarget` attachment.
Assemble a conversion from these rather than writing bespoke markup, and don't rename the class
names they emit: they are `css/mosh.css`'s, pinned by `test/ui-parts.test.ts`.

`module/ui/item/` is the worked example and `module/ui/skill/` (§21) shows a sheet that needs
more than the shared shell — it subclasses `MothershipItemSheet`, overriding `static COMPONENT` and
`_context()`. Of the conventions these settled, the two that bite hardest:

- **`css/mosh.css` targets the V1 frame.** A V2 window is `.application`, not `.window-app`,
  and carries the user's theme classes. Put `themed`, `theme-light` in `DEFAULT_OPTIONS.classes`
  (DocumentSheetV2 only appends its own when `themed` is absent), or the sheet renders with
  light theme text on the stylesheet's light boxes.
- **A `SchemaField` cleans off keys it does not declare.** Before porting a field, check it
  exists in the DataModel. `test/sheet-bindings.test.ts` fails the build if it does not.

## The language itself — use Svelte's tooling

An MCP server is configured for this project (`plugin:svelte:svelte`), plus the
`svelte:svelte-code-writer` and `svelte:svelte-core-bestpractices` skills. Use them rather
than recalling syntax:

- **Validate every component you write** with the autofixer — it catches the common Svelte 5
  mistakes AI writes (Svelte 4 idioms, misused runes). Re-run until clean.
- **Look up the language** via the MCP's docs tools before guessing.
- The `svelte:svelte-file-editor` agent exists for `.svelte` work and uses these
  automatically.
