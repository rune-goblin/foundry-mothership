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
  import { PANES, NUMBERED, firstIncomplete, paneTitle } from './steps.js';

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

  const CLASS_ICONS = {
    Android: '/systems/mothershiprpg/images/class_icons/android.png',
    Marine: '/systems/mothershiprpg/images/class_icons/marine.png',
    Scientist: '/systems/mothershiprpg/images/class_icons/scientist.png',
    Teamster: '/systems/mothershiprpg/images/class_icons/teamster.png',
  };

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
  const titleOf = (entry) => {
    if (entry.id === 'adjustments' && draft.className) {
      return format('Mothership.CharacterGenerator.Wizard.ClassAdjustments', { class: draft.className });
    }
    return entry.titleKey ? localize(entry.titleKey) : paneTitle(entry);
  };
  const proseOf = (entry) => entry.introKeys?.map(localize) ?? entry.intro ?? entry.step?.text ?? [];

  let index = $state(0);
  const pane = $derived(PANES[index]);
  const selectedClass = $derived(draft.classOptions.find((option) => option.uuid === draft.classUuid) ?? null);

  // The first unfinished pane is the rail's ceiling. The same `done` predicate that fills a rail
  // marker therefore also unlocks the next pane; no task can be bypassed with either navigation.
  const gate = $derived(firstIncomplete(draft));
  const reachable = (target) => target <= (gate === -1 ? LAST : gate);

  const gateMessage = (entry) => {
    if (entry.id === 'class') return 'Mothership.CharacterGenerator.Error.NoClass';
    if (entry.id === 'adjustments') return 'Mothership.CharacterGenerator.Error.UnspentAdjustment';
    return 'Mothership.CharacterGenerator.Wizard.CompleteStep';
  };

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

  async function finish() {
    await draft.apply();
    await close();
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
      {#if pane.id === 'adjustments' && selectedClass}
        <img
          class="wizard-adjustments-class-art"
          src={CLASS_ICONS[selectedClass.name] ?? selectedClass.img}
          alt=""
        />
      {/if}
      {#if pane.step?.instruction && pane.id !== 'class'}
        <p class="wizard-instruction">{pane.step.instruction}</p>
      {/if}
    </header>

    {#if pane.id === 'intro'}
      <div class="wizard-intro">
        <div class="wizard-prose">
          {#each proseOf(pane).slice(0, 2) as line, position (position)}
            <p>{line}</p>
          {/each}
        </div>
        <img
          class="wizard-intro-cover"
          src="/systems/mothershiprpg/images/mothership-cover.webp"
          alt=""
        />
      </div>
    {:else if pane.id !== 'class' && proseOf(pane).length > 0}
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
    {/if}

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
              <img class="wizard-class-art" src={CLASS_ICONS[option.name] ?? option.img} alt="" />
              <span class="wizard-class-name">{option.name}</span>
            </button>
          {/each}
        </div>
        {#if selectedClass}
          <section class="wizard-class-detail" data-class-detail={selectedClass.name} aria-live="polite">
            <p class="wizard-class-description" data-class-description>{selectedClass.description}</p>
            <dl class="wizard-adjustments" data-list="adjustments">
              {#each selectedClass.adjustments as adjustment (adjustment.key)}
                <div>
                  <dt>{localize(BONUS_LABEL[adjustment.key])}</dt>
                  <dd data-bonus={adjustment.key}>{signed(adjustment.value)}</dd>
                </div>
              {/each}
              {#each selectedClass.choices as choice, position (position)}
                <div data-choice-detail={position}>
                  <dt>{localize(offerLabel(choice.stats))}</dt>
                  <dd>{signed(choice.modification)}</dd>
                </div>
              {/each}
              <!-- PSG step 6 asks nothing: the Trauma Response is whatever the class prints, so it
                   is shown with the rest of what the class brings rather than on a pane of its own. -->
              <div class="wizard-trauma">
                <dt>{localize('Mothership.TraumaResponse')}</dt>
                <dd data-value="trauma">{draft.traumaResponse}</dd>
              </div>
            </dl>
          </section>
        {/if}
      {:else if pane.id === 'adjustments'}
        <!-- One arithmetic table: what was rolled, what the class changes, and where that leaves
             the character. Wounds use the same equation, beginning at the system's base of two. -->
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
            rank={slot.rank}
            label={localize(RANK_LABEL[slot.rank])}
            skills={draft.skillTree(slot.key)}
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
        {localize(gateMessage(pane))}
      {/if}
    </p>

    {#if index === LAST}
      <button
        type="button"
        class="wizard-step-button primary"
        data-action="save"
        disabled={draft.name.trim() === ''}
        onclick={finish}
      >
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
      --wizard-class-art-size: 6rem;
      --wizard-choice-select-width: 15rem;
      --wizard-choice-readout-width: 4rem;

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
      text-shadow: none;
    }

    /* Foundry and system typography can add shadows at the individual element level. Keep every
       word on the wizard's paper face crisp and naturally cased, including labels rendered
       inside buttons. */
    .character-wizard.character-wizard * {
      text-shadow: none;
      text-transform: none;
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
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-bold);
      color: var(--wizard-ink-muted);
    }

    .character-wizard .wizard-pane-header {
      position: relative;
    }

    .character-wizard .wizard-pane[data-pane='adjustments'] .wizard-pane-header {
      min-height: var(--wizard-class-art-size);
      padding-right: calc(var(--wizard-class-art-size) + var(--space-16));
    }

    .character-wizard .wizard-adjustments-class-art {
      position: absolute;
      top: 0;
      right: 0;
      width: var(--wizard-class-art-size);
      height: var(--wizard-class-art-size);
      border: 0;
      object-fit: contain;
    }

    .character-wizard .wizard-pane-header h2 {
      margin: 0;
      border: 0;
      font-family: var(--heading-lg-font-family);
      font-size: var(--font-size-2xl);
      font-weight: var(--font-weight-bold);
    }

    .character-wizard .wizard-instruction {
      margin: var(--space-8) 0 0;
      font-weight: var(--font-weight-semibold);
    }

    .character-wizard .wizard-prose p {
      margin: 0 0 var(--space-8);
    }

    .character-wizard .wizard-intro {
      position: relative;
      flex: 1;
      min-height: 28rem;
    }

    .character-wizard .wizard-pane[data-pane='intro'] .wizard-controls {
      display: none;
    }

    .character-wizard .wizard-intro .wizard-prose {
      position: relative;
      z-index: 1;
      width: 72%;
      font-size: var(--font-size-lg);
      line-height: var(--body-md-line-height);
    }

    .character-wizard .wizard-intro-cover {
      position: absolute;
      right: 0;
      bottom: 0;
      z-index: 0;
      display: block;
      width: min(77%, 28rem);
      max-height: 28rem;
      border: 0;
      object-fit: contain;
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
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: var(--space-8);
    }

    .character-wizard .wizard-class {
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

    .character-wizard .wizard-class.chosen {
      background: var(--wizard-bar-surface);
      color: var(--wizard-bar-ink);
    }

    .character-wizard .wizard-class-art {
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
    }

    .character-wizard .wizard-class-detail {
      padding-top: var(--space-12);
      border-top: var(--border-width-2) solid var(--wizard-edge);
    }

    .character-wizard .wizard-class-description {
      margin-bottom: var(--space-8);
      font-size: var(--font-size-xl);
      font-weight: var(--font-weight-semibold);
      line-height: var(--body-md-line-height);
    }

    /* Every question the panes ask inline wears this: a label over the answers, which the pane
       holds in place rather than in a window that closes over them. */
    .character-wizard .wizard-choice-label {
      display: block;
      margin: 0 0 var(--space-6);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-bold);
      color: var(--wizard-ink-muted);
    }

    .character-wizard .wizard-adjustment-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }

    .character-wizard .wizard-adjustment-table th,
    .character-wizard .wizard-adjustment-table td {
      padding: var(--space-6) var(--space-10);
      border-bottom: var(--border-width-1) solid var(--wizard-rule);
    }

    .character-wizard .wizard-adjustment-table thead th {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-bold);
      text-align: right;
      color: var(--wizard-ink-muted);
    }

    .character-wizard .wizard-adjustment-table thead th:first-child,
    .character-wizard .wizard-adjustment-table tbody th {
      width: 46%;
      text-align: left;
    }

    .character-wizard .wizard-adjustment-table tbody th {
      font-size: var(--font-size-sm);
      color: var(--wizard-ink-muted);
    }

    .character-wizard .wizard-adjustment-table tbody td {
      font-family: var(--font-display);
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-bold);
      text-align: right;
    }

    .character-wizard .wizard-adjustment-table tr.raised th,
    .character-wizard .wizard-adjustment-table tr.raised td {
      border-bottom-color: var(--wizard-edge);
    }

    .character-wizard .wizard-adjustment-table tr.raised th,
    .character-wizard .wizard-adjustment-table tr.raised td[data-modifier] {
      color: var(--wizard-ink);
    }

    .character-wizard .wizard-adjustment-table tr.group-start th,
    .character-wizard .wizard-adjustment-table tr.group-start td {
      border-top: var(--border-width-2) solid var(--wizard-edge);
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
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-semibold);
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
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-semibold);
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
