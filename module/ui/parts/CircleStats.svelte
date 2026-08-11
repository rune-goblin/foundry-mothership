<script>
  let { children, variant = '', style, class: extra = '' } = $props();

  const wrapper = $derived(variant ? `circle-statwrapper-${variant}` : 'circle-statwrapper');
</script>

<div class="{wrapper} {extra}" {style}>
  {@render children()}
</div>
