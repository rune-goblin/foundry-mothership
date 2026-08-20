<script>
  let { children, style, role } = $props();
</script>

<div class="item-controls" {style} {role}>
  {@render children()}
</div>

<style>
  /* Scoped to .items-list: the fixed column is a list-row layout rule, not this component's own. */
  @layer system {
    :global(.items-list) .item-controls {
      --itemcontrols-basis: 86px; /* measurement, not a spacing-scale step */

      flex: 0 0 var(--itemcontrols-basis);
      text-align: right;
    }
  }
</style>
