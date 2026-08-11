<script>
  let { children, tab, active, group = 'primary', class: extra = '', id, attach } = $props();
</script>

{#if active === tab}
  <div class="tab {extra} active" data-group={group} data-tab={tab} {id} {@attach attach}>
    {@render children()}
  </div>
{/if}
