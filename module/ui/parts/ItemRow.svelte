<script>
  // The old templates also carried `.dropitem` here, purely as the jQuery selector AppV1's
  // dragDrop config bound to -- nothing ever styled it. ActorSheetV2 drags from `.draggable`
  // and drops arrive through the dropTarget attachment, so the class is gone.
  // Identified rows are draggable by default -- that is what an actor sheet's rows are for. A
  // list that only receives drops, like the skill sheet's prerequisites, passes `draggable={false}`
  // so it does not offer a drag no handler is listening for.
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
  /* Svelte emits component CSS unlayered, which would outrank every layered rule in the
     application; @layer system puts these in the slot the rest of the system occupies.
     `item` and `flexrow` stay on the markup: the flex row itself is core's `blocks.base`
     contract, css/mothership.css still reaches the row's thumbnail through `.item img`, and
     the e2e specs locate rows as `li.item[data-item-id]`. */
  @layer system {
    li {
      /* 35, 24 and 3 are off every scale — §4.7 snaps 3 to 2 or 4, and the row is a fixed
         height, so a pixel here resizes every list. A reviewed change, not this unit's. */
      --itemrow-height: 35px;
      --itemrow-line-height: 24px;
      --itemrow-padding-block: 3px;
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
