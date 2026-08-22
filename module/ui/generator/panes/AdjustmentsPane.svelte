<script>
  import { localize } from '../../../i18n.ts';
  import { statLabel } from '../../class/choosable-stats.js';
  import { BONUS_LABEL, DASH, collapseAdjustments, signed } from '../labels.js';

  let { draft } = $props();

  // `chooseStat` toggles: naming the stat a choice already sits on clears it. The blank option
  // reuses that by naming the current stat a second time.
  const spendOn = (position, stat) =>
    draft.chooseStat(position, stat || draft.statChoices[position].chosen);

  // Read off the one running total rather than recomputed, so a placed choice joins the class's
  // flat adjustments as a row of its own. A stat nothing moved says nothing and is left out.
  const modifiers = $derived(
    collapseAdjustments(
      Object.keys(BONUS_LABEL)
        .filter((key) => draft.bonus[key])
        .map((key) => ({ key, value: draft.bonus[key] })),
    ),
  );

  function optionLabel(choice, stat) {
    const name = localize(statLabel(stat) ?? stat);
    if (draft.rolled[stat] === null) return name;
    const base = draft.total(stat) - (choice.chosen === stat ? choice.modification : 0);
    return `${name} ${base} → ${base + choice.modification}`;
  }
</script>

{#if draft.statChoices.length > 0}
  <p class="wizard-prompt">{localize('Mothership.CharacterGenerator.Wizard.Adjustments.Choose')}</p>
{/if}
{#each draft.statChoices as choice, position (position)}
  {@const question = `${localize('Mothership.CharacterGenerator.StatOptionPopupText')} ${signed(choice.modification)}`}
  {@const picked = choice.chosen}
  <div class="wizard-choice" data-choice={position}>
    <label class="wizard-choice-label" for="wizard-choice-{position}">{question}</label>
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

{#if modifiers.length > 0}
  <ul class="wizard-modifiers" data-list="modifiers">
    {#each modifiers as row (row.key)}
      <li><span data-modifier={row.key}>{signed(row.value)}</span> {localize(row.label)}</li>
    {/each}
  </ul>
{/if}

<style>
  /* Reads the `--wizard-*` vocabulary Wizard.svelte declares. */
  @layer system {
    .wizard-prompt {
      margin: 0;
      font-weight: var(--font-weight-semibold);
    }

    .wizard-choice-label {
      display: block;
      margin: 0 0 var(--space-6);
      font-size: var(--font-size-md);
      font-weight: var(--font-weight-bold);
      color: var(--wizard-ink-muted);
    }

    .wizard-choice-select {
      width: var(--wizard-choice-select-width);
      padding: var(--space-6) var(--space-12);
      border: var(--border-width-2) solid var(--wizard-edge);
      border-radius: var(--radius-md);
      background: none;
      color: inherit;
      height: auto;
      min-height: 0;
      font-family: var(--font-display);
      font-size: var(--font-size-md);
      font-weight: var(--font-weight-bold);
      cursor: pointer;
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
      font-size: var(--font-size-md);
    }
  }
</style>
