<script>
  let { children, style, role } = $props();
</script>

<div class="item-controls" {style} {role}>
  {@render children()}
</div>
