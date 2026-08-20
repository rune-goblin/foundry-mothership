<script>
  import { format, localize } from '../i18n.ts';
  import ChoiceList from './ChoiceList.svelte';

  let {
    heading,
    intro = '',
    options,
    value,
    onchange,
    /** Which half of the sum the list supplies; the other half is `fixed`. */
    picks = 'skill',
    /** The half already known — the Stat clicked, or the Skill clicked. Null when nothing is. */
    fixed = null,
    lines = 2,
    note = '',
  } = $props();

  const chosen = $derived(options.find((option) => option.key === value) ?? null);
  const total = $derived((fixed?.amount ?? 0) + (chosen?.amount ?? 0));

  const stat = $derived(picks === 'stat' ? chosen : fixed);
  const skill = $derived(picks === 'stat' ? fixed : chosen);

  // A Save asked before its actor is settled has no Stat number yet, so no total shows rather
  // than a wrong one.
  const totalled = $derived(typeof stat?.amount === 'number');

  const working = $derived(
    !totalled
      ? ''
      : (skill?.amount ?? 0) === 0
        ? format('Mothership.CheckWorkingNoSkill', { stat: stat.label, statValue: stat.amount })
        : format('Mothership.CheckWorking', {
            stat: stat.label,
            statValue: stat.amount,
            skill: skill.label,
            skillValue: skill.amount,
          }),
  );
</script>

<div class="check-head">
  <div class="check-head-text">
    <h2 class="check-heading">{heading}</h2>
    {#if intro}<p class="check-intro">{@html intro}</p>{/if}
  </div>
  {#if totalled}
    <p class="check-readout">
      <span class="check-readout-label">{localize('Mothership.RollUnder')}</span>
      <span class="check-readout-total">{total}</span>
    </p>
  {/if}
</div>

<div class="check-body">
  <ChoiceList {options} {value} {onchange} {lines} label={heading} />

  {#if working}
    <p class="check-sum">
      <span class="check-sum-working">{working}</span>
      <span class="check-sum-equals" aria-hidden="true">=</span>
      <span class="check-sum-total">{total}</span>
    </p>
  {/if}

  {#if note}
    <p class="check-note condition-modifier">{note}</p>
  {/if}
</div>

<style>
  @layer system {
    /* The two tracks beneath this row are declared in css/mothership.css, not here: the roll
       rail is Foundry's own `.form-footer`, which no scoped block can reach. */
    .check-head {
      --check-prompt-head-gap: var(--space-20);
      --check-prompt-head-rule-width: var(--border-width-2);
      --check-prompt-head-rule-color: var(--border-danger);

      grid-column: 1 / -1;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: var(--check-prompt-head-gap);
      padding-bottom: var(--space-8);
      border-bottom: var(--check-prompt-head-rule-width) solid var(--check-prompt-head-rule-color);
    }

    .check-heading {
      --check-prompt-heading-font-family: var(--font-display);
      --check-prompt-heading-font-size: var(--font-size-2xl);
      --check-prompt-heading-font-weight: var(--font-weight-semibold);
      --check-prompt-heading-text: var(--text-primary);

      margin: var(--space-0) var(--space-0) var(--space-2);
      font-family: var(--check-prompt-heading-font-family);
      font-size: var(--check-prompt-heading-font-size);
      font-weight: var(--check-prompt-heading-font-weight);
      line-height: var(--line-height-tighter);
      color: var(--check-prompt-heading-text);
      border: none;
    }

    .check-intro {
      --check-prompt-intro-font-size: var(--font-size-md);
      --check-prompt-intro-text: var(--text-secondary);

      margin: var(--space-0);
      font-family: var(--font-sans-mothership);
      font-size: var(--check-prompt-intro-font-size);
      line-height: var(--line-height-normal);
      color: var(--check-prompt-intro-text);
    }

    .check-intro :global(strong) {
      color: var(--text-primary);
      font-weight: var(--font-weight-semibold);
    }

    .check-readout {
      --check-prompt-readout-gap: 0.4em;
      --check-prompt-readout-label-font-size: var(--font-size-lg);
      --check-prompt-readout-label-text: var(--text-secondary);
      --check-prompt-readout-total-font-size: var(--font-size-4xl);
      --check-prompt-readout-total-text: var(--text-primary);

      display: flex;
      align-items: baseline;
      gap: var(--check-prompt-readout-gap);
      margin: var(--space-0);
      font-family: var(--font-display);
      line-height: var(--line-height-none);
      white-space: nowrap;
    }

    .check-readout-label {
      font-size: var(--check-prompt-readout-label-font-size);
      font-weight: var(--font-weight-medium);
      color: var(--check-prompt-readout-label-text);
    }

    .check-readout-total {
      font-size: var(--check-prompt-readout-total-font-size);
      font-weight: var(--font-weight-bold);
      font-variant-numeric: tabular-nums;
      color: var(--check-prompt-readout-total-text);
    }

    .check-body {
      display: flex;
      flex-direction: column;
      gap: var(--space-8);
      min-width: 0;
    }

    .check-sum {
      --check-prompt-sum-surface: var(--color-neutral-100);
      --check-prompt-sum-font-size: var(--font-size-md);
      --check-prompt-sum-text: var(--color-neutral-800);
      --check-prompt-sum-total-font-size: var(--font-size-lg);
      --check-prompt-sum-total-text: var(--text-primary);
      --check-prompt-sum-equals-text: var(--text-tertiary);

      display: flex;
      align-items: baseline;
      gap: var(--space-4);
      margin: var(--space-0);
      padding: var(--space-8) var(--space-12);
      font-family: var(--font-display);
      font-size: var(--check-prompt-sum-font-size);
      font-weight: var(--font-weight-medium);
      font-variant-numeric: tabular-nums;
      color: var(--check-prompt-sum-text);
      background: var(--check-prompt-sum-surface);
      border-radius: var(--radius-sm);
    }

    .check-sum-equals {
      color: var(--check-prompt-sum-equals-text);
    }

    .check-sum-total {
      font-size: var(--check-prompt-sum-total-font-size);
      font-weight: var(--font-weight-bold);
      color: var(--check-prompt-sum-total-text);
    }

    /* `condition-modifier`'s colour and emphasis live in the shell tier (shared with
       ChooseAdvantage) — only the spacing here is this component's. */
    .check-note {
      margin: var(--space-0);
      font-size: var(--font-size-md);
    }
  }
</style>
