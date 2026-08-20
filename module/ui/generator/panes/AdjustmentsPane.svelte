<script>
  import { localize } from '../../../i18n.ts';
  import { statLabel } from '../../class/choosable-stats.js';
  import { DASH, LEDGER, STATS, signed } from '../labels.js';

  let { draft } = $props();

  // `chooseStat` toggles: naming the stat a choice already sits on clears it. The blank option
  // reuses that by naming the current stat a second time.
  const spendOn = (position, stat) =>
    draft.chooseStat(position, stat || draft.statChoices[position].chosen);

  function optionLabel(choice, stat) {
    const name = localize(statLabel(stat) ?? stat);
    if (draft.rolled[stat] === null) return name;
    const base = draft.total(stat) - (choice.chosen === stat ? choice.modification : 0);
    return `${name} ${base} → ${base + choice.modification}`;
  }
</script>

<!-- Wounds follow the same ledger equation, starting from the system's base of two. -->
<table class="wizard-adjustment-table" data-list="ledger">
  <thead>
    <tr>
      <th aria-label={localize('Mothership.StatsAndSaves')}></th>
      <th scope="col">{localize('Mothership.Base')}</th>
      <th scope="col">{localize('Mothership.Adjustment')}</th>
      <th scope="col">{localize('Mothership.Total')}</th>
    </tr>
  </thead>
  <tbody>
  {#each LEDGER as [key, label], position (key)}
    {@const modifier = draft.bonus[key]}
    {@const total = key === 'max_wounds' ? draft.wounds : draft.rolled[key] === null ? null : draft.total(key)}
    {@const base = total === null ? null : total - modifier}
    <tr class:raised={modifier !== 0} class:group-start={position === STATS.length}>
      <th scope="row">{localize(label)}</th>
      <td data-base={key}>{base ?? DASH}</td>
      <td data-modifier={key}>{total === null ? DASH : signed(modifier)}</td>
      <td data-value={key}>{total ?? DASH}</td>
    </tr>
  {/each}
  </tbody>
</table>

{#if draft.statChoices.length > 0}
  <p class="wizard-prompt">{localize('Mothership.CharacterGenerator.Wizard.Adjustments.Choose')}</p>
{/if}
{#each draft.statChoices as choice, position (position)}
  {@const question = `${localize('Mothership.CharacterGenerator.StatOptionPopupText')} ${signed(choice.modification)}`}
  {@const picked = choice.chosen}
  {@const standing = picked !== null && draft.rolled[picked] !== null ? draft.total(picked) : null}
  <div class="wizard-choice" data-choice={position}>
    <label class="wizard-choice-label" for="wizard-choice-{position}">{question}</label>
    <div class="wizard-choice-row">
      <select
        id="wizard-choice-{position}"
        class="wizard-choice-select"
        data-choose={picked ?? ''}
        value={picked ?? ''}
        onchange={(event) => spendOn(position, event.currentTarget.value)}
      >
        <option value="">{DASH}</option>
        {#each choice.stats as stat (stat)}
          <option value={stat}>{optionLabel(choice, stat)}</option>
        {/each}
      </select>
      <!-- Dash placeholders keep the row's height stable whether or not the choice is spent. -->
      <p class="wizard-choice-readout" class:spent={picked !== null}>
        <span class="wizard-choice-standing" data-standing={picked ?? ''}>
          {standing ?? DASH}
        </span>
        <span class="wizard-choice-delta" data-delta={picked ?? ''}>
          {picked === null ? DASH : signed(choice.modification)}
        </span>
      </p>
    </div>
  </div>
{/each}

<!-- A group offering only one package isn't a question and prints nothing. -->
{#each draft.skillGroups as group, groupIndex (groupIndex)}
  {#if group.options.length > 1}
    <div class="wizard-choice" role="group" aria-label={localize('Mothership.CharacterGenerator.SkillOption.ChoiceText')}>
      <p class="wizard-choice-label">{localize('Mothership.CharacterGenerator.SkillOption.ChoiceText')}</p>
      <div class="wizard-packages">
        {#each group.options as option, position (option.name)}
          <button
            type="button"
            class="wizard-package"
            class:chosen={group.chosen === position}
            aria-pressed={group.chosen === position}
            data-package={option.name}
            onclick={() => draft.chooseSkillOption(groupIndex, position)}
          >
            <span class="wizard-package-name">{option.name}</span>
            <ul>
              {#each option.counts as entry (entry.label)}
                <li>{localize(entry.label)}: {entry.count}</li>
              {/each}
              {#each option.granted as uuid (uuid)}
                <li>{draft.skillName(uuid)}</li>
              {/each}
            </ul>
          </button>
        {/each}
      </div>
    </div>
  {/if}
{/each}

<style>
  /* Reads the `--wizard-*` vocabulary Wizard.svelte declares. */
  @layer system {
    .wizard-adjustment-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }

    .wizard-adjustment-table th,
    .wizard-adjustment-table td {
      padding: var(--space-6) var(--space-10);
      border-bottom: var(--border-width-1) solid var(--wizard-rule);
    }

    .wizard-adjustment-table thead th {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-bold);
      text-align: right;
      color: var(--wizard-ink-muted);
    }

    .wizard-adjustment-table thead th:first-child,
    .wizard-adjustment-table tbody th {
      width: 46%;
      text-align: left;
    }

    .wizard-adjustment-table tbody th {
      font-size: var(--font-size-sm);
      color: var(--wizard-ink-muted);
    }

    .wizard-adjustment-table tbody td {
      font-family: var(--font-display);
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-bold);
      text-align: right;
    }

    .wizard-adjustment-table tr.raised th,
    .wizard-adjustment-table tr.raised td {
      border-bottom-color: var(--wizard-edge);
    }

    .wizard-adjustment-table tr.raised th,
    .wizard-adjustment-table tr.raised td[data-modifier] {
      color: var(--wizard-ink);
    }

    .wizard-adjustment-table tr.group-start th,
    .wizard-adjustment-table tr.group-start td {
      border-top: var(--border-width-2) solid var(--wizard-edge);
    }

    .wizard-prompt {
      margin: 0;
      font-weight: var(--font-weight-semibold);
    }

    .wizard-choice-label {
      display: block;
      margin: 0 0 var(--space-6);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-bold);
      color: var(--wizard-ink-muted);
    }

    .wizard-choice-row {
      display: flex;
      align-items: center;
      gap: var(--space-16);
    }

    .wizard-choice-select {
      flex: 0 0 auto;
      width: var(--wizard-choice-select-width);
      padding: var(--space-6) var(--space-12);
      border: var(--border-width-2) solid var(--wizard-edge);
      border-radius: var(--radius-md);
      background: none;
      color: inherit;
      height: auto;
      min-height: 0;
      font-family: var(--font-display);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-bold);
      cursor: pointer;
    }

    .wizard-choice-readout {
      display: grid;
      justify-items: center;
      min-width: var(--wizard-choice-readout-width);
      margin: 0;
      font-family: var(--font-display);
      font-weight: var(--font-weight-bold);
      line-height: 1.1;
      color: var(--wizard-ink-muted);
    }

    .wizard-choice-readout.spent {
      color: var(--wizard-ink);
    }

    .wizard-choice-standing {
      font-size: var(--font-size-3xl);
    }

    .wizard-choice-delta {
      font-size: var(--font-size-sm);
    }

    .wizard-packages {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-8);
    }

    .wizard-package {
      display: block;
      padding: var(--space-10);
      border: var(--border-width-2) solid var(--wizard-edge);
      border-radius: var(--radius-md);
      background: none;
      color: inherit;
      height: auto;
      min-height: 0;
      text-align: left;
      cursor: pointer;
    }

    .wizard-package.chosen {
      background: var(--wizard-bar-surface);
      color: var(--wizard-bar-ink);
    }

    .wizard-package-name {
      display: block;
      font-family: var(--font-display);
      font-weight: var(--font-weight-bold);
    }

    .wizard-package ul {
      margin: var(--space-4) 0 0;
      padding-left: var(--space-20);
      font-size: var(--font-size-sm);
    }
  }
</style>
