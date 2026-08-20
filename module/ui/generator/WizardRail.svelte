<script>
  import { STEPS, stepNumber, stepTitle } from './steps.js';
  import { localize } from '../../i18n.ts';

  let { draft, index, progress, reachable, onpick } = $props();
</script>

<nav class="wizard-rail" aria-label={localize('Mothership.CharacterGenerator.Wizard.Steps')}>
  <ol>
    {#each STEPS as step, position (step.id)}
      <li>
        <button
          type="button"
          class="wizard-rail-step"
          class:current={index === position}
          class:complete={progress[position]}
          disabled={!reachable(position)}
          data-pane={step.id}
          onclick={() => onpick(position)}
        >
          <span class="wizard-rail-number">{step.numbered === false ? '★' : stepNumber(step)}</span>
          <span class="wizard-rail-title">{stepTitle(step, draft)}</span>
        </button>
      </li>
    {/each}
  </ol>
</nav>

<style>
  /* Reads the `--wizard-bar-*` and `--wizard-marker-size` vocabulary Wizard.svelte declares. */
  @layer system {
    .wizard-rail {
      /* Spans both grid rows: the rail stands beside both the pane and its nav. */
      grid-row: 1 / span 2;
      overflow-y: auto;
      padding: var(--wizard-pad) var(--space-8);
      background: var(--wizard-bar-surface);
      color: var(--wizard-bar-ink);
    }

    .wizard-rail ol {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .wizard-rail-step {
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
      /* Foundry pins <button> height AND min-height; releasing only one still let a two-line
         entry overflow and spill onto the rail. Every button in this window needs both released. */
      height: auto;
      min-height: var(--wizard-marker-size);
      font-family: var(--font-display);
      font-size: var(--font-size-sm);
      text-align: left;
      cursor: pointer;
    }

    .wizard-rail-step:disabled {
      color: var(--wizard-bar-ink-disabled);
      cursor: default;
    }

    .wizard-rail-step.current {
      background: var(--wizard-bar-fill);
      color: var(--wizard-bar-surface);
    }

    .wizard-rail-number {
      display: grid;
      place-items: center;
      width: var(--wizard-marker-size);
      height: var(--wizard-marker-size);
      border: var(--border-width-2) solid currentcolor;
      border-radius: var(--radius-full);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-bold);
    }

    .wizard-rail-step.complete .wizard-rail-number {
      background: var(--wizard-bar-fill);
      color: var(--wizard-bar-surface);
    }

    .wizard-rail-step.current.complete .wizard-rail-number {
      background: var(--wizard-bar-surface);
      color: var(--wizard-bar-ink);
    }
  }
</style>
