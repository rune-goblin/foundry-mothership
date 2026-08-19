<script>
  import { localize } from '../../i18n.ts';
  import { PANES } from './steps.js';

  let { draft, pane, index, gate, reachable, onback, onnext, onfinish } = $props();

  const LAST = PANES.length - 1;

  const gateMessage = (entry) => {
    if (entry.id === 'class') return 'Mothership.CharacterGenerator.Error.NoClass';
    // The pane asks two things now, so it names whichever is still open.
    if (entry.id === 'adjustments') {
      return draft.statChoicesSpent
        ? 'Mothership.CharacterGenerator.Error.UnpickedSkillBonus'
        : 'Mothership.CharacterGenerator.Error.UnspentAdjustment';
    }
    return 'Mothership.CharacterGenerator.Wizard.CompleteStep';
  };
</script>

<footer class="wizard-nav">
  <button type="button" class="wizard-step-button" data-action="back" disabled={index === 0} onclick={onback}>
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
      onclick={onfinish}
    >
      {localize('Mothership.CharacterGenerator.Wizard.Create')}
    </button>
  {:else}
    <button
      type="button"
      class="wizard-step-button primary"
      data-action="next"
      disabled={!reachable(index + 1)}
      onclick={onnext}
    >
      {localize('Mothership.Next')}
    </button>
  {/if}
</footer>

<style>
  /* The bar's layout only. The buttons wear the wizard's own button face, which Wizard.svelte
     declares because three components write it. */
  @layer system {
    .wizard-nav {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: center;
      gap: var(--space-12);
      padding: var(--space-12) var(--wizard-pad) var(--space-12) 0;
      border-top: var(--border-width-1) solid var(--wizard-rule);
    }

    .wizard-gate {
      margin: 0;
      font-size: var(--font-size-sm);
      color: var(--wizard-danger);
    }
  }
</style>
