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

<nav class="mothership sheet-tabs tabs" {id} {style} data-group={group}>
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

<style>
  /* Svelte emits component CSS unlayered, which would outrank every layered rule in the
     application; @layer system puts these in the slot the rest of the system occupies.
     The bar's flex row, gap and line-height come from Foundry's own `nav.tabs` block, which
     is why the class stays on the markup — only what css/mothership.css held is here. */
  @layer system {
    nav {
      --tabs-bar-surface: var(--surface-neutral-lowest);
      --tabs-bar-text: var(--text-inverted);
      --tabs-bar-height: var(--space-40);
      --tabs-bar-padding-block: var(--space-6);
      --tabs-bar-padding-inline: var(--space-0);
      --tabs-bar-radius: var(--radius-md);
      --tabs-bar-border-width: var(--border-width-2);
      /* No ramp step holds this grey: §4.7 collapses rgb(56,56,56) onto --color-neutral-800
         (#444), a visible shift on a 2px line, so the collapse is a reviewed pixel change and
         not this unit's to make. */
      --tabs-bar-border-color: rgb(56, 56, 56);

      --tabs-item-text: var(--text-inverted);
      --tabs-item-font-size: var(--font-size-lg);
      --tabs-item-font-weight: var(--font-weight-bold);
      --tabs-item-active-text-shadow: 0 0 10px var(--text-inverted);

      flex: 0;
      height: var(--tabs-bar-height);
      padding: var(--tabs-bar-padding-block) var(--tabs-bar-padding-inline);
      border-top: var(--tabs-bar-border-width) solid var(--tabs-bar-border-color);
      border-bottom: var(--tabs-bar-border-width) solid var(--tabs-bar-border-color);
      border-radius: var(--tabs-bar-radius);
      background: var(--tabs-bar-surface);
      color: var(--tabs-bar-text);
    }

    .tab-select {
      color: var(--tabs-item-text);
      font-size: var(--tabs-item-font-size);
      font-weight: var(--tabs-item-font-weight);
      text-align: center;

      &.active {
        text-decoration: underline;
        text-shadow: var(--tabs-item-active-text-shadow);
      }
    }
  }
</style>
