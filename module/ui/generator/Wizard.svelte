<script module>
  import { mount, unmount } from 'svelte';
  import Self from './Wizard.svelte';
  import { CharacterDraft } from './draft.svelte.js';
  import { creationRecord, finishCreation, saveRun } from './record.js';
  import { localize } from '../../i18n.ts';

  // ApplicationV2, not DocumentSheetV2: nothing here is a field of the actor, so there's no form
  // for Foundry to persist — the draft holds state and writes the actor once, on finish. What the
  // run has answered so far is kept apart from that, in a flag, so closing the window mid-creation
  // loses nothing and reopening resumes rather than restarts.
  export class WizardWindow extends foundry.applications.api.ApplicationV2 {
    static DEFAULT_OPTIONS = {
      // css/mothership.css paints the content white and has no dark variant, so pin the light theme.
      classes: ['mothership', 'sheet', 'actor', 'character', 'themed', 'theme-light'],
      // A fixed height, not `auto`: a rail beside a scrolling card needs a box to size against, and
      // an auto-height window would resize itself on every step and jump the rail.
      position: { width: 960, height: 720 },
      window: { resizable: true },
    };

    #actor;
    #draft;
    #onComplete;
    #component;
    #root;
    #step = 0;
    #created = false;

    constructor({ actor, onComplete, ...options } = {}) {
      super({ id: `mothership-generator-${actor.id}`, ...options });
      this.#actor = actor;
      this.#draft = new CharacterDraft(actor);
      this.#onComplete = onComplete;
    }

    get title() {
      return `${this.#actor.name}: ${localize('Mothership.CharacterGenerator.name')}`;
    }

    /** For specs and macros: the live draft, so a generated character can be asserted on. */
    get draft() {
      return this.#draft;
    }

    async _renderHTML() {
      if (this.#component) return this.#root;
      await this.#draft.load();
      const record = creationRecord(this.#actor);
      if (record && !record.done) {
        await this.#draft.restore(record);
        this.#step = record.step ?? 0;
      }
      this.#root = document.createElement('div');
      this.#root.className = 'mothership-sheet-root';
      this.#component = mount(Self, {
        target: this.#root,
        props: {
          draft: this.#draft,
          start: this.#step,
          onstep: async (index) => {
            this.#step = index;
            await this.#save();
          },
          oncreated: async () => {
            this.#created = true;
            await finishCreation(this.#actor);
            await this.close();
            await this.#onComplete?.();
          },
        },
      });
      return this.#root;
    }

    // A run with nothing answered is not a run: opening the window to read a class card and closing
    // it again leaves the actor as it was.
    async #save() {
      if (this.#created || !this.#draft.started) return;
      await saveRun(this.#actor, this.#draft, this.#step);
    }

    _replaceHTML(result, content) {
      content.replaceChildren(result);
    }

    async _preClose(options) {
      await super._preClose(options);
      if (!this.#component) return;
      await this.#save();
      unmount(this.#component);
      this.#component = undefined;
      this.#root = undefined;
    }
  }
</script>

<script>
  import WizardRail from './WizardRail.svelte';
  import WizardNav from './WizardNav.svelte';
  import { LAST_STEP, STEPS, STEP_TOTAL, stepBlocked, stepNumber, stepTitle } from './steps.js';
  import { dropTarget } from '../parts/drop-target.js';
  // `localize` is already in scope: the module block above imports it for the window's title.
  import { format } from '../../i18n.ts';

  let { draft, start = 0, oncreated, onstep } = $props();

  // A resumed run reopens where it stopped, but never past the first step its answers no longer
  // satisfy — a class the world lost since drops the steps that stood on it.
  const firstOpen = STEPS.findIndex((entry) => !entry.done(draft));
  // svelte-ignore state_referenced_locally
  let index = $state(Math.min(start, firstOpen === -1 ? LAST_STEP : firstOpen));
  const step = $derived(STEPS[index]);
  const Pane = $derived(step.pane);
  const art = $derived(step.art?.(draft) ?? null);

  const progress = $derived(STEPS.map((entry) => entry.done(draft)));

  // The first unanswered step is the rail's ceiling, so the same answer that ticks a rail marker
  // unlocks the step after it; no question can be bypassed with either navigation.
  const gate = $derived(progress.findIndex((answered) => !answered));
  const reachable = (target) => target <= (gate === -1 ? LAST_STEP : gate);

  function go(target) {
    if (target < 0 || target > LAST_STEP || !reachable(target)) return;
    index = target;
    onstep?.(target);
  }

  async function onDropClass(data) {
    if (data?.type !== 'Item') return;
    await draft.chooseClass(data.uuid);
  }

  async function finish() {
    await draft.apply();
    await oncreated();
  }
</script>

<form class="character-wizard" onsubmit={(event) => event.preventDefault()} {@attach dropTarget(onDropClass)}>
  <WizardRail {draft} {index} {progress} {reachable} onpick={go} />

  <section class="wizard-pane" data-pane={step.id}>
    <header class="wizard-pane-header" class:with-art={art}>
      {#if step.numbered !== false}
        <p class="wizard-counter">
          {format('Mothership.CharacterGenerator.Wizard.Counter', {
            number: stepNumber(step),
            total: STEP_TOTAL,
          })}
        </p>
      {/if}
      <h2>{stepTitle(step, draft)}</h2>
      {#if step.instruction}
        <p class="wizard-instruction">{localize(step.instruction)}</p>
      {/if}
      {#if art}
        <img class="wizard-pane-art" src={art} alt="" />
      {/if}
    </header>

    <div class="wizard-controls" class:bleed={step.bleed}>
      <Pane {draft} {...step.props ?? {}} />
    </div>
  </section>

  <WizardNav
    {index}
    last={LAST_STEP}
    blocked={index === gate ? stepBlocked(step, draft) : ''}
    cannext={reachable(index + 1)}
    canfinish={draft.named}
    onback={() => go(index - 1)}
    onnext={() => go(index + 1)}
    onfinish={finish}
  />
</form>

<style>
  /* `--wizard-*` is declared here so the whole window rethemes from one place. `circle-input`,
     `mainstat*` and `fulllabel` are the shared stat tier in css/mothership.css, also written by
     MainStat, RollButton, CharacterSheet and CreatureSheet. */
  @layer system {
    .character-wizard {
      --wizard-rail-width: 13rem;
      --wizard-gap: var(--space-16);
      --wizard-pad: var(--space-20);

      --wizard-ink: var(--text-primary);
      --wizard-edge: var(--border-neutral-ink);
      --wizard-ink-muted: var(--text-secondary);
      /* Only disabled controls wear this, which WCAG 1.4.3 exempts from the 4.5:1 floor —
         it still has to read as text, so it is the darkest grey that still says "off". */
      --wizard-ink-disabled: var(--text-tertiary);
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
      /* Must fill `.mothership-sheet-root`'s flex column or the rail scrolls the window instead
         of itself. */
      flex: 1;
      min-height: 0;
      font-family: var(--font-sans-mothership);
      color: var(--wizard-ink);
      text-shadow: none;
    }

    /* Resets shadow/case on every descendant, including mounted panes and primitives — a heading
       that means to shout has to out-specificity this (SkillSelector's rank headings do). */
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
      font-size: var(--font-size-md);
      font-weight: var(--font-weight-bold);
      color: var(--wizard-ink-muted);
    }

    .character-wizard .wizard-pane-header {
      position: relative;
    }

    .character-wizard .wizard-pane-header.with-art {
      min-height: var(--wizard-class-art-size);
      padding-right: calc(var(--wizard-class-art-size) + var(--space-16));
    }

    .character-wizard .wizard-pane-art {
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
      flex-grow: 1;
      flex-direction: column;
      gap: var(--wizard-gap);
      padding-bottom: var(--wizard-pad);
    }

    /* Only IntroPane uses this — drops the well's bottom padding so it can run to the pane's edge. */
    .character-wizard .wizard-controls.bleed {
      padding-bottom: 0;
    }

    /* Read by RollsPane and HealthPane, and by GearPane as wizard-tables. */
    .character-wizard :global(.wizard-rolls),
    .character-wizard :global(.wizard-tables) {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-12) var(--space-24);
      align-items: start;
    }

    /* Read by RollsPane and GearPane (`wizard-bulk`) and WizardNav (`wizard-step-button`).
       height/min-height override Foundry's pinned button box. */
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
      font-size: var(--font-size-md);
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

    /* Read by IntroPane, HealthPane, GearPane and FinishPane. */
    .character-wizard :global(.wizard-prose p) {
      margin: 0 0 var(--space-8);
    }

    /* The one true subtext in the window — a page citation under the prose it cites. */
    .character-wizard :global(.wizard-reference) {
      margin: var(--space-8) 0 0;
      font-size: var(--font-size-sm);
      font-style: italic;
      color: var(--wizard-ink-muted);
    }

    /* Read by SkillsPane and GearPane; min-height keeps the pane from jumping as the list fills. */
    .character-wizard :global(.wizard-list) {
      min-height: var(--wizard-list-min-height);
      margin: var(--space-6) 0 0;
      padding-left: var(--space-20);
    }

    /* The book's class list — read by ClassPane and AdjustmentsPane, which print the same
       adjustments a step apart. */
    .character-wizard :global(.wizard-modifiers) {
      list-style: none;
      margin: 0;
      padding: var(--space-12) var(--space-16);
      border: var(--border-width-2) solid var(--wizard-edge);
      border-radius: var(--radius-md);
    }

    .character-wizard :global(.wizard-modifiers li) {
      margin-bottom: var(--space-4);
      font-size: var(--font-size-lg);
    }

    .character-wizard :global(.wizard-modifiers li:last-child) {
      margin-bottom: 0;
    }

    .character-wizard :global(.wizard-modifiers span) {
      font-family: var(--font-display);
      font-weight: var(--font-weight-bold);
    }

    /* MainStat renders this from a `labelClass` prop, so no scoped block can reach it directly. */
    .character-wizard :global(div.fulllabel) {
      border-radius: var(--radius-full);
    }
  }
</style>
