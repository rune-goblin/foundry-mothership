<script>
  import { localize } from '../../i18n.ts';
  import { PANES } from './steps.js';
  import { numberOf, titleOf } from './labels.js';

  let { draft, index, reachable, onpick } = $props();
</script>

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
          onclick={() => onpick(position)}
        >
          <span class="wizard-rail-number">{entry.numbered === false ? '★' : numberOf(entry)}</span>
          <span class="wizard-rail-title">{titleOf(entry, draft)}</span>
        </button>
      </li>
    {/each}
  </ol>
</nav>

<style>
  /* The rail is one of the system's black panels, where the paper face's roles invert. It reads
     the wizard's `--wizard-bar-*` and `--wizard-marker-size` vocabulary, which Wizard.svelte
     declares on the form it sits in — the whole window is rethemed from that one block. */
  @layer system {
    .wizard-rail {
      /* The wizard's grid gives the rail both rows: it stands beside the pane and its nav alike. */
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

    /* A ticked step keeps its number and gains the fill: the rail is a progress bar, and a step
       that swapped its number for a check would stop telling you which step it is. The fill is
       monochrome because the rail is — the current step inverts the whole row, so the marker
       inverts back rather than picking up a colour the system uses nowhere else. */
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
