<script>
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

  <div class={wrapper === 'text' ? 'textvaluewrapper' : 'valuewrapper'} style="width: {width};">
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

<style>
  @layer system {
    .resource {
      --field-wrapper-height: var(--space-40);
      --field-wrapper-padding: var(--space-0);
      --field-wrapper-surface: var(--surface-neutral-paper);
      --field-wrapper-border-width: var(--border-width-3);
      --field-wrapper-border-color: var(--border-neutral-ink);
      --field-value-wrapper-radius: var(--radius-xl);
      --field-text-wrapper-radius: var(--radius-md);

      --field-input-font-size: var(--font-size-lg);
      --field-input-font-weight: var(--font-weight-bold);
      --field-input-border-width: var(--border-width-0);
      --field-input-surface: transparent;
    }

    .valuewrapper,
    .textvaluewrapper {
      grid-column: 1/-1;
      display: grid;
      align-items: start;
      height: var(--field-wrapper-height);
      padding: var(--field-wrapper-padding);
      border: var(--field-wrapper-border-width) solid var(--field-wrapper-border-color);
      background: var(--field-wrapper-surface);
    }

    .valuewrapper {
      border-radius: var(--field-value-wrapper-radius);
    }

    .textvaluewrapper {
      border-radius: var(--field-text-wrapper-radius);
    }

    .textvaluewrapper-input {
      margin: auto;
      border: var(--field-input-border-width) solid var(--field-wrapper-border-color);
      font-size: var(--field-input-font-size);
      font-weight: var(--field-input-font-weight);
      text-align: center;
      background: var(--field-input-surface);
    }
  }
</style>
