# UI: Svelte 5 in ApplicationV2

Every window is an `ApplicationV2`; Svelte renders its content. **The canonical shell is
`module/ui/item/ItemSheetApp.js`** — read it before writing a new one. A sheet that needs
more than the shared shell subclasses `MothershipItemSheet`, overriding `static COMPONENT`
and `_context()` (`module/ui/skill/` is the worked example).

The lifecycle contract:

- `_renderHTML()` — mount **once** into a detached element, cache component and root,
  return the cached node on every later render. Re-mounting per render leaks the previous
  component and discards Svelte state. On re-render, refresh the store instead.
- `_replaceHTML(result, content)` — `content.replaceChildren(result)`.
- `_preClose()` — `unmount()`.

**The document store** (`module/ui/document-store.svelte.js`): Foundry documents are not
reactive, so the shell wraps the document in `createDocumentStore(doc, extra)` and calls
`store.refresh()` on each render; components read `store.current`. The document stays the
source of truth — never mirror it into local state.

**Persistence:** fields carry `name="system.…"` and `form: { submitOnChange: true }` lets
Foundry persist them — no per-field `doc.update()` calls.

**Theme:** `css/mothership.css` has no dark variant. Put `'themed', 'theme-light'` in
`DEFAULT_OPTIONS.classes` — DocumentSheetV2 only appends the user's theme classes when
`themed` is absent.

**Svelte 5, not 4.** `mount`/`unmount` from `svelte`, runes inside components
(`svelte.config.js` forces runes mode, so Svelte 4 idioms are compile errors). Older
Foundry-Svelte modules are often Svelte 4 — translate when copying; never `new
Component({target})`, `$destroy()`, `export let`, `$:`, `on:click`.

**The language itself:** use the configured Svelte MCP server and skills
(`svelte:svelte-code-writer`, `svelte:svelte-core-bestpractices`) rather than memory, and
validate every component with the autofixer until clean.
