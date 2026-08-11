<script>
  let { children, style, role } = $props();
</script>

<ol class="items-list" {style} {role}>
  {@render children()}
</ol>
