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
