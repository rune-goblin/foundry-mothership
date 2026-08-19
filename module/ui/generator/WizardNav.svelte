<script>
  import { localize } from '../../i18n.ts';

  // `blocked` arrives already worded and already decided: empty means the walk is not blocked here.
  let { index, last, blocked, cannext, canfinish, onback, onnext, onfinish } = $props();
</script>

<footer class="wizard-nav">
  <button type="button" class="wizard-step-button" data-action="back" disabled={index === 0} onclick={onback}>
    {localize('Mothership.CharacterGenerator.Wizard.Back')}
  </button>

  <p class="wizard-gate">{blocked}</p>

  {#if index === last}
    <button
      type="button"
      class="wizard-step-button primary"
      data-action="save"
      disabled={!canfinish}
      onclick={onfinish}
    >
      {localize('Mothership.CharacterGenerator.Wizard.Create')}
    </button>
  {:else}
    <button
      type="button"
      class="wizard-step-button primary"
      data-action="next"
      disabled={!cannext}
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
