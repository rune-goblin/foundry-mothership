# The design system app

A companion to the system, not part of it: three pages that show what Mothership is built out of.

```bash
npm run design         # http://localhost:30010, with HMR
npm run design:build   # a static copy in dist-design/
```

| Page | What it reads |
|---|---|
| **Theme tokens** | `css/tokens.css`, parsed. Every value shown is the one the browser computed on a live `.mothership` element — so an alias is resolved, not repeated. |
| **Component tokens** | Every `--<componentId>-*` in every scoped `<style>` block under `module/`. Marks which hold a literal instead of aliasing Layer 1, and which sit under a prefix that is not their component's. |
| **Components** | One specimen per component, mounted from `module/` itself. |

## The shell

The layout is the Live Tokens editor panel in full-screen view
(`live-tokens/src/editor/pages/EditorShell.svelte`), and the chrome speaks its `--ui-*` vocabulary
(`live-tokens/src/editor/styles/ui-editor.css`): a sticky rail that collapses to its icon column, a
radio group at the top choosing the view, one nav item per section beneath it, and a content column
at `24px / 32px`. Every token name is a button that copies it.

**Colour is grouped the way a palette reads, not the way a stylesheet is written.** `css/tokens.css`
lists every ramp and then every surface; `PaletteEditor.svelte` puts one family per section with its
ramp on top and the roles derived from it — Surfaces, Borders, Text — in a row underneath, and this
does the same. The regrouping is done from the names (`--surface-danger-high` names its family
already), so a new family appears the moment its ramp does. Families are ordered as
`PALETTE_SPECS` orders them: identity first, neutrals next, status colours last.

Everything that is not a colour keeps the file's own grouping, drawn the way that scale reads — a
spacing scale is bars, a radius scale is boxes, a type scale is the type — which is
`TokenScaleTable`'s idea. A group that is several scales at once falls back to a row per token
carrying its own preview.

Two things depart from that editor, both deliberate and both pinned by
`test/design-gallery.test.ts`:

- **Nothing is set below 14px**, and the base is 16px. There are no small-caps labels and no
  tracked-out eyebrows.
- **The text ramp is remeasured.** The editor's lowest rung is `#4d4d4d`, which sits at 2.3:1 on
  black and fails WCAG AA. Every rung here clears 4.5:1 against the lightest ground it is printed
  on; `shell.css` states the measurements and the spec recomputes them, so the comment cannot
  quietly stop being true.

**Nothing here is a copy.** The pages import the real stylesheets and the real components; the
only thing this directory owns is the sample props, the chrome, and the readers above. Edit a
component while `npm run design` is running and the specimen updates — and so does the sheet in
Foundry, because there is one file.

## What it stands in for

`design/stand-in/foundry.js` supplies the handful of globals the components reach for outside a
Foundry world — the localizer (reading the real `lang/en.json`), a `<prose-mirror>` element that
shows the enriched HTML, `NdM+K` dice, and empty shells for the classes the DataModels and the
window shells extend at module scope. It is the first import in `main.js` because ES modules
evaluate in import order. A specimen that would need working Foundry behaviour says so on its card.

The dev server also mounts two directories the components assume a Foundry server is serving:
`/foundry/` is the installed build's `public/`, whose `foundry2.css` is what declares the cascade
layer order (`system` is layer 8) and brings the icon font; `/systems/mothershiprpg/` is this repo,
which is where `css/mothership.css` names its `@font-face` sources. Without the first, the gallery
would be a different cascade wearing the same class names — the app says so in a banner if no
installed build is found. Set `FOUNDRY_APP` to point it elsewhere.

## Adding a specimen

Drop a `.svelte` file in `design/gallery/`. It registers itself:

```svelte
<script module>
  export const meta = {
    group: 'Primitives',              // Primitives | Sections | Item bodies | Dialog bodies | Windows
    path: 'module/ui/parts/Thing.svelte',
    title: 'Thing',
    note: 'What it is for, and the compromise it carries.',
    covers: [],                       // other files this one demonstrates
    wide: false,                      // a window rather than a control
    standIn: '',                      // what the gallery cannot honestly run
  };
</script>
```

`test/design-gallery.test.ts` mounts every one of them, so a renamed prop fails there rather than
in a browser nobody opened. It also holds the gallery to covering every component under `module/`.
