<script>
  import {
    componentTokens,
    componentTokenCount,
    componentCount,
    literalCount,
  } from '../lib/component-tokens.js';
  import { computedValue, kindOf } from '../lib/preview.js';
  import InfoPopover from '../parts/InfoPopover.svelte';

  let { scope, clip } = $props();

  let query = $state('');
  let onlyLiterals = $state(false);

  const matches = (component) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return (
      component.name.toLowerCase().includes(needle) ||
      component.tokens.some((token) => token.name.includes(needle))
    );
  };

  const shown = $derived(
    componentTokens
      .filter(matches)
      .map((component) => ({
        ...component,
        tokens: (onlyLiterals ? component.tokens.filter((token) => token.literal) : component.tokens).map(
          (token) => {
            const computed = computedValue(scope, token.name);
            return { ...token, computed, showsColor: kindOf(token.name, computed) === 'color' };
          },
        ),
      }))
      .filter((component) => component.tokens.length),
  );
</script>

<header class="ds-page-head">
  <h1>Component tokens</h1>
  <p>
    Layer 2 —
    <code>--&lt;componentId&gt;-&lt;part&gt;[-&lt;state&gt;][-&lt;element&gt;]-&lt;property&gt;</code>, read
    out of each component's scoped <code>&lt;style&gt;</code> block. A component reads only its own
    tokens; one that reads a Layer 1 ramp step directly forfeits the point, because the stark look
    is expressed in the theme values and re-theming should be an edit there.
  </p>
  <p>
    <strong>{componentTokenCount}</strong> tokens, owned by {componentTokens.length} of
    {componentCount} components — the rest write shared vocabulary <code>css/mothership.css</code>
    declares, because their class names have writers a scoped block could never reach.
  </p>
  <p>
    <strong>{literalCount}</strong> hold a literal rather than aliasing Layer 1. Each is argued for
    in a comment at its site, and each is a parked call for the reviewed literal sweep.
  </p>
</header>

<div class="ds-toolbar">
  <input type="search" placeholder="Filter by component or token" bind:value={query} />
  <label class="ds-toggle">
    <input type="checkbox" bind:checked={onlyLiterals} />
    Only the literals
  </label>
  <span class="ds-tally">{shown.length} shown</span>
</div>

<div class="ds-groups">
  {#each shown as component (component.path)}
    <article class="ds-owner" id="c-{component.name}">
      <header class="ds-owner-head">
        <h3>{component.name}</h3>
        <span class="ds-path">{component.path}</span>
        <span class="ds-tally">{component.tokens.length}</span>
        {#if component.note}
          <InfoPopover title={component.name} text={component.note} />
        {/if}
      </header>

      {#each component.tokens as token (token.key)}
        <div class="ds-alias" class:literal={token.literal}>
          {#if token.showsColor}
            <div class="ds-alias-chip" style="--ds-fill: {token.computed};" title={token.computed}></div>
          {:else}
            <div class="ds-alias-chip empty" title={token.computed}></div>
          {/if}
          <button
            class="ds-token-name"
            class:copied={clip.copied === token.name}
            title={token.name}
            onclick={() => clip.copy(token.name)}
          >
            {clip.copied === token.name ? 'copied!' : token.name}
          </button>
          <span class="ds-token-value" title={token.value}>
            {token.value}{#if token.literal}<span class="ds-flag">literal</span>{/if}{#if token.overridden}<span
                class="ds-flag state">{token.selector}</span>{/if}
          </span>
        </div>
      {/each}
    </article>
  {/each}
</div>

{#if shown.length === 0}
  <p class="ds-empty">Nothing matches “{query}”.</p>
{/if}
