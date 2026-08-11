<script>
  // The old templates also carried `.dropitem` here, purely as the jQuery selector AppV1's
  // dragDrop config bound to -- nothing ever styled it. ActorSheetV2 drags from `.draggable`
  // and drops arrive through the dropTarget attachment, so the class is gone.
  let { children, header = false, itemId, role } = $props();
</script>

<li
  class="item flexrow"
  class:item-header={header}
  class:draggable={itemId}
  data-item-id={itemId}
  draggable={itemId ? 'true' : undefined}
  {role}
>
  {@render children()}
</li>
