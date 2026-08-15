<script>
  import { themeTokenCount, compositeStyles, compositeBlockId } from '../lib/theme-tokens.js';
  import { families, familyTokenCount, remainingBlocks } from '../lib/families.js';
  import { computedValue } from '../lib/preview.js';
  import TokenGroup from '../parts/TokenGroup.svelte';
  import FamilyPalette from '../parts/FamilyPalette.svelte';

  let { scope, clip } = $props();

  const PROPERTIES = ['font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing'];

  // The tokens live on `.mothership`, and this app's chrome is deliberately outside it — so the
  // specimen is drawn with the resolved values rather than by inheriting the variables.
  const typeset = $derived(
    compositeStyles.map((prefix) => ({
      prefix,
      style: PROPERTIES.map(
        (property) => `${property}: ${computedValue(scope, `${prefix}-${property}`)}`,
      ).join('; '),
    })),
  );
</script>

<header class="ds-page-head">
  <h1>Theme tokens</h1>
  <p>
    Layer 1 — the palette and the scales, read straight out of <code>css/tokens.css</code>. Every
    value shown is the one the browser computed on a live <code>.mothership</code> element, so an
    alias is resolved rather than repeated. Click a name to copy it.
  </p>
  <p>
    <strong>{themeTokenCount}</strong> tokens, all scoped to <code>.mothership</code> inside
    <code>@layer system</code> — never <code>:root</code>, because Foundry is one document.
  </p>
</header>

<div class="ds-sections">
  <section class="ds-section" id="colour">
    <h2 class="ds-section-title">Colour</h2>
    <p class="ds-intro">
      {familyTokenCount} of the {themeTokenCount}, in {families.length} families. The stylesheet
      lists every ramp and then every surface; a palette reads the other way, so each family shows
      its ramp with the roles derived from it underneath.
    </p>
    <div class="ds-families">
      {#each families as family (family.id)}
        <FamilyPalette {family} {scope} {clip} />
      {/each}
    </div>
  </section>

  {#each remainingBlocks as block (block.id)}
    <section class="ds-section" id={block.id}>
      {#if block.heading}
        <h2 class="ds-section-title">{block.title}</h2>
        {#if block.note}<p class="ds-intro">{block.note}</p>{/if}
      {:else}
        {#if block.id === compositeBlockId}
          <div class="ds-typeset">
            {#each typeset as style (style.prefix)}
              <div class="ds-typeset-item">
                <button
                  class="ds-token-name"
                  class:copied={clip.copied === style.prefix}
                  onclick={() => clip.copy(style.prefix)}
                >
                  {clip.copied === style.prefix ? 'copied!' : `${style.prefix}-*`}
                </button>
                <p class="ds-typeset-line" style={style.style}>
                  Every door on this ship opens onto the same dark.
                </p>
              </div>
            {/each}
          </div>
        {/if}

        <TokenGroup title={block.title} note={block.note} tokens={block.tokens} {scope} {clip} />
      {/if}
    </section>
  {/each}
</div>
