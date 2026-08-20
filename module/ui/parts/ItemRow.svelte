<script>
  // Rows with an itemId are draggable by default; a drop-only list (e.g. skill prerequisites)
  // passes draggable={false} so it doesn't offer a drag no handler listens for.
  let {
    children,
    header = false,
    itemId,
    draggable = itemId !== undefined,
    role,
    attach,
  } = $props();
</script>

<li
  class="item flexrow"
  class:item-header={header}
  class:draggable={draggable}
  data-item-id={itemId}
  draggable={draggable ? 'true' : undefined}
  {role}
  {@attach attach}
>
  {@render children()}
</li>

<style>
  /* e2e specs locate rows as `li.item[data-item-id]` -- keep both class names. */
  @layer system {
    li {
      --itemrow-height: 35px; /* measurement, not a spacing-scale step */
      --itemrow-line-height: 24px; /* measurement, not a spacing-scale step */
      --itemrow-padding-block: var(--space-4);
      --itemrow-padding-inline: var(--space-0);
      --itemrow-border-width: var(--border-width-1);
      --itemrow-border-color: var(--border-neutral-medium);
      --itemrow-header-font-weight: var(--font-weight-bold);

      height: var(--itemrow-height);
      line-height: var(--itemrow-line-height);
      padding: var(--itemrow-padding-block) var(--itemrow-padding-inline);
      border-bottom: var(--itemrow-border-width) solid var(--itemrow-border-color);
    }

    li.item-header {
      font-weight: var(--itemrow-header-font-weight);
    }
  }
</style>
