<script>
  import { onActivate } from './activate.js';

  // No <style> block: the look comes entirely from css/mothership.css (`rollable` hover group)
  // and the class the caller passes in (`mainstattext`, `creaturestat`).
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
