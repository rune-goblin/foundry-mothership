<script>
  import { onActivate } from './activate.js';

  let {
    tabs,
    active = $bindable(),
    group = 'primary',
    id,
    style = 'height: auto;',
  } = $props();

  const select = (tab) => () => (active = tab.id);
</script>

<nav class="mothership mosh sheet-tabs tabs" {id} {style} data-group={group}>
  {#each tabs as tab (tab.id)}
    <a
      class="tab-select"
      class:active={active === tab.id}
      data-tab={tab.id}
      href={null}
      role="tab"
      tabindex="0"
      aria-selected={active === tab.id}
      onclick={select(tab)}
      onkeydown={onActivate(select(tab))}
    >
      {tab.label}
    </a>
  {/each}
</nav>
