<script>
  import { computedValue, stepLabels } from '../lib/preview.js';

  let { family, scope, clip } = $props();

  const scales = $derived(
    family.scales.map((scale) => {
      const steps = stepLabels(scale.tokens.map((token) => token.name));
      return {
        title: scale.title,
        steps: scale.tokens.map((token) => ({
          name: token.name,
          label: steps.get(token.name),
          value: computedValue(scope, token.name),
        })),
      };
    }),
  );

  const palette = $derived(scales[0]);
  const derived = $derived(scales.slice(1));
</script>

<section class="ds-family" id={family.id}>
  <h3 class="ds-family-title">{family.title}</h3>
  {#if family.note}<p class="ds-intro">{family.note}</p>{/if}

  {#if palette}
    <div class="ds-scale">
      <h4 class="ds-scale-title">{palette.title}</h4>
      {@render grid(palette.steps)}
    </div>
  {/if}

  {#if derived.length}
    <div class="ds-scales-row">
      {#each derived as scale (scale.title)}
        <div class="ds-scale">
          <h4 class="ds-scale-title">{scale.title}</h4>
          {@render grid(scale.steps)}
        </div>
      {/each}
    </div>
  {/if}
</section>

{#snippet grid(steps)}
  <div class="ds-scale-grid" style="--ds-cols: {steps.length};">
    {#each steps as step (step.name)}
      <div class="ds-swatch-col">
        <button
          class="ds-swatch-label"
          class:copied={clip.copied === step.name}
          title={step.name}
          onclick={() => clip.copy(step.name)}
        >
          {clip.copied === step.name ? 'copied!' : step.label}
        </button>
        <div class="ds-swatch" style="--ds-fill: {step.value};" title="{step.name}: {step.value}"></div>
        <span class="ds-swatch-value" title={step.value}>{step.value}</span>
      </div>
    {/each}
  </div>
{/snippet}
