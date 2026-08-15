<script>
  import { onActivate } from './activate.js';

  // `variant` picks between the two cells an item row is built from: the plain `.skill-stat`
  // readout and the black `.skill-name` pill. `roll` adds `.list-roll`, the hover cue every
  // clickable cell wears. The +/- cells take both handlers: left click adds, right click removes.
  let {
    children,
    grow,
    variant = 'stat',
    roll = false,
    class: extra = '',
    onclick,
    oncontextmenu,
    title,
    role,
  } = $props();

  // A click handler on a <div> needs the button role, a tab stop and a key handler; without one
  // it needs none of them. Spreading keeps that an either/or on one element.
  const interactive = $derived(
    onclick || oncontextmenu
      ? {
          role: 'button',
          tabindex: 0,
          onclick,
          oncontextmenu,
          onkeydown: onclick ? onActivate(onclick) : undefined,
        }
      : { role }
  );
</script>

<div
  class={[`skill-${variant}`, roll && 'list-roll', extra]}
  style={grow ? `flex-grow: ${grow};` : undefined}
  {title}
  {...interactive}
>
  {@render children()}
</div>

<style>
  /* Svelte emits component CSS unlayered, which would outrank every layered rule in the
     application; @layer system puts these in the slot the rest of the system occupies.
     Only the `stat` variant lands here. `.skill-name` is shared vocabulary — four sheets
     hand-write the black pill inside a list, where a scoped block can never reach them — so
     css/mothership.css keeps it as a declared tier. `.skill-stat` also stays on the markup:
     creature-sheet.spec.ts locates the quantity cell by it. */
  @layer system {
    .skill-stat {
      --itemcell-stat-text: var(--text-primary);
      /* `medium` is the absolute keyword, 16px; no stylesheet in the app sets a root
         font-size, so 1rem is the same 16px. */
      --itemcell-stat-font-size: var(--font-size-lg);
      --itemcell-stat-margin-inline-start: var(--space-0);
      --itemcell-stat-padding-block: var(--space-2);
      --itemcell-stat-padding-inline-start: var(--space-8);
      --itemcell-stat-padding-inline-end: var(--space-2);
      --itemcell-stat-radius: var(--radius-xl);

      color: var(--itemcell-stat-text);
      font-size: var(--itemcell-stat-font-size);
      margin-left: var(--itemcell-stat-margin-inline-start);
      padding: var(--itemcell-stat-padding-block) var(--itemcell-stat-padding-inline-end)
        var(--itemcell-stat-padding-block) var(--itemcell-stat-padding-inline-start);
      border-radius: var(--itemcell-stat-radius);
      text-align: center;
      white-space: nowrap;
    }
  }
</style>
