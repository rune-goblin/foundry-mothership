<script>
  // The character generator, as the book presents it: one numbered step at a time, the PSG's own
  // prose above the controls that answer it, and a rail down the side showing what is left. The
  // draft store underneath is unchanged — it is still read once when the window opens and written
  // once when the last pane's button is pressed. Only the presentation moved.
  import MainStat from '../parts/MainStat.svelte';
  import RollBox from './RollBox.svelte';
  import { dropTarget } from '../parts/drop-target.js';
  import { onActivate } from '../parts/activate.js';
  import { localize, format } from '../../i18n.ts';
  import { PANES, paneTitle } from './steps.js';
  import { STARTING_STRESS } from './draft.svelte.js';

  let { draft, close } = $props();

  const STATS = [
    ['strength', 'Mothership.Strength'],
    ['speed', 'Mothership.Speed'],
    ['intellect', 'Mothership.Intellect'],
    ['combat', 'Mothership.Combat'],
  ];

  const SAVES = [
    ['sanity', 'Mothership.Sanity'],
    ['fear', 'Mothership.Fear'],
    ['body', 'Mothership.Body'],
  ];

  const TABLES = [
    ['loadout', 'Mothership.CharacterGenerator.Table.Loadout'],
    ['trinket', 'Mothership.CharacterGenerator.Table.Trinket'],
    ['patch', 'Mothership.CharacterGenerator.Table.Patch'],
  ];

  /** What a class adjustment can name, in the order the finish pane lists them. */
  const BONUS_LABELS = [
    ...STATS,
    ...SAVES,
    ['health', 'Mothership.Health'],
    ['max_wounds', 'Mothership.Wounds'],
  ];

  const LAST = PANES.length - 1;
  const STEP_COUNT = PANES.filter((pane) => pane.step !== null).length;

  let index = $state(0);
  const pane = $derived(PANES[index]);

  // The rail's ceiling. Step 3 is the one pane the wizard will not walk past unfinished, because
  // the five after it read the class: its wound bonus, its trauma response, its skills, its
  // loadout table. Walking on without one would report the same missing class five times.
  const gate = $derived(PANES.findIndex((entry) => entry.required === true && !entry.done(draft)));
  const reachable = (target) => target <= (gate === -1 ? LAST : gate);

  function go(target) {
    if (target < 0 || target > LAST || !reachable(target)) return;
    index = target;
  }

  const rollAll = async (keys) => {
    for (const key of keys) await draft.roll(key);
  };

  async function rollGear() {
    for (const [kind] of TABLES) await draft.rollTable(kind);
    await draft.roll('credits');
  }

  async function onDropClass(data) {
    if (data?.type !== 'Item') return;
    await draft.chooseClass(data.uuid);
  }

  async function finish() {
    await draft.apply();
    close();
  }
</script>

{#snippet die(kind, onclick)}
  <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
  <img
    class="clicable-item circle-input"
    src="icons/svg/d20-black.svg"
    alt="roll"
    data-roll={kind}
    role="button"
    tabindex="0"
    {onclick}
    onkeydown={onActivate(onclick)}
  />
{/snippet}

<form class="character-wizard" onsubmit={(event) => event.preventDefault()} {@attach dropTarget(onDropClass)}>
  <nav class="wizard-rail" aria-label={localize('Mothership.CharacterGenerator.Wizard.Steps')}>
    <ol>
      {#each PANES as entry, position (entry.id)}
        <li>
          <button
            type="button"
            class="wizard-rail-step"
            class:current={position === index}
            class:complete={entry.done(draft)}
            disabled={!reachable(position)}
            data-pane={entry.id}
            onclick={() => go(position)}
          >
            <span class="wizard-rail-number">{entry.step === null ? '★' : entry.step.number}</span>
            <span class="wizard-rail-title">{paneTitle(entry)}</span>
          </button>
        </li>
      {/each}
    </ol>
  </nav>

  <section class="wizard-pane" data-pane={pane.id}>
    <header class="wizard-pane-header">
      {#if pane.step !== null}
        <p class="wizard-counter">
          {format('Mothership.CharacterGenerator.Wizard.Counter', { number: pane.step.number, total: STEP_COUNT })}
        </p>
      {/if}
      <h2>{paneTitle(pane)}</h2>
      {#if pane.step?.instruction}
        <p class="wizard-instruction">{pane.step.instruction}</p>
      {/if}
    </header>

    <div class="wizard-prose">
      {#each pane.intro ?? pane.step.text as line, position (position)}
        <p>{line}</p>
      {/each}
      {#if pane.step && pane.step.bullets.length > 0}
        <ul class="wizard-bullets">
          {#each pane.step.bullets as bullet (bullet)}
            <li>{bullet}</li>
          {/each}
        </ul>
      {/if}
      {#if pane.step && pane.step.references.length > 0}
        <p class="wizard-references">
          {#each pane.step.references as reference (reference.text)}
            <span>{reference.text}</span>
          {/each}
        </p>
      {/if}
    </div>

    <div class="wizard-controls">
      {#if pane.id === 'stats' || pane.id === 'saves'}
        {@const rolls = pane.id === 'stats' ? STATS : SAVES}
        <div class="wizard-rolls">
          {#each rolls as [key, label] (key)}
            <RollBox
              {key}
              label={localize(label)}
              value={draft.rolled[key]}
              bind:bonus={draft.bonus[key]}
              onroll={() => draft.roll(key)}
            />
          {/each}
        </div>
        <button type="button" class="wizard-bulk" data-roll="all" onclick={() => rollAll(rolls.map(([key]) => key))}>
          {localize('Mothership.CharacterGenerator.Wizard.RollRemaining')}
        </button>
      {:else if pane.id === 'class'}
        <div class="wizard-classes">
          {#each draft.classOptions as option (option.uuid)}
            <button
              type="button"
              class="wizard-class"
              class:chosen={draft.classUuid === option.uuid}
              data-class={option.name}
              onclick={() => draft.chooseClass(option.uuid)}
            >
              <span class="wizard-class-name">{option.name}</span>
              <span class="wizard-class-source">{option.source}</span>
            </button>
          {/each}
        </div>
        {#if draft.className}
          <dl class="wizard-adjustments" data-list="adjustments">
            {#each BONUS_LABELS as [key, label] (key)}
              {#if draft.bonus[key] !== 0}
                <div>
                  <dt>{localize(label)}</dt>
                  <dd data-bonus={key}>{draft.bonus[key] > 0 ? `+${draft.bonus[key]}` : draft.bonus[key]}</dd>
                </div>
              {/if}
            {/each}
          </dl>
        {/if}
      {:else if pane.id === 'health'}
        <div class="wizard-rolls">
          <RollBox
            key="health"
            label={localize('Mothership.Health')}
            value={draft.rolled.health}
            bind:bonus={draft.bonus.health}
            onroll={() => draft.roll('health')}
          />
          <MainStat key="wounds" label={localize('Mothership.Wounds')}>
            {#snippet control()}
              <input class="circle-input" type="text" readonly data-value="wounds" value={draft.wounds} />
            {/snippet}
          </MainStat>
        </div>
      {:else if pane.id === 'stress'}
        <div class="wizard-rolls">
          {#each [['Mothership.Stress', 'stress'], ['Mothership.Minimum', 'stress-min']] as [label, key] (key)}
            <MainStat {key} label={localize(label)}>
              {#snippet control()}
                <input class="circle-input" type="text" readonly data-value={key} value={STARTING_STRESS} />
              {/snippet}
            </MainStat>
          {/each}
        </div>
      {:else if pane.id === 'trauma'}
        <div class="wizard-readout" data-value="trauma">
          {draft.traumaResponse || localize('Mothership.CharacterGenerator.Error.NoClass')}
        </div>
      {:else if pane.id === 'skills'}
        <MainStat key="skills" label={localize('Mothership.Skills')} labelClass="fulllabel" wrapper={false}>
          {#snippet control()}
            <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
            <i
              class="clicable-item circle-input fa fa-undo wizard-redo"
              data-roll="skills"
              role="button"
              tabindex="0"
              aria-label={localize('Mothership.CharacterGenerator.Wizard.RepickSkills')}
              onclick={() => draft.applyClassSkills()}
              onkeydown={onActivate(() => draft.applyClassSkills())}
            ></i>
          {/snippet}
        </MainStat>
        <ul class="wizard-list" data-list="skills">
          {#each draft.skills as skill (skill.uuid)}
            <li>{skill.name}</li>
          {/each}
        </ul>
      {:else if pane.id === 'gear'}
        <div class="wizard-tables">
          {#each TABLES as [kind, label] (kind)}
            <div class="wizard-table">
              <MainStat key={kind} label={localize(label)} wrapper={false}>
                {#snippet control()}
                  {#if draft[kind] === null}
                    {@render die(kind, () => draft.rollTable(kind))}
                  {:else}
                    <input class="circle-input" type="text" readonly data-value={kind} value={draft[kind].roll} />
                  {/if}
                {/snippet}
              </MainStat>
              <p class="wizard-readout" data-text={kind}>{draft[kind]?.text ?? ''}</p>
              {#if kind === 'loadout' && draft.loadout !== null}
                <ul class="wizard-list" data-list="loadout">
                  {#each draft.loadout.entries as entry, position (position)}
                    <li>{entry.name}</li>
                  {/each}
                </ul>
              {/if}
            </div>
          {/each}

          <div class="wizard-table">
            <MainStat key="credits" label={localize('Mothership.Credits')} wrapper={false}>
              {#snippet control()}
                {#if draft.rolled.credits === null}
                  {@render die('credits', () => draft.roll('credits'))}
                {:else}
                  <input class="circle-input" type="text" readonly data-value="credits" value={draft.rolled.credits} />
                {/if}
              {/snippet}
            </MainStat>
          </div>
        </div>
        <button type="button" class="wizard-bulk" data-roll="all" onclick={rollGear}>
          {localize('Mothership.CharacterGenerator.Wizard.RollRemaining')}
        </button>
      {:else if pane.id === 'finish'}
        <div class="wizard-identity">
          <label>
            <span>{localize('Mothership.Name')}</span>
            <input type="text" name="name" bind:value={draft.name} />
          </label>
          <label>
            <span>{localize('Mothership.Pronouns')}</span>
            <input type="text" name="pronouns" bind:value={draft.pronouns} />
          </label>
        </div>

        <dl class="wizard-summary" data-list="summary">
          {#each [...STATS, ...SAVES] as [key, label] (key)}
            <div>
              <dt>{localize(label)}</dt>
              <dd data-total={key}>{draft.rolled[key] === null ? '—' : draft.total(key)}</dd>
            </div>
          {/each}
          <div>
            <dt>{localize('Mothership.Health')}</dt>
            <dd data-total="health">{draft.rolled.health === null ? '—' : draft.total('health')}</dd>
          </div>
          <div>
            <dt>{localize('Mothership.Wounds')}</dt>
            <dd data-total="wounds">{draft.wounds}</dd>
          </div>
          <div>
            <dt>{localize('Mothership.Stress')}</dt>
            <dd data-total="stress">{STARTING_STRESS}</dd>
          </div>
          <div>
            <dt>{localize('Mothership.CLASS')}</dt>
            <dd data-total="class">{draft.className || '—'}</dd>
          </div>
          <div>
            <dt>{localize('Mothership.Skills')}</dt>
            <dd data-total="skills">{draft.skills.length}</dd>
          </div>
          <div>
            <dt>{localize('Mothership.Credits')}</dt>
            <dd data-total="credits">{draft.rolled.credits ?? '—'}</dd>
          </div>
        </dl>

        <label class="wizard-shed">
          <input type="checkbox" data-check="removepreviousitems" bind:checked={draft.removePreviousItems} />
          <span>{localize('Mothership.CharacterGenerator.Wizard.RemovePrevious')}</span>
        </label>
      {/if}
    </div>
  </section>

  <footer class="wizard-nav">
    <button type="button" class="wizard-step-button" data-action="back" disabled={index === 0} onclick={() => go(index - 1)}>
      {localize('Mothership.CharacterGenerator.Wizard.Back')}
    </button>

    <p class="wizard-gate">
      {#if index === gate}{localize('Mothership.CharacterGenerator.Error.NoClass')}{/if}
    </p>

    {#if index === LAST}
      <button type="button" class="wizard-step-button primary" data-action="save" onclick={finish}>
        {localize('Mothership.CharacterGenerator.Wizard.Create')}
      </button>
    {:else}
      <button
        type="button"
        class="wizard-step-button primary"
        data-action="next"
        disabled={!reachable(index + 1)}
        onclick={() => go(index + 1)}
      >
        {localize('Mothership.Next')}
      </button>
    {/if}
  </footer>
</form>

<style>
  /* Svelte emits component CSS unlayered, which would outrank every layered rule in the
     application; @layer system puts these in the slot the rest of the system occupies.

     The wizard's own chrome — the rail, the pane, the prose, the nav — is declared here and
     nowhere else. What it borrows stays borrowed: `circle-input`, `mainstat*` and `fulllabel`
     are the shared stat tier in css/mothership.css, hand-written here and by MainStat, RollBox,
     CharacterSheet and CreatureSheet alike. `clicable-item` is RollBox's, which only ever renders
     inside this form, so the cursor rule lives here as a :global() escape exactly as the
     single-page generator kept it. */
  @layer system {
    .character-wizard {
      --wizard-rail-width: 13rem;
      --wizard-gap: var(--space-16);
      --wizard-pad: var(--space-20);

      /* Two grounds, so two halves. The pane is the page — black ink on white paper — and the rail
         is one of the system's black panels, where the roles invert. DS6b is what makes that
         sayable: `paper` and `ink` are the ends the elevation and emphasis ladders never reach, so
         a white box and a black line each have a name now and no slot below reads the ramp raw. */
      --wizard-ink: var(--text-primary);
      --wizard-edge: var(--border-neutral-ink);
      --wizard-ink-muted: var(--text-secondary);
      --wizard-ink-disabled: var(--text-muted);
      --wizard-rule: var(--border-neutral-medium);
      --wizard-bar-surface: var(--surface-neutral-lowest);
      --wizard-bar-fill: var(--surface-neutral-paper);
      --wizard-bar-ink: var(--text-inverted);
      --wizard-bar-ink-disabled: var(--text-tertiary);
      --wizard-danger: var(--text-danger-secondary);
      --wizard-marker-size: 1.6rem;
      --wizard-list-min-height: 6rem;
      --wizard-readout-min-height: 2.5rem;

      display: grid;
      grid-template-columns: var(--wizard-rail-width) minmax(0, 1fr);
      grid-template-rows: minmax(0, 1fr) auto;
      gap: 0 var(--wizard-gap);
      /* `.mothership-sheet-root` is a full-height flex column; the form is its only child and has
         to take the rest of it, or the rail scrolls the window instead of itself. */
      flex: 1;
      min-height: 0;
      font-family: var(--font-sans-mothership);
      color: var(--wizard-ink);
    }

    .character-wizard .wizard-rail {
      grid-row: 1 / span 2;
      overflow-y: auto;
      padding: var(--wizard-pad) var(--space-8);
      background: var(--wizard-bar-surface);
      color: var(--wizard-bar-ink);
    }

    .character-wizard .wizard-rail ol {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .character-wizard .wizard-rail-step {
      display: grid;
      grid-template-columns: var(--wizard-marker-size) minmax(0, 1fr);
      align-items: center;
      gap: var(--space-8);
      width: 100%;
      padding: var(--space-6) var(--space-8);
      border: 0;
      border-radius: var(--radius-md);
      background: none;
      color: inherit;
      /* Foundry core pins every <button> to `height: var(--button-size)` AND the matching
         `min-height`, so a two-line entry — "Note Trauma Response", "Roll Loadout, Trinket, and
         Patch" — overflowed its own background and spilled its second line onto the rail. Both
         have to be released, not one. Every button in this window carries the same override. */
      height: auto;
      min-height: var(--wizard-marker-size);
      font-family: var(--font-display);
      font-size: var(--font-size-sm);
      text-align: left;
      cursor: pointer;
    }

    .character-wizard .wizard-rail-step:disabled {
      color: var(--wizard-bar-ink-disabled);
      cursor: default;
    }

    .character-wizard .wizard-rail-step.current {
      background: var(--wizard-bar-fill);
      color: var(--wizard-bar-surface);
    }

    .character-wizard .wizard-rail-number {
      display: grid;
      place-items: center;
      width: var(--wizard-marker-size);
      height: var(--wizard-marker-size);
      border: var(--border-width-2) solid currentcolor;
      border-radius: var(--radius-full);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-bold);
    }

    /* A ticked step keeps its number and gains the fill: the rail is a progress bar, and a step
       that swapped its number for a check would stop telling you which step it is. The fill is
       monochrome because the rail is — the current step inverts the whole row, so the marker
       inverts back rather than picking up a colour the system uses nowhere else. */
    .character-wizard .wizard-rail-step.complete .wizard-rail-number {
      background: var(--wizard-bar-fill);
      color: var(--wizard-bar-surface);
    }

    .character-wizard .wizard-rail-step.current.complete .wizard-rail-number {
      background: var(--wizard-bar-surface);
      color: var(--wizard-bar-ink);
    }

    .character-wizard .wizard-pane {
      display: flex;
      flex-direction: column;
      gap: var(--wizard-gap);
      min-height: 0;
      overflow-y: auto;
      padding: var(--wizard-pad) var(--wizard-pad) 0 0;
    }

    .character-wizard .wizard-counter {
      margin: 0;
      font-family: var(--font-display);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-bold);
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--wizard-ink-muted);
    }

    .character-wizard .wizard-pane-header h2 {
      margin: 0;
      border: 0;
      font-family: var(--heading-lg-font-family);
      font-size: var(--font-size-2xl);
      font-weight: var(--font-weight-bold);
      text-transform: uppercase;
    }

    .character-wizard .wizard-instruction {
      margin: var(--space-8) 0 0;
      font-weight: var(--font-weight-semibold);
    }

    .character-wizard .wizard-prose p {
      margin: 0 0 var(--space-8);
    }

    .character-wizard .wizard-bullets {
      margin: 0;
      padding-left: var(--space-20);
    }

    .character-wizard .wizard-references {
      margin: var(--space-8) 0 0;
      font-size: var(--font-size-sm);
      font-style: italic;
      color: var(--wizard-ink-muted);
    }

    .character-wizard .wizard-references span::after {
      content: ' ';
    }

    .character-wizard .wizard-controls {
      display: flex;
      flex-direction: column;
      gap: var(--wizard-gap);
      padding-bottom: var(--wizard-pad);
    }

    .character-wizard .wizard-rolls,
    .character-wizard .wizard-tables {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-12) var(--space-24);
      align-items: start;
    }

    .character-wizard .wizard-classes {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-8);
    }

    .character-wizard .wizard-class {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
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

    .character-wizard .wizard-class.chosen {
      background: var(--wizard-bar-surface);
      color: var(--wizard-bar-ink);
    }

    .character-wizard .wizard-class-name {
      font-family: var(--font-display);
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-bold);
      text-transform: uppercase;
    }

    .character-wizard .wizard-class-source {
      font-size: var(--font-size-xs);
      opacity: 0.7;
    }

    .character-wizard .wizard-adjustments,
    .character-wizard .wizard-summary {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(7rem, 1fr));
      gap: var(--space-4) var(--space-12);
      margin: 0;
    }

    .character-wizard .wizard-adjustments dt,
    .character-wizard .wizard-summary dt {
      font-size: var(--font-size-xs);
      text-transform: uppercase;
      color: var(--wizard-ink-muted);
    }

    .character-wizard .wizard-adjustments dd,
    .character-wizard .wizard-summary dd {
      margin: 0;
      font-family: var(--font-display);
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-bold);
    }

    .character-wizard .wizard-readout {
      min-height: var(--wizard-readout-min-height);
      margin: var(--space-6) 0 0;
    }

    .character-wizard .wizard-list {
      min-height: var(--wizard-list-min-height);
      margin: var(--space-6) 0 0;
      padding-left: var(--space-20);
    }

    .character-wizard .wizard-identity {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-12);
    }

    .character-wizard .wizard-identity label {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .character-wizard .wizard-identity span {
      font-size: var(--font-size-xs);
      text-transform: uppercase;
      color: var(--wizard-ink-muted);
    }

    .character-wizard .wizard-shed {
      display: flex;
      align-items: center;
      gap: var(--space-8);
    }

    .character-wizard .wizard-bulk,
    .character-wizard .wizard-step-button {
      padding: var(--space-8) var(--space-16);
      border: var(--border-width-2) solid var(--wizard-edge);
      border-radius: var(--radius-md);
      background: none;
      color: inherit;
      height: auto;
      min-height: 0;
      font-family: var(--font-display);
      font-weight: var(--font-weight-bold);
      text-transform: uppercase;
      cursor: pointer;
    }

    .character-wizard .wizard-bulk {
      align-self: start;
      font-size: var(--font-size-xs);
    }

    .character-wizard .wizard-step-button.primary {
      background: var(--wizard-bar-surface);
      color: var(--wizard-bar-ink);
    }

    .character-wizard .wizard-step-button:disabled {
      border-color: var(--wizard-rule);
      background: none;
      color: var(--wizard-ink-disabled);
      cursor: default;
    }

    .character-wizard .wizard-nav {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: center;
      gap: var(--space-12);
      padding: var(--space-12) var(--wizard-pad) var(--space-12) 0;
      border-top: var(--border-width-1) solid var(--wizard-rule);
    }

    .character-wizard .wizard-gate {
      margin: 0;
      font-size: var(--font-size-sm);
      color: var(--wizard-danger);
    }

    /* The skills control is an icon, not a die: `circle-input` sizes the box and this centres the
       glyph inside it. */
    .character-wizard .wizard-redo {
      display: grid;
      place-items: center;
    }

    /* RollBox writes this class, and only ever renders inside this form. */
    .character-wizard :global(.clicable-item) {
      cursor: pointer;
    }

    /* MainStat renders the skills label from a `labelClass` prop, so the class lands on markup a
       scoped block here can never reach. The form ancestor keeps the escape inside this window. */
    .character-wizard :global(div.fulllabel) {
      border-radius: var(--radius-full);
    }
  }
</style>
