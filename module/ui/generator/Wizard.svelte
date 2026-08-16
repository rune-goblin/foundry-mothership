<script>
  // The character generator, as the book presents it: one numbered step at a time, the PSG's own
  // prose above the controls that answer it, and a rail down the side showing what is left. The
  // draft store underneath is unchanged — it is still read once when the window opens and written
  // once when the last pane's button is pressed. Only the presentation moved.
  import MainStat from '../parts/MainStat.svelte';
  import RollBox from './RollBox.svelte';
  import SkillSlot from './SkillSlot.svelte';
  import { dropTarget } from '../parts/drop-target.js';
  import { onActivate } from '../parts/activate.js';
  import { localize, format } from '../../i18n.ts';
  import { statLabel, offerLabel } from '../class/choosable-stats.js';
  import { RANK_LABEL } from './picks.js';
  import { PANES, NUMBERED, paneTitle } from './steps.js';

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

  /** What a class adjustment can name, in the order the class card lists them. */
  const BONUS_LABELS = [
    ...STATS,
    ...SAVES,
    ['health', 'Mothership.Health'],
    ['max_wounds', 'Mothership.Wounds'],
  ];

  // The ledger's two columns, filled down and then across: the four stats, then the three saves
  // and the wound track the class also moves. Health is not here — it is rolled on the next pane,
  // and a row reading "—  —" would be the one line on the page saying nothing.
  const LEDGER = [...STATS, ...SAVES, ['max_wounds', 'Mothership.Wounds']];

  const LAST = PANES.length - 1;

  // The rail numbers the panes it walks. Two of the book's nine steps ask the player nothing, and
  // step 3 asks two things, so the wizard's numbering is its own.
  const numberOf = (entry) => NUMBERED.indexOf(entry) + 1;

  // A pane prints the book's step, or — where the wizard interposes one of its own — its own copy.
  const titleOf = (entry) => (entry.titleKey ? localize(entry.titleKey) : paneTitle(entry));
  const proseOf = (entry) => entry.introKeys?.map(localize) ?? entry.intro ?? entry.step.text;

  let index = $state(0);
  const pane = $derived(PANES[index]);

  // The rail's ceiling. The class and its adjustments are what the wizard will not walk past
  // unfinished, because every pane after them reads the class: its wound bonus, its trauma
  // response, its skills, its loadout table. Walking on without one would report the same missing
  // class four times, or drop an unplaced adjustment from every stat those panes read.
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

  const signed = (value) => (value > 0 ? `+${value}` : `${value}`);

  const BONUS_LABEL = Object.fromEntries(BONUS_LABELS);

  /** What every unanswered slot in this window prints, so a blank never reads as a missing element. */
  const DASH = '—';

  /**
   * The dropdown's answer. `chooseStat` toggles — naming the stat a choice already sits on takes it
   * back — so the blank option clears the choice by naming that stat a second time.
   */
  const spendOn = (position, stat) =>
    draft.chooseStat(position, stat || draft.statChoices[position].chosen);

  /**
   * One line of the dropdown. A stat already rolled shows the arithmetic the pick would do, because
   * "+5 to 1 Stat" is a question about which number is worth raising and the numbers are the answer.
   */
  function optionLabel(choice, stat) {
    const name = localize(statLabel(stat) ?? stat);
    if (draft.rolled[stat] === null) return name;
    const base = draft.total(stat) - (choice.chosen === stat ? choice.modification : 0);
    return `${name} ${base} → ${base + choice.modification}`;
  }

  // Which slot is being browsed. A pick opens the next slot still empty, so filling a class's
  // skills is one list after another rather than a row of dropdowns to hunt through.
  let browsing = $state(null);
  const openSlot = $derived(browsing ?? draft.skillSlots.find((slot) => slot.chosen === null)?.key ?? null);

  const toggleSlot = (key) => {
    browsing = openSlot === key ? '' : key;
  };

  function pickSkill(key, uuid) {
    draft.chooseSkill(key, uuid);
    browsing = null;
  }

  /** A candidate as the slot prints it: the catalog's entry, plus what its prerequisites are called. */
  const offered = (key) =>
    draft.skillCandidates(key).map((option) => ({
      ...option,
      prerequisiteNames: option.prerequisites.map((uuid) => draft.skillName(uuid)),
    }));

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
            <span class="wizard-rail-number">{entry.numbered === false ? '★' : numberOf(entry)}</span>
            <span class="wizard-rail-title">{titleOf(entry)}</span>
          </button>
        </li>
      {/each}
    </ol>
  </nav>

  <section class="wizard-pane" data-pane={pane.id}>
    <header class="wizard-pane-header">
      {#if pane.numbered !== false}
        <p class="wizard-counter">
          {format('Mothership.CharacterGenerator.Wizard.Counter', { number: numberOf(pane), total: NUMBERED.length })}
        </p>
      {/if}
      <h2>{titleOf(pane)}</h2>
      {#if pane.step?.instruction}
        <p class="wizard-instruction">{pane.step.instruction}</p>
      {/if}
    </header>

    <div class="wizard-prose">
      {#each proseOf(pane) as line, position (position)}
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
              <img class="wizard-class-art" src={option.img} alt="" />
              <span class="wizard-class-name">{option.name}</span>
              <!-- What the class does to the character, on the card: the pane is a choice between
                   four of these, and a name alone is not something to choose between. -->
              <span class="wizard-class-brings">
                {#each option.adjustments as adjustment (adjustment.key)}
                  <span>{signed(adjustment.value)} {localize(BONUS_LABEL[adjustment.key])}</span>
                {/each}
                {#each option.choices as choice, position (position)}
                  <span>{signed(choice.modification)} {localize(offerLabel(choice.stats))}</span>
                {/each}
              </span>
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
                  <dd data-bonus={key}>{signed(draft.bonus[key])}</dd>
                </div>
              {/if}
            {/each}
            <!-- PSG step 6 asks nothing: the Trauma Response is whatever the class prints, so it
                 is shown with the rest of what the class brings rather than on a pane of its own. -->
            <div class="wizard-trauma">
              <dt>{localize('Mothership.TraumaResponse')}</dt>
              <dd data-value="trauma">{draft.traumaResponse}</dd>
            </div>
          </dl>
        {/if}
      {:else if pane.id === 'adjustments'}
        <!-- The class in figures: every stat and save it moved, beside the value it now stands at.
             Two columns filled downward, so the stats read as a block and the saves as another —
             and a dash wherever the class left a line alone, because a blank column would read as
             a rendering fault rather than as nothing happening. -->
        <dl class="wizard-ledger" data-list="ledger">
          {#each LEDGER as [key, label] (key)}
            {@const modifier = draft.bonus[key]}
            {@const value = key === 'max_wounds' ? draft.wounds : draft.rolled[key] === null ? null : draft.total(key)}
            <div class="wizard-ledger-row" class:raised={modifier !== 0}>
              <dt>{localize(label)}</dt>
              <dd class="wizard-ledger-value" data-value={key}>{value ?? DASH}</dd>
              <dd class="wizard-ledger-modifier" data-modifier={key}>{modifier === 0 ? DASH : signed(modifier)}</dd>
            </div>
          {/each}
        </dl>

        <!-- The class's `choose_stat` entries, asked on their own pane rather than under the cards
             that answered the question before it: picking a class and spending what it hands you
             are two decisions, and the second is made against these numbers, not against the cards.
             Each is answered by naming a stat, and unanswered by taking the blank line. -->
        {#if draft.statChoices.length > 0}
          <p class="wizard-prompt">{localize('Mothership.CharacterGenerator.Wizard.AdjustmentsChoose')}</p>
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
              <!-- The answer at the size of an answer: the stat as it now stands, and beneath it
                   what this choice put there. Both lines hold a dash while the choice is unspent, so
                   taking it back leaves the row the height it already had. -->
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
      {:else if pane.id === 'skills'}
        <!-- Every skill the class hands out, asked for here: the packages it offers one of, and a
             dropdown per skill it lets the player pick. A gated pick offers only what a skill
             already picked unlocks, so changing an earlier answer can empty a later one. -->
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

        {#each draft.skillSlots as slot (slot.key)}
          <SkillSlot
            pick={slot.key}
            label={localize(RANK_LABEL[slot.rank])}
            options={offered(slot.key)}
            chosen={slot.chosen}
            chosenName={slot.chosen === null ? '' : draft.skillName(slot.chosen)}
            open={openSlot === slot.key}
            ontoggle={() => toggleSlot(slot.key)}
            onchoose={(uuid) => pickSkill(slot.key, uuid)}
          />
        {/each}

        <MainStat key="skills" label={localize('Mothership.Skills')} labelClass="fulllabel" wrapper={false}>
          {#snippet control()}
            <input class="circle-input" type="text" readonly data-value="skills" value={draft.skills.length} />
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
              <!-- A loadout row is a comma-separated list of the items it hands out, so printing the
                   row and then itemising it says everything twice. The row stands in only when the
                   draw resolved to no items at all. -->
              {#if kind !== 'loadout' || !draft.loadout?.entries.length}
                <p class="wizard-readout" data-text={kind}>{draft[kind]?.text ?? ''}</p>
              {/if}
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

      {/if}
    </div>
  </section>

  <footer class="wizard-nav">
    <button type="button" class="wizard-step-button" data-action="back" disabled={index === 0} onclick={() => go(index - 1)}>
      {localize('Mothership.CharacterGenerator.Wizard.Back')}
    </button>

    <p class="wizard-gate">
      {#if index === gate}
        {localize(
          draft.classUuid === ''
            ? 'Mothership.CharacterGenerator.Error.NoClass'
            : 'Mothership.CharacterGenerator.Error.UnspentAdjustment',
        )}
      {/if}
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
      --wizard-class-art-size: 2.5rem;
      --wizard-choice-select-width: 15rem;
      --wizard-choice-readout-width: 4rem;
      --wizard-ledger-modifier-width: 2.75rem;

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
      display: grid;
      grid-template-columns: var(--wizard-class-art-size) minmax(0, 1fr);
      align-content: start;
      gap: var(--space-2) var(--space-10);
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

    .character-wizard .wizard-class-art {
      grid-row: 1 / -1;
      align-self: center;
      width: var(--wizard-class-art-size);
      height: var(--wizard-class-art-size);
      border: 0;
      object-fit: contain;
    }

    /* Foundry's core icons are black line art on transparent, so on the chosen card's black panel
       they would be a hole rather than a picture. */
    .character-wizard .wizard-class.chosen .wizard-class-art {
      filter: invert(1);
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

    .character-wizard .wizard-class-brings {
      display: flex;
      flex-wrap: wrap;
      gap: 0 var(--space-8);
      margin: var(--space-4) 0;
      font-size: var(--font-size-sm);
    }

    /* Every question the panes ask inline wears this: a label over the answers, which the pane
       holds in place rather than in a window that closes over them. */
    .character-wizard .wizard-choice-label {
      display: block;
      margin: 0 0 var(--space-6);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-bold);
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--wizard-ink-muted);
    }

    /* The class in figures. Two columns filled downward — `grid-auto-flow: column` over four rows
       puts the four stats under one another and the saves and wounds beside them — and a rule under
       every line, because the column that has to be legible is the modifier and a ledger is what
       makes a column of numbers scannable. */
    .character-wizard .wizard-ledger {
      display: grid;
      grid-auto-flow: column;
      grid-template-rows: repeat(4, auto);
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0 var(--space-24);
      margin: 0;
    }

    .character-wizard .wizard-ledger-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto var(--wizard-ledger-modifier-width);
      align-items: baseline;
      gap: var(--space-12);
      padding: var(--space-6) 0;
      border-bottom: var(--border-width-1) solid var(--wizard-rule);
    }

    .character-wizard .wizard-ledger-row dt {
      font-size: var(--font-size-xs);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--wizard-ink-muted);
    }

    .character-wizard .wizard-ledger-row dd {
      margin: 0;
      font-family: var(--font-display);
      font-weight: var(--font-weight-bold);
      text-align: right;
    }

    .character-wizard .wizard-ledger-value {
      font-size: var(--font-size-lg);
    }

    .character-wizard .wizard-ledger-modifier {
      font-size: var(--font-size-lg);
      color: var(--wizard-ink-muted);
    }

    /* A line the class moved is the whole point of the page, so it is the one that carries ink. */
    .character-wizard .wizard-ledger-row.raised {
      border-bottom-color: var(--wizard-edge);
    }

    .character-wizard .wizard-ledger-row.raised dt,
    .character-wizard .wizard-ledger-row.raised .wizard-ledger-modifier {
      color: var(--wizard-ink);
    }

    .character-wizard .wizard-prompt {
      margin: 0;
      font-weight: var(--font-weight-semibold);
    }

    .character-wizard .wizard-choice-row {
      display: flex;
      align-items: center;
      gap: var(--space-16);
    }

    .character-wizard .wizard-choice-select {
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

    .character-wizard .wizard-choice-readout {
      display: grid;
      justify-items: center;
      min-width: var(--wizard-choice-readout-width);
      margin: 0;
      font-family: var(--font-display);
      font-weight: var(--font-weight-bold);
      line-height: 1.1;
      color: var(--wizard-ink-muted);
    }

    .character-wizard .wizard-choice-readout.spent {
      color: var(--wizard-ink);
    }

    .character-wizard .wizard-choice-standing {
      font-size: var(--font-size-3xl);
    }

    .character-wizard .wizard-choice-delta {
      font-size: var(--font-size-sm);
    }

    .character-wizard .wizard-packages {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-8);
    }

    .character-wizard .wizard-package {
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

    .character-wizard .wizard-package.chosen {
      background: var(--wizard-bar-surface);
      color: var(--wizard-bar-ink);
    }

    .character-wizard .wizard-package-name {
      display: block;
      font-family: var(--font-display);
      font-weight: var(--font-weight-bold);
      text-transform: uppercase;
    }

    .character-wizard .wizard-package ul {
      margin: var(--space-4) 0 0;
      padding-left: var(--space-20);
      font-size: var(--font-size-sm);
    }

    .character-wizard .wizard-trauma {
      grid-column: 1 / -1;
    }

    /* The Trauma Response is a sentence, not a number: it shares the adjustments' label but not
       their display face. */
    .character-wizard .wizard-trauma dd {
      font-family: inherit;
      font-size: inherit;
      font-weight: inherit;
    }

    .character-wizard .wizard-adjustments {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(7rem, 1fr));
      gap: var(--space-4) var(--space-12);
      margin: 0;
    }

    .character-wizard .wizard-adjustments dt {
      font-size: var(--font-size-xs);
      text-transform: uppercase;
      color: var(--wizard-ink-muted);
    }

    .character-wizard .wizard-adjustments dd {
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
