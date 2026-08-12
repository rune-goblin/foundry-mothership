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
