<script>
  // The label/input pair every item sheet repeats. Class names match css/mosh.css, which is
  // hand-authored and shared with the sheets still on Handlebars -- don't rename them here.
  //
  // `choices` turns the input into a select: a schema field with an enum should be picked from
  // its four values, not typed as free text that validation then discards.
  let {
    name,
    label,
    value,
    dtype = 'String',
    wrapper = 'value',
    width = '120px',
    slim = false,
    choices,
  } = $props();

  const inputClass = $derived(
    wrapper === 'text' ? 'textvaluewrapper-input darkGreyText' : 'maxhealth-input darkGreyText'
  );
</script>

<div
  class="resource {slim ? '' : 'healthspread '}minmaxtopstat flex-center"
  style="grid-template-rows: max-content;"
>
  <label for={name} class="resource-label minmaxtext">
    {#if typeof label === 'string'}{label}{:else}{@render label()}{/if}
  </label>

  <div
    class={wrapper === 'text' ? 'textvaluewrapper' : 'valuewrapper'}
    style="width: {width}; background: white;"
  >
    {#if choices}
      <select class={inputClass} {name} data-dtype={dtype}>
        {#each choices as choice (choice.value)}
          <option value={choice.value} selected={choice.value === value}>{choice.label}</option>
        {/each}
      </select>
    {:else}
      <input class={inputClass} type="text" {name} {value} data-dtype={dtype} />
    {/if}
  </div>
</div>
