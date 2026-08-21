<script>
  import { format, localize } from '../i18n.ts';
  import Prompt from './Prompt.svelte';

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

<Prompt
  {heading}
  {intro}
  {options}
  {value}
  {onchange}
  {lines}
  {note}
  readout={totalled ? { label: localize('Mothership.RollUnder'), value: total } : null}
>
  {#if working}
    <p class="check-sum">
      <span class="check-sum-working">{working}</span>
      <span class="check-sum-equals" aria-hidden="true">=</span>
      <span class="check-sum-total">{total}</span>
    </p>
  {/if}
</Prompt>

<style>
  @layer system {
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
  }
</style>
