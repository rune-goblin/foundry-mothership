<script>
  // The label-plus-circle pair the class sheet, the generator and both actor sheets use for a
  // stat. It is not CircleStat: that one stacks a circle over a caption, this one sets a black
  // label bar beside it (.mainstatwrapper / .mainstat / .mainstatlabel in css/mosh.css).
  //
  // `control` replaces the plain input where the circle is something else — the generator swaps a
  // clickable die for the rolled value — and `after` holds what sits beside it inside the wrapper,
  // which is where the +bonus input goes. The generator's table rows carry no wrapper at all.
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
  } = $props();
</script>

{#snippet stat()}
  <div class="resource mainstat">
    <div class={[labelClass, 'mainstatlabel']}>
      <span class="mainstattext" data-key={key} data-label={label}>{label}</span>
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
