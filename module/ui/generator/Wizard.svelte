<script module>
  import { mount, unmount } from 'svelte';
  import Self from './Wizard.svelte';
  import { CharacterDraft } from './draft.svelte.js';
  import { localize } from '../../i18n.ts';

  /**
   * The window this wizard opens in. ApplicationV2 rather than DocumentSheetV2 on purpose: nothing
   * here is a field of the actor, so there is no form for Foundry to persist — the draft holds the
   * state and writes the actor once, when the player finishes the last card.
   */
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
      this.#root = document.createElement('div');
      this.#root.className = 'mothership-sheet-root';
      this.#component = mount(Self, {
        target: this.#root,
        props: {
          draft: this.#draft,
          close: async () => {
            await this.close();
            await this.#onComplete?.();
          },
        },
      });
      return this.#root;
    }

    _replaceHTML(result, content) {
      content.replaceChildren(result);
    }

    async _preClose(options) {
      await super._preClose(options);
      if (!this.#component) return;
      unmount(this.#component);
      this.#component = undefined;
      this.#root = undefined;
    }
  }
</script>

<script>
  // The character generator, as the book presents it: one numbered step at a time, the PSG's own
  // prose above the controls that answer it, and a rail down the side showing what is left. The
  // draft store underneath is read once when the window opens and written once when the last
  // step's button is pressed.
  //
  // This file is the shell and nothing else: the frame every step stands in — its counter, title,
  // instruction and controls well — and the walk between them. A pane draws the answer it collects
  // and nothing around it. `steps.js` is where the steps themselves live.
  import WizardRail from './WizardRail.svelte';
  import WizardNav from './WizardNav.svelte';
  import { LAST_STEP, STEPS, STEP_TOTAL, stepBlocked, stepNumber, stepTitle } from './steps.js';
  import { dropTarget } from '../parts/drop-target.js';
  // `localize` is already in scope: the module block above imports it for the window's title.
  import { format } from '../../i18n.ts';

  let { draft, close } = $props();

  let index = $state(0);
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
  /* Svelte emits component CSS unlayered, which would outrank every layered rule in the
     application; @layer system puts these in the slot the rest of the system occupies.

     This block is the window's own frame — the pane, its header, the controls well — which the
     shell draws itself and so styles without escaping. Beneath it are the two things the panes
     cannot each own: the `--wizard-*` vocabulary, declared here so the whole window is rethemed
     from one place, and the handful of classes more than one pane writes. Those are marked with
     their readers, the way css/mothership.css marks its shared tier.

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

    /* The art hangs in the header's corner, so the heading has to leave it the room. */
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

    /* The controls well: everything a step puts under its heading. It grows so a pane that means
       to fill the page can. */
    .character-wizard .wizard-controls {
      display: flex;
      flex-grow: 1;
      flex-direction: column;
      gap: var(--wizard-gap);
      padding-bottom: var(--wizard-pad);
    }

    /* A composed page instead of a stack of controls: it runs to the pane's own edge, so the
       well's floor comes off. The front matter is the one step that asks for this. */
    .character-wizard .wizard-controls.bleed {
      padding-bottom: 0;
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

    /* Each pane writes its own copy, so what is shared is the block's face and nothing else.
       Read by IntroPane, HealthPane, GearPane and FinishPane. */
    .character-wizard :global(.wizard-prose p) {
      margin: 0 0 var(--space-8);
    }

    .character-wizard :global(.wizard-reference) {
      margin: var(--space-8) 0 0;
      font-size: var(--font-size-sm);
      font-style: italic;
      color: var(--wizard-ink-muted);
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
