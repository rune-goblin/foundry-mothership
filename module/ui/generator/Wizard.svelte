<script>
  // The character generator, as the book presents it: one numbered step at a time, the PSG's own
  // prose above the controls that answer it, and a rail down the side showing what is left. The
  // draft store underneath is unchanged — it is still read once when the window opens and written
  // once when the last pane's button is pressed.
  //
  // This file is the shell and nothing else: the frame the panes stand in, the walk between them,
  // and the vocabulary they are all drawn from. Each pane's markup and its own styles live beside
  // it in panes/, and the rail, the nav bar and the prose block are components of their own.
  import WizardRail from './WizardRail.svelte';
  import WizardNav from './WizardNav.svelte';
  import WizardProse from './WizardProse.svelte';
  import IntroPane from './panes/IntroPane.svelte';
  import RollsPane from './panes/RollsPane.svelte';
  import ClassPane from './panes/ClassPane.svelte';
  import AdjustmentsPane from './panes/AdjustmentsPane.svelte';
  import HealthPane from './panes/HealthPane.svelte';
  import SkillsPane from './panes/SkillsPane.svelte';
  import GearPane from './panes/GearPane.svelte';
  import FinishPane from './panes/FinishPane.svelte';
  import { dropTarget } from '../parts/drop-target.js';
  import { localize, format } from '../../i18n.ts';
  import { PANES, NUMBERED, firstIncomplete } from './steps.js';
  import { CLASS_ICONS, SAVES, STATS, numberOf, titleOf } from './labels.js';

  let { draft, close } = $props();

  const LAST = PANES.length - 1;

  const proseOf = (entry) => entry.introKeys?.map(localize) ?? entry.intro ?? entry.step?.text ?? [];

  let index = $state(0);
  const pane = $derived(PANES[index]);
  const selectedClass = $derived(draft.classOptions.find((option) => option.uuid === draft.classUuid) ?? null);

  // The first unfinished pane is the rail's ceiling. The same `done` predicate that fills a rail
  // marker therefore also unlocks the next pane; no task can be bypassed with either navigation.
  const gate = $derived(firstIncomplete(draft));
  const reachable = (target) => target <= (gate === -1 ? LAST : gate);

  function go(target) {
    if (target < 0 || target > LAST || !reachable(target)) return;
    index = target;
  }

  async function onDropClass(data) {
    if (data?.type !== 'Item') return;
    await draft.chooseClass(data.uuid);
  }

  async function finish() {
    await draft.apply();
    await close();
  }
</script>

<form class="character-wizard" onsubmit={(event) => event.preventDefault()} {@attach dropTarget(onDropClass)}>
  <WizardRail {draft} {index} {reachable} onpick={go} />

  <section class="wizard-pane" data-pane={pane.id}>
    <header class="wizard-pane-header">
      {#if pane.numbered !== false}
        <p class="wizard-counter">
          {format('Mothership.CharacterGenerator.Wizard.Counter', { number: numberOf(pane), total: NUMBERED.length })}
        </p>
      {/if}
      <h2>{titleOf(pane, draft)}</h2>
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
      <IntroPane lines={proseOf(pane)} />
    {:else if pane.id !== 'class' && proseOf(pane).length > 0}
      <WizardProse lines={proseOf(pane)} step={pane.step} />
    {/if}

    <div class="wizard-controls">
      {#if pane.id === 'stats' || pane.id === 'saves'}
        <RollsPane {draft} rolls={pane.id === 'stats' ? STATS : SAVES} />
      {:else if pane.id === 'class'}
        <ClassPane {draft} {selectedClass} />
      {:else if pane.id === 'adjustments'}
        <AdjustmentsPane {draft} />
      {:else if pane.id === 'health'}
        <HealthPane {draft} />
      {:else if pane.id === 'skills'}
        <SkillsPane {draft} />
      {:else if pane.id === 'gear'}
        <GearPane {draft} />
      {:else if pane.id === 'finish'}
        <FinishPane {draft} />
      {/if}
    </div>
  </section>

  <WizardNav
    {draft}
    {pane}
    {index}
    {gate}
    {reachable}
    onback={() => go(index - 1)}
    onnext={() => go(index + 1)}
    onfinish={finish}
  />
</form>

<style>
  /* Svelte emits component CSS unlayered, which would outrank every layered rule in the
     application; @layer system puts these in the slot the rest of the system occupies.

     This block is the window's own frame — the pane, its header, the controls well — plus the two
     things the panes cannot each own: the `--wizard-*` vocabulary, declared here so the whole
     window is rethemed from one place, and the handful of classes more than one pane writes. Those
     are marked with their readers, the way css/mothership.css marks its shared tier. Everything
     else moved to the component that draws it.

     What the wizard borrows stays borrowed: `circle-input`, `mainstat*` and `fulllabel` are the
     shared stat tier in css/mothership.css, hand-written by the panes here and by MainStat,
     RollBox, CharacterSheet and CreatureSheet alike. */
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
       word on the wizard's paper face crisp and naturally cased, including labels rendered inside
       buttons. It reaches into the panes and the primitives they mount, so anything that means to
       shout inside this window has to say so above this rule's weight — SkillSelector's rank
       headings are the one place that does. */
    .character-wizard.character-wizard :global(*) {
      text-shadow: none;
      text-transform: none;
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

    .character-wizard .wizard-controls {
      display: flex;
      flex-direction: column;
      gap: var(--wizard-gap);
      padding-bottom: var(--wizard-pad);
    }

    /* The front matter is a full-height spread and answers nothing, so it has no controls well. */
    .character-wizard .wizard-pane[data-pane='intro'] .wizard-controls {
      display: none;
    }

    /* A two-column grid of controls. Read by RollsPane and HealthPane, and by GearPane under its
       own name — the tables are the same layout holding a different kind of answer. */
    .character-wizard :global(.wizard-rolls),
    .character-wizard :global(.wizard-tables) {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-12) var(--space-24);
      align-items: start;
    }

    /* The wizard's button face. Read by RollsPane and GearPane (`wizard-bulk`) and WizardNav
       (`wizard-step-button`); `height`/`min-height` release Foundry's pinned button box, as every
       button in this window has to. */
    .character-wizard :global(.wizard-bulk),
    .character-wizard :global(.wizard-step-button) {
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

    .character-wizard :global(.wizard-bulk) {
      align-self: start;
      font-size: var(--font-size-xs);
    }

    .character-wizard :global(.wizard-step-button.primary) {
      background: var(--wizard-bar-surface);
      color: var(--wizard-bar-ink);
    }

    .character-wizard :global(.wizard-step-button:disabled) {
      border-color: var(--wizard-rule);
      background: none;
      color: var(--wizard-ink-disabled);
      cursor: default;
    }

    /* What a pane itemises under a rolled result. Read by SkillsPane and GearPane; the floor keeps
       the pane from jumping as the list fills. */
    .character-wizard :global(.wizard-list) {
      min-height: var(--wizard-list-min-height);
      margin: var(--space-6) 0 0;
      padding-left: var(--space-20);
    }

    /* RollBox and GearPane's dice write this class, and only ever inside this form. */
    .character-wizard :global(.clicable-item) {
      cursor: pointer;
    }

    /* MainStat renders the skills label from a `labelClass` prop, so the class lands on markup no
       scoped block can reach. The form ancestor keeps the escape inside this window. */
    .character-wizard :global(div.fulllabel) {
      border-radius: var(--radius-full);
    }
  }
</style>
