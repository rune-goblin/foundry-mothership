<script>
  let { children, style, role } = $props();
</script>

<ol class="items-list" {style} {role}>
  {@render children()}
</ol>

<style>
  /* Svelte emits component CSS unlayered, which would outrank every layered rule in the
     application; @layer system puts these in the slot the rest of the system occupies.
     `items-list` stays on the markup even though nothing here selects it: css/mothership.css
     still hangs the row thumbnail rules off it, and ItemControls gates its width on it. */
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
