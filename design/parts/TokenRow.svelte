<script>
  import { kindOf, computedValue } from '../lib/preview.js';

  let { name, value, note = '', scope } = $props();

  const computed = $derived(computedValue(scope, name));
  const kind = $derived(kindOf(name, computed));
  // A metric bar is only legible against the widest step on the page it sits in.
  const width = $derived(
    kind === 'metric' ? Math.min(76, Math.max(1, parseFloat(computed) || 0)) : 0,
  );
</script>

<div class="ds-token">
  {#if kind === 'color'}
    <div class="ds-chip ds-chip-color" style="--ds-chip-fill: {computed};"></div>
  {:else if kind === 'gradient'}
    <div class="ds-chip ds-chip-gradient" style="--ds-chip-fill: {computed};"></div>
  {:else if kind === 'shadow'}
    <div class="ds-chip ds-chip-shadow" style="--ds-chip-fill: {computed};"><i></i></div>
  {:else if kind === 'metric'}
    <div class="ds-chip ds-chip-metric"><i style="width: {width}px;"></i></div>
  {:else if kind === 'family'}
    <div class="ds-chip ds-chip-text" style="font-family: {computed}; font-size: 15px;">Aa</div>
  {:else if kind === 'weight'}
    <div class="ds-chip ds-chip-text" style="font-weight: {computed}; font-size: 15px;">Aa</div>
  {:else if kind === 'type-size'}
    <div class="ds-chip ds-chip-text" style="font-size: {computed};">Aa</div>
  {:else}
    <div class="ds-chip ds-chip-text" style="font-size: 11px; color: #6a6b73;">—</div>
  {/if}

  <span class="ds-token-name" title={name}>{name}</span>
  <span class="ds-token-value" title={value}>{value}</span>
  <span class="ds-token-computed" title={computed}>
    {computed === value ? '' : computed}
    {#if note}<em class="ds-token-note"> {note}</em>{/if}
  </span>
</div>
