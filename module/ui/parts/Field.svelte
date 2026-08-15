<script>
  // The label/input pair every item sheet repeats. The wrappers and their input are this
  // component's own; the outer `resource healthspread minmaxtopstat flex-center` set is shared
  // vocabulary css/mothership.css still declares, so those names stay as they are written.
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
  /* Svelte emits component CSS unlayered, which would outrank every layered rule in the
     application; @layer system puts these in the slot the rest of the system occupies.
     Only the three names nothing else emits are here: `valuewrapper`, `textvaluewrapper` and
     the `textvaluewrapper-input` the script builds. The rest of the markup wears shared
     vocabulary -- `resource-label`, `minmaxtext`, `healthspread`, `minmaxtopstat`,
     `flex-center`, `maxhealth-input`, `darkGreyText`, each hand-written by sheets a scoped
     block can never reach -- and css/mothership.css keeps declaring it.
     The wrapper's white fill was an inline `background: white` on the markup, which meant the
     rule's own `background: 0` never rendered anywhere; the fill is a token now and the dead
     reset is gone. */
  @layer system {
    .resource {
      --field-wrapper-height: var(--space-40);
      --field-wrapper-padding: var(--space-0);
      --field-wrapper-surface: var(--surface-neutral-paper);
      --field-wrapper-border-width: var(--border-width-3);
      --field-wrapper-border-color: var(--border-neutral-ink);
      /* Both radii are em-based and off the scale, which is measured in px: §4.7 maps neither,
         so they wait for the reviewed literal sweep. */
      --field-value-wrapper-radius: 1.5em;
      --field-text-wrapper-radius: 0.5em;

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
