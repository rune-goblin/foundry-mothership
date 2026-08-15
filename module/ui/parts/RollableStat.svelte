<script>
  import { onActivate } from './activate.js';

  // AppV1 hung the roll on `data-key`/`data-roll`/`data-label` and bound `.stat-roll` by
  // selector. The key and label stay as data attributes -- they name the stat for anything
  // reading the DOM -- but the roll itself is a prop now.
  //
  // No <style> block: no rule anywhere keys off `ability-mod` or `stat-roll`, `rollable` is the
  // shared hover group css/mothership.css scopes with `:where()`, and the look comes from the
  // class the caller passes (`mainstattext`, `creaturestat`) -- all of it outside this file.
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
