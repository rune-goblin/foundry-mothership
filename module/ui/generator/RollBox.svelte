<script>
  // No <style> block: `circle-input` is shared tier in css/mothership.css; `clicable-item` is
  // scoped in Generator.svelte.
  import MainStat from '../parts/MainStat.svelte';
  import { onActivate } from '../parts/activate.js';

  let { key, label, value, onroll } = $props();
</script>

<MainStat {label} {key}>
  {#snippet control()}
    {#if value === null}
      <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
      <img
        class="clicable-item circle-input"
        src="icons/svg/d20-black.svg"
        alt="roll"
        title={label}
        data-roll={key}
        role="button"
        tabindex="0"
        onclick={onroll}
        onkeydown={onActivate(onroll)}
      />
    {:else}
      <input class="circle-input" type="text" readonly data-value={key} {value} />
    {/if}
  {/snippet}
</MainStat>
