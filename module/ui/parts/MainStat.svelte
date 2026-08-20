<script>
  import RollableStat from './RollableStat.svelte';

  let {
    name,
    value,
    label,
    key,
    dtype = 'Number',
    type = 'text',
    checked,
    labelClass = '',
    wrapper = true,
    control,
    after,
    onroll,
  } = $props();
</script>

{#snippet stat()}
  <div class="resource mainstat">
    <div class={[labelClass, 'mainstatlabel']}>
      {#if onroll}
        <RollableStat {label} {key} class="mainstattext" {onroll} />
      {:else}
        <span class="mainstattext" data-key={key} data-label={label}>{label}</span>
      {/if}
    </div>
    {#if control}
      {@render control()}
    {:else}
      <input class="circle-input" {type} {name} {value} {checked} data-dtype={dtype} />
    {/if}
  </div>
{/snippet}

{#if wrapper}
  <div class="mainstatwrapper">
    {@render stat()}
    {#if after}{@render after()}{/if}
  </div>
{:else}
  {@render stat()}
{/if}
