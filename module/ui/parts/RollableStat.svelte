<script>
  import { onActivate } from './activate.js';

  // AppV1 hung the roll on `data-key`/`data-roll`/`data-label` and bound `.stat-roll` by
  // selector. The key and label stay as data attributes -- they name the stat for anything
  // reading the DOM -- but the roll itself is a prop now.
  let { label, key, class: extra = '', onroll } = $props();
</script>

<span
  class="ability-mod stat-roll rollable {extra}"
  data-key={key}
  data-label={label}
  role="button"
  tabindex="0"
  onclick={onroll}
  onkeydown={onActivate(onroll)}
>
  {label}
</span>
