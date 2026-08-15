<script>
  let { children, style, role } = $props();
</script>

<div class="item-controls" {style} {role}>
  {@render children()}
</div>

<style>
  /* Svelte emits component CSS unlayered, which would outrank every layered rule in the
     application; @layer system puts these in the slot the rest of the system occupies.
     The fixed column belongs to a list row, not to the component: CreatureSheet mounts
     ItemControls inside an ability card, which css/mothership.css never reached either, so the
     ancestor stays part of the selector. The `-webkit-box-flex`/`-ms-flex` twins it carried
     since the Boilerplate era are dropped — neither applies to a `display: flex` parent. */
  @layer system {
    :global(.items-list) .item-controls {
      /* A layout constant, not a step on any scale. */
      --itemcontrols-basis: 86px;

      flex: 0 0 var(--itemcontrols-basis);
      text-align: right;
    }
  }
</style>
