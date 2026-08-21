<script>
  import ArmorBar from '../ui/parts/ArmorBar.svelte';
  import { COVER_BONUS } from '../rules.ts';
  import Prompt from './Prompt.svelte';

  // The head and the list are shared; the armour bar beside each option is ArmorBar's own, dressed
  // in the shell tier's health classes the way every other reader of it is.
  let {
    heading,
    intro,
    options,
    armorPoints,
    damageReduction,
    armorLabel,
    reductionLabel,
    value,
    onchange,
  } = $props();

  const rows = $derived(
    options.map((option) => ({
      key: option.key,
      label: option.label,
      description: option.examples,
    })),
  );
</script>

{#snippet armor(option)}
  <span class="cover-armor health resource healthspread minmaxtopstat">
    <ArmorBar
      spread
      left={armorPoints}
      leftBonus={COVER_BONUS[option.key].armorPoints}
      right={damageReduction}
      rightBonus={COVER_BONUS[option.key].damageReduction}
    />
    <span class="cover-armor-legend">
      <span>{armorLabel}</span>
      <span>{reductionLabel}</span>
    </span>
  </span>
{/snippet}

<Prompt
  {heading}
  {intro}
  options={rows}
  {value}
  {onchange}
  lines={1}
  expanded
  trailing={armor}
/>

<style>
  @layer system {
    .cover-armor {
      display: block;
    }

    /* Names the two numbers in the bar above, in the order the bar prints them. */
    .cover-armor-legend {
      --cover-legend-font-size: var(--font-size-xs);
      --cover-legend-text: var(--text-tertiary);

      display: flex;
      justify-content: space-between;
      gap: var(--space-4);
      margin-top: var(--space-2);
      font-family: var(--font-sans-mothership);
      font-size: var(--cover-legend-font-size);
      line-height: var(--line-height-none);
      white-space: nowrap;
      color: var(--cover-legend-text);
    }
  }
</style>
