<script>
  // No <style> block: `circle-input` is shared tier in css/mothership.css.
  import MainStat from '../parts/MainStat.svelte';
  import RollButton from '../parts/RollButton.svelte';

  let { key, label, value, onroll } = $props();
</script>

<MainStat {label} {key}>
  {#snippet control()}
    {#if value === null}
      <RollButton {key} title={label} {onroll} />
    {:else}
      <input class="circle-input" type="text" readonly data-value={key} {value} />
    {/if}
  {/snippet}
</MainStat>
