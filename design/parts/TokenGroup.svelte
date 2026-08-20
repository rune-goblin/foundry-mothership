<script>
  import { kindOf, groupKind, computedValue, barScale, stepLabels } from '../lib/preview.js';

  let { title = '', note = '', tokens, scope, clip } = $props();

  const resolve = (name) => computedValue(scope, name);

  const kind = $derived(groupKind(tokens, resolve));
  const rows = $derived(
    tokens.map((token) => ({ ...token, computed: resolve(token.name), kind: kindOf(token.name, resolve(token.name)) })),
  );
  const width = $derived(barScale(tokens, resolve));

  const label = (token) => (clip.copied === token.name ? 'copied!' : token.name);

  // A token's caption is its name minus the prefix the group shares.
  const steps = $derived(stepLabels(tokens.map((token) => token.name)));
  const step = (token) => (clip.copied === token.name ? 'copied!' : steps.get(token.name));
</script>

<section class="ds-group">
  {#if title}<h3 class="ds-group-title">{title}</h3>{/if}
  {#if note}<p class="ds-intro">{note}</p>{/if}

  {#if kind === 'color'}
    <div class="ds-swatches">
      {#each rows as token (token.name)}
        <div class="ds-swatch-col">
          <button class="ds-swatch-label" class:copied={clip.copied === token.name} title={token.name}
            onclick={() => clip.copy(token.name)}>{step(token)}</button>
          <div class="ds-swatch" style="--ds-fill: {token.computed};" title={token.value}></div>
          <span class="ds-swatch-value" title={token.computed}>{token.computed}</span>
        </div>
      {/each}
    </div>
  {:else if kind === 'gradient' || kind === 'shadow'}
    <div class="ds-cards">
      {#each rows as token (token.name)}
        <div class="ds-card">
          {#if token.kind === 'shadow'}
            <div class="ds-shadow-well"><div class="ds-shadow-chip" style="--ds-fill: {token.computed};"></div></div>
          {:else}
            <div class="ds-card-fill" style="--ds-fill: {token.computed};"></div>
          {/if}
          <div class="ds-token-info">
            <button class="ds-token-name" class:copied={clip.copied === token.name}
              onclick={() => clip.copy(token.name)}>{label(token)}</button>
            <span class="ds-token-value">{token.computed}</span>
          </div>
        </div>
      {/each}
    </div>
  {:else if kind === 'radius'}
    <div class="ds-radii">
      {#each rows as token (token.name)}
        <div class="ds-radius-item">
          <div class="ds-radius-box" style="border-radius: {token.computed};"></div>
          <div class="ds-token-info">
            <button class="ds-token-name" class:copied={clip.copied === token.name}
              onclick={() => clip.copy(token.name)}>{label(token)}</button>
            <span class="ds-token-value">{token.computed}</span>
          </div>
        </div>
      {/each}
    </div>
  {:else if kind === 'space' || kind === 'border-width'}
    <div class="ds-bars">
      {#each rows as token (token.name)}
        <div class="ds-bar-row">
          {#if kind === 'border-width'}
            <div class="ds-bar width" style="height: {token.computed};"></div>
          {:else}
            <div class="ds-bar" style="width: {width(token.computed)};"></div>
          {/if}
          <div class="ds-token-info">
            <button class="ds-token-name" class:copied={clip.copied === token.name}
              onclick={() => clip.copy(token.name)}>{label(token)}</button>
            <span class="ds-token-value">{token.computed}{token.note ? ` (${token.note})` : ''}</span>
          </div>
        </div>
      {/each}
    </div>
  {:else if kind === 'font-size' || kind === 'weight' || kind === 'letter-spacing' || kind === 'family'}
    <div class="ds-specimens">
      {#each rows as token (token.name)}
        <div class="ds-specimen-row">
          {#if kind === 'font-size'}
            <span class="ds-specimen-preview" style="font-size: {token.computed};">Ag</span>
          {:else if kind === 'weight'}
            <span class="ds-specimen-preview" style="font-size: 1.25rem; font-weight: {token.computed};">Ag</span>
          {:else if kind === 'letter-spacing'}
            <span class="ds-specimen-preview" style="font-size: 1.25rem; letter-spacing: {token.computed};">AV</span>
          {:else}
            <span class="ds-specimen-preview" style="font-size: 1.25rem; font-family: {token.computed};">Ag</span>
          {/if}
          <div class="ds-token-info">
            <button class="ds-token-name" class:copied={clip.copied === token.name}
              onclick={() => clip.copy(token.name)}>{label(token)}</button>
            <span class="ds-token-value">{token.computed}{token.note ? ` (${token.note})` : ''}</span>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="ds-rows">
      {#each rows as token (token.name)}
        <div class="ds-row">
          <span class="ds-row-preview">{@render preview(token)}</span>
          <button class="ds-token-name" class:copied={clip.copied === token.name}
            onclick={() => clip.copy(token.name)}>{label(token)}</button>
          <span class="ds-token-value">{token.computed || token.value}</span>
          {#if token.note}<span class="ds-token-note">{token.note}</span>{/if}
        </div>
      {/each}
    </div>
  {/if}
</section>

<!-- The preview is per-token, not per-group, because a mixed group interleaves several scales.
     A line height has nothing to show and keeps the empty slot, which holds the column. -->
{#snippet preview(token)}
  {#if token.kind === 'color'}
    <span class="ds-row-chip" style="--ds-fill: {token.computed};"></span>
  {:else if token.kind === 'gradient'}
    <span class="ds-row-chip" style="--ds-fill: {token.computed};"></span>
  {:else if token.kind === 'shadow'}
    <span class="ds-row-chip shadow" style="--ds-fill: {token.computed};"></span>
  {:else if token.kind === 'font-size'}
    <span style="font-size: {token.computed}; line-height: 1;">Ag</span>
  {:else if token.kind === 'weight'}
    <span style="font-weight: {token.computed};">Ag</span>
  {:else if token.kind === 'family'}
    <span style="font-family: {token.computed};">Ag</span>
  {:else if token.kind === 'letter-spacing'}
    <span style="letter-spacing: {token.computed};">AV</span>
  {:else if token.kind === 'radius'}
    <span class="ds-row-chip radius" style="border-radius: {token.computed};"></span>
  {:else if token.kind === 'space' || token.kind === 'border-width'}
    <span class="ds-row-bar" style="width: {width(token.computed)};"></span>
  {/if}
{/snippet}
