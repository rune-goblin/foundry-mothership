<script>
  // The label/input pair every item sheet repeats. Class names match css/mosh.css, which is
  // hand-authored and shared with the sheets still on Handlebars -- don't rename them here.
  let {
    name,
    label,
    value,
    dtype = 'String',
    wrapper = 'value',
    width = '120px',
    slim = false,
  } = $props();
</script>

<div
  class="resource {slim ? '' : 'healthspread '}minmaxtopstat flex-center"
  style="grid-template-rows: max-content;"
>
  <label for={name} class="resource-label minmaxtext">
    {#if typeof label === 'string'}{label}{:else}{@render label()}{/if}
  </label>

  {#if wrapper === 'text'}
    <div class="textvaluewrapper" style="width: {width}; background: white;">
      <input
        class="textvaluewrapper-input darkGreyText"
        type="text"
        {name}
        {value}
        data-dtype={dtype}
      />
    </div>
  {:else}
    <div class="valuewrapper" style="width: {width}; background: white;">
      <input class="maxhealth-input darkGreyText" type="text" {name} {value} data-dtype={dtype} />
    </div>
  {/if}
</div>
