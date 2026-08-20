<script>
  let { children, style, role } = $props();
</script>

<ol class="items-list" {style} {role}>
  {@render children()}
</ol>

<style>
  /* `items-list` class stays even though nothing here selects it: ItemImage and ItemControls
     gate their own rules on `:global(.items-list)`. */
  @layer system {
    ol {
      --itemlist-margin-block: var(--space-8);
      --itemlist-margin-inline: var(--space-0);
      --itemlist-padding: var(--space-0);

      list-style: none;
      margin: var(--itemlist-margin-block) var(--itemlist-margin-inline);
      padding: var(--itemlist-padding);
    }
  }
</style>
