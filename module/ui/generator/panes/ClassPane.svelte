<script>
  import { format, localize } from '../../../i18n.ts';
  import { CLASS_ICONS, classCard, signed } from '../labels.js';

  let { draft } = $props();

  const selectedClass = $derived(draft.selectedClass);
  const adjustments = $derived(
    classCard(selectedClass?.adjustments ?? [], selectedClass?.choices ?? []),
  );

  // The book's own wording where it has one, otherwise the picks spelled out.
  const packageLabel = (option) =>
    option.name || option.picks.map((pick) => format(pick.label, { count: pick.count })).join(', ');
</script>

<div class="wizard-classes">
  {#each draft.classOptions as option (option.uuid)}
    <button
      type="button"
      class="wizard-class"
      class:chosen={draft.classUuid === option.uuid}
      data-class={option.name}
      onclick={() => draft.chooseClass(option.uuid)}
    >
      <img class="wizard-class-art" src={CLASS_ICONS[option.name] ?? option.img} alt="" />
      <span class="wizard-class-name">{option.name}</span>
    </button>
  {/each}
</div>
{#if selectedClass}
  <section class="wizard-class-detail" data-class-detail={selectedClass.name} aria-live="polite">
    <p class="wizard-class-description" data-class-description>{selectedClass.description}</p>
    <ul class="wizard-modifiers" data-list="adjustments">
      {#each adjustments as adjustment (adjustment.key)}
        <li data-choice-detail={adjustment.position}>
          <span data-bonus={adjustment.key}>{signed(adjustment.value)}</span>
          {localize(adjustment.label)}
        </li>
      {/each}
    </ul>
    <dl class="wizard-class-facts">
      {#if selectedClass.skills.granted.length > 0}
        <div>
          <dt>{localize('Mothership.Skills')}</dt>
          <dd data-skills="granted">{selectedClass.skills.granted.join(', ')}</dd>
        </div>
      {/if}
      {#if selectedClass.skills.picks.length > 0 || selectedClass.skills.groups.length > 0}
        <div>
          <dt>{localize('Mothership.CharacterGenerator.Wizard.ClassSkillPicks')}</dt>
          {#each selectedClass.skills.picks as pick (pick.label)}
            <dd data-skills="pick">{format(pick.label, { count: pick.count })}</dd>
          {/each}
          {#each selectedClass.skills.groups as group, position (position)}
            <dd data-skills="group">
              {group.map(packageLabel).join(` ${localize('Mothership.CharacterGenerator.Wizard.SkillOr')} `)}
            </dd>
          {/each}
        </div>
      {/if}
      <!-- PSG step 6 asks nothing here — Trauma Response is whatever the class prints. -->
      <div>
        <dt>{localize('Mothership.TraumaResponse')}</dt>
        <dd data-value="trauma">{draft.traumaResponse}</dd>
      </div>
    </dl>
  </section>
{/if}

<style>
  /* Reads the `--wizard-*` vocabulary Wizard.svelte declares. */
  @layer system {
    .wizard-classes {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: var(--space-8);
    }

    .wizard-class {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-8);
      padding: var(--space-10);
      border: var(--border-width-2) solid var(--wizard-edge);
      border-radius: var(--radius-md);
      background: none;
      color: inherit;
      height: auto;
      min-height: 0;
      text-align: center;
      cursor: pointer;
    }

    .wizard-class.chosen {
      background: var(--wizard-bar-surface);
      color: var(--wizard-bar-ink);
    }

    .wizard-class-art {
      width: var(--wizard-class-art-size);
      height: var(--wizard-class-art-size);
      border: 0;
      object-fit: contain;
    }

    /* Foundry's core icons are black line art on transparent — invert so they show on the black panel. */
    .wizard-class.chosen .wizard-class-art {
      filter: invert(1);
    }

    .wizard-class-name {
      font-family: var(--font-display);
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-bold);
    }

    .wizard-class-detail {
      padding-top: var(--space-12);
      border-top: var(--border-width-2) solid var(--wizard-edge);
    }

    .wizard-class-description {
      margin-bottom: var(--space-8);
      font-size: var(--font-size-xl);
      font-weight: var(--font-weight-semibold);
      line-height: var(--body-md-line-height);
    }

    /* What the class hands out that isn't a number: each fact its own block, so three of them
       don't read as one paragraph. */
    .wizard-class-facts {
      display: grid;
      gap: var(--space-10);
      margin: var(--space-12) 0 0;
    }

    .wizard-class-facts dt {
      font-size: var(--font-size-md);
      font-weight: var(--font-weight-semibold);
      color: var(--wizard-ink-muted);
    }

    .wizard-class-facts dd {
      margin: 0;
    }
  }
</style>
