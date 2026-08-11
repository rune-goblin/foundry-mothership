<script>
  import { onActivate } from './activate.js';

  let { children, grow, class: extra = '', onclick, title, role } = $props();

  // A click handler on a <div> needs the button role, a tab stop and a key handler; without one
  // it needs none of them. Spreading keeps that an either/or on one element.
  const interactive = $derived(
    onclick ? { role: 'button', tabindex: 0, onclick, onkeydown: onActivate(onclick) } : { role }
  );
</script>

<div
  class="skill-stat {extra}"
  style={grow ? `flex-grow: ${grow};` : undefined}
  {title}
  {...interactive}
>
  {@render children()}
</div>
