<script>
  let { src, title, role } = $props();
</script>

<div class="item-image" {role}>
  {#if src}
    <img {src} {title} alt={title} width="24" height="24" />
  {/if}
</div>

<style>
  /* Svelte emits component CSS unlayered, which would outrank every layered rule in the
     application; @layer system puts these in the slot the rest of the system occupies.
     Both rules keyed off `.items-list .item` in css/mothership.css and neither needs the
     ancestor here: every mount is a row inside ItemList -- ItemPanel, SkillSheet, ClassSheet
     and the five row snippets on each actor sheet -- so the match set is unchanged. That is
     what ItemControls could not claim, which is why it kept its gate. The
     `-webkit-box-flex`/`-ms-flex` twins the thumbnail carried since the Boilerplate era are
     dropped: neither applies to a `display: flex` parent, which is what `.item.flexrow` is. */
  @layer system {
    .item-image {
      --itemimage-basis: var(--space-24);
      --itemimage-margin-inline-end: var(--space-6);
      --itemimage-border-width: var(--border-width-1);
      --itemimage-border-color: var(--border-neutral-ink);
      --itemimage-radius: var(--radius-sm);

      flex: 0 0 var(--itemimage-basis);
      margin-right: var(--itemimage-margin-inline-end);
    }

    /* Foundry frames every image in an AppV1 window through `body.game .app img`. An
       ApplicationV2 window is `.application`, so a converted sheet never sees that rule -- the
       row thumbnails kept their border for twelve years and this is what keeps it. */
    img {
      display: block;
      box-sizing: border-box;
      border: var(--itemimage-border-width) solid var(--itemimage-border-color);
      border-radius: var(--itemimage-radius);
    }
  }
</style>
