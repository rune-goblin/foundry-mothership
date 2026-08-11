<script>
  let { src, title, role } = $props();
</script>

<div class="item-image" {role}>
  {#if src}
    <img {src} {title} alt={title} width="24" height="24" />
  {/if}
</div>
