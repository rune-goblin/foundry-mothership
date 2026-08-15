<script>
  import RollableStat from './RollableStat.svelte';

  // The label-plus-circle pair the class sheet, the generator and both actor sheets use for a
  // stat. It is not CircleStat: that one stacks a circle over a caption, this one sets a black
  // label bar beside it (.mainstatwrapper / .mainstat / .mainstatlabel in css/mothership.css).
  //
  // `control` replaces the plain input where the circle is something else — the generator swaps a
  // clickable die for the rolled value — and `after` holds what sits beside it inside the wrapper,
  // which is where the +bonus input goes. The generator's table rows carry no wrapper at all.
  //
  // `onroll` makes the caption the roll: the character sheet's four stats are clicked to check
  // them, and RollableStat adds the classes and the keyboard twin that turns a span into a button.
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
