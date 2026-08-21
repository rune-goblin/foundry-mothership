<script>
  let { count, value } = $props();

  const pips = $derived(
    Array.from({ length: count }, (_, index) => ({ key: index, filled: index + 1 <= value }))
  );
</script>

<span class="pip-track">
  {#each pips as pip (pip.key)}
    <i class="{pip.filled ? 'fas' : 'far'} fa-circle"></i>
  {/each}
</span>

<style>
  @layer system {
    .pip-track {
      --pip-track-gap: var(--space-4);

      display: inline-flex;
      align-items: center;
      gap: var(--pip-track-gap);
    }
  }
</style>
