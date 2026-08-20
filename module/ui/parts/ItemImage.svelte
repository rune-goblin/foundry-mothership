<script>
  let { src, title, role } = $props();
</script>

<div class="item-image" {role}>
  {#if src}
    <img {src} {title} alt={title} width="24" height="24" />
  {/if}
</div>

<style>
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

    /* ApplicationV2 windows don't get Foundry's AppV1 `.app img` border rule; this replaces it. */
    img {
      display: block;
      box-sizing: border-box;
      border: var(--itemimage-border-width) solid var(--itemimage-border-color);
      border-radius: var(--itemimage-radius);
    }
  }
</style>
