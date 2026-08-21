<script>
  import RollableStat from './RollableStat.svelte';

  // adjusted: the number the player actually rolls under once the modifier is in. It is a display
  // only -- the input underneath keeps the stored base and the name Foundry submits, so a form
  // harvest can never write the total back into the field it was derived from.
  let {
    name,
    value,
    label,
    key,
    dtype = 'Number',
    type = 'text',
    checked,
    labelClass = '',
    size = 'md',
    wrapper = true,
    control,
    modifier,
    adjusted,
    onroll,
  } = $props();

  const large = $derived(size === 'lg');
</script>

{#snippet stat()}
  <div class={['resource', 'mainstat', large && 'is-lg']}>
    <div class={[labelClass, 'mainstatlabel']}>
      {#if onroll}
        <!-- The pill is black, so its die is solid white rather than the muted grey paper takes. -->
        <RollableStat {label} {key} class="mainstattext" dieTone="solid" trailing={modifier} {onroll} />
      {:else}
        <span class="mainstattext" data-key={key} data-label={label}>
          <span class="stat-caption">{label}{#if modifier}{@render modifier()}{/if}</span>
        </span>
      {/if}
    </div>
    {#if control}
      {@render control()}
    {:else}
      <span class="circle-slot">
        <input class="circle-input" {type} {name} {value} {checked} data-dtype={dtype} />
        {#if adjusted != null}
          <span class="circle-adjusted" aria-hidden="true">{adjusted}</span>
        {/if}
      </span>
    {/if}
  </div>
{/snippet}

{#if wrapper}
  <div class={['mainstatwrapper', large && 'is-lg']}>
    {@render stat()}
  </div>
{:else}
  {@render stat()}
{/if}

<style>
  @layer system {
    .stat-caption {
      display: inline-flex;
      align-items: baseline;
      gap: var(--space-8);
      min-width: 0;
    }

    /* The modifier rides the pill beside the word it modifies, instead of orbiting the number as a
       second, smaller circle. No colour: on a black pill the only thing that has to read is
       whether the number is doing anything, so an unused one greys out and a live one goes white. */
    .mainstatlabel :global(.stat-mod),
    .mainstatlabel :global(.stat-mod-sign) {
      --mainstat-modifier-font-family: var(--font-display);
      --mainstat-modifier-font-size: var(--font-size-lg);
      --mainstat-modifier-font-weight: var(--font-weight-bold);
      --mainstat-modifier-text: var(--text-inverted);

      padding: var(--space-0);
      border: var(--border-width-0);
      background: transparent;
      color: var(--mainstat-modifier-text);
      font-family: var(--mainstat-modifier-font-family);
      font-size: var(--mainstat-modifier-font-size);
      font-weight: var(--mainstat-modifier-font-weight);
      line-height: var(--line-height-none);
    }

    .mainstatlabel :global(.stat-mod) {
      width: 2ch;
      text-align: left;
    }

    /* Bright enough to read on the pill, quiet enough not to compete with a live one. */
    .mainstatlabel :global(.stat-mod.is-zero),
    .mainstatlabel :global(.stat-mod-sign.is-zero) {
      --mainstat-modifier-text: var(--color-neutral-400);
    }

    .is-lg .mainstatlabel :global(.stat-mod),
    .is-lg .mainstatlabel :global(.stat-mod-sign) {
      --mainstat-modifier-font-size: var(--font-size-2xl);
    }

    .circle-slot {
      position: relative;
      display: inline-grid;
      justify-self: start;
    }

    /* Covers the circle's face, not its border: the base value stays in the input beneath, so
       focusing the circle reveals the number that is actually stored and editable. */
    .circle-adjusted {
      --mainstat-adjusted-inset: var(--border-width-3);

      position: absolute;
      inset: var(--mainstat-adjusted-inset);
      display: grid;
      place-items: center;
      border-radius: var(--radius-4xl);
      background: var(--surface-neutral-paper);
      color: var(--text-primary);
      font-family: var(--font-display);
      font-size: var(--font-size-3xl);
      font-style: italic;
      font-weight: var(--font-weight-bold);
      z-index: 6;
      pointer-events: none;
    }

    .circle-slot:focus-within .circle-adjusted {
      display: none;
    }

    .is-lg .circle-adjusted {
      font-size: var(--font-size-5xl);
    }
  }
</style>
