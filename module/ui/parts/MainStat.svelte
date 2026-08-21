<script>
  import RollableStat from './RollableStat.svelte';

  // adjusted: the number the player actually rolls under once the modifier is in, in the tone the
  // modifier gives it. It is a display only -- the input underneath keeps the stored base and the
  // name Foundry submits, so a form harvest can never write the total back over what it came from.
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
    tone,
    onroll,
  } = $props();

  const large = $derived(size === 'lg');
</script>

{#snippet stat()}
  <div class={['resource', 'mainstat', large && 'is-lg']}>
    <div class={[labelClass, 'mainstatlabel']}>
      {#if onroll}
        <!-- The pill is black, so its die is solid white rather than the muted grey paper takes. -->
        <RollableStat {label} {key} class="mainstattext" dieTone="solid" {onroll} />
      {:else}
        <span class="mainstattext" data-key={key} data-label={label}>{label}</span>
      {/if}
    </div>
    {#if control}
      {@render control()}
    {:else}
      <span class="circle-slot">
        <input class="circle-input" {type} {name} {value} {checked} data-dtype={dtype} />
        {#if adjusted != null}
          <span class={['circle-adjusted', tone && `is-${tone}`]} aria-hidden="true">{adjusted}</span>
        {/if}
        {#if modifier}{@render modifier()}{/if}
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
    .circle-slot {
      position: relative;
      display: inline-grid;
      justify-self: start;
    }

    /* While the badge is open it covers the number anyway; greying what is left of it says the
       circle is about to change rather than that it is disabled. */
    .circle-slot:has(:global(.stat-modifier):hover) .circle-input,
    .circle-slot:has(:global(.stat-modifier):focus-within) .circle-input,
    .circle-slot:has(:global(.stat-modifier):hover) .circle-adjusted,
    .circle-slot:has(:global(.stat-modifier):focus-within) .circle-adjusted {
      color: var(--text-muted);
      transition: color 160ms ease 320ms;
    }

    .circle-adjusted.is-up {
      color: var(--color-success-400);
    }

    .circle-adjusted.is-down {
      color: var(--color-danger-400);
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
