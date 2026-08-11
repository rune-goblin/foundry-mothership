<script>
  import { onActivate } from './activate.js';

  let { icon, title, label, onclick, class: extra = '', ...rest } = $props();
</script>

<a
  class="item-control {extra}"
  {title}
  href={null}
  role="button"
  tabindex="0"
  {onclick}
  onkeydown={onActivate(onclick)}
  {...rest}
>
  <!-- The space belongs to the expression: Svelte strips whitespace at a block's edges. -->
  <i class="fas fa-{icon}"></i>{#if label}{` ${label}`}{/if}
</a>
