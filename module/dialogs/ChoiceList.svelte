<script>
  // Rows are `role="radio"` buttons, not `<input type="radio">`: the dialog shell tier styles
  // every radio inside `.macro-popup-dialog` at specificity (0,3,1), which no scoped block here
  // can outrank, so owning the mark outright is the only way to control its appearance.
  let { options, value, onchange, lines = 2, label = '' } = $props();

  let group = $state(null);

  const index = $derived(Math.max(0, options.findIndex((option) => option.key === value)));

  const STEPS = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };

  function keydown(event) {
    // A focused row `<button>` answers Enter with its own click, swallowing the keystroke the
    // dialog's default (autofocus) button is meant to get — so Enter is forwarded here instead.
    if (event.key === 'Enter') {
      const primary = group?.closest('form')?.querySelector('.form-footer button[autofocus]');
      if (!primary) return;
      event.preventDefault();
      primary.click();
      return;
    }

    const step = STEPS[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const next = (index + step + options.length) % options.length;
    onchange(options[next].key);
    group?.querySelectorAll('.choice')[next]?.focus();
  }
</script>

<div
  class="choice-list"
  role="radiogroup"
  aria-label={label}
  bind:this={group}
  style="--choice-list-description-lines: {lines}"
>
  {#each options as option, position (option.key)}
    <button
      type="button"
      class="choice"
      class:muted={option.muted}
      role="radio"
      aria-checked={option.key === value}
      tabindex={position === index ? 0 : -1}
      data-choice={option.key}
      onclick={() => onchange(option.key)}
      onkeydown={keydown}
    >
      <span class="choice-mark" aria-hidden="true"></span>
      <span class="choice-name">{option.label}</span>
      <span class="choice-note">{option.note ?? ''}</span>
      <span class="choice-value">{option.value ?? ''}</span>
      <span class="choice-description">{@html option.description ?? ''}</span>
    </button>
  {/each}
</div>

<style>
  @layer system {
    .choice-list {
      --choice-list-gap: var(--space-4);

      display: flex;
      flex-direction: column;
      gap: var(--choice-list-gap);
    }

    .choice {
      --choice-list-row-columns: auto minmax(0, 1fr) auto auto;
      --choice-list-row-gap: var(--space-12);
      --choice-list-row-padding-block: var(--space-8);
      --choice-list-row-padding-inline: var(--space-12);
      --choice-list-row-radius: var(--radius-sm);
      --choice-list-row-surface: var(--color-neutral-100);
      --choice-list-row-hover-surface: var(--color-neutral-200);
      --choice-list-row-border-width: var(--border-width-1);
      --choice-list-row-border-color: var(--color-transparent);
      --choice-list-row-selected-surface: var(--surface-neutral-paper);
      --choice-list-row-selected-border-color: var(--border-neutral-medium);
      --choice-list-row-selected-marker-width: var(--border-width-3);
      --choice-list-row-selected-marker-color: var(--border-danger);

      display: grid;
      grid-template-columns: var(--choice-list-row-columns);
      align-items: center;
      column-gap: var(--choice-list-row-gap);
      width: 100%;
      /* Overrides Foundry's `height: var(--button-size)` (28px) on every button, which a row
         carrying a second line would otherwise overflow. */
      height: auto;
      min-height: 0;
      margin: var(--space-0);
      padding: var(--choice-list-row-padding-block) var(--choice-list-row-padding-inline);
      text-align: left;
      cursor: pointer;
      background: var(--choice-list-row-surface);
      border: var(--choice-list-row-border-width) solid var(--choice-list-row-border-color);
      border-left: var(--choice-list-row-selected-marker-width) solid var(--color-transparent);
      border-radius: var(--choice-list-row-radius);
      transition:
        background 90ms ease-out,
        border-color 90ms ease-out;
    }

    .choice:hover {
      --choice-list-row-surface: var(--choice-list-row-hover-surface);
    }

    .choice[aria-checked='true'] {
      --choice-list-row-surface: var(--choice-list-row-selected-surface);
      --choice-list-row-border-color: var(--choice-list-row-selected-border-color);

      border-left-color: var(--choice-list-row-selected-marker-color);
    }

    .choice:focus-visible {
      outline: var(--border-width-2) solid var(--border-neutral-ink);
      outline-offset: var(--space-2);
    }

    .choice-mark {
      --choice-list-mark-size: 15px;
      --choice-list-mark-border-width: var(--border-width-2);
      --choice-list-mark-border-color: var(--color-neutral-500);
      --choice-list-mark-surface: var(--surface-neutral-paper);
      --choice-list-mark-dot-size: 7px;
      --choice-list-mark-dot-color: var(--color-neutral-900);

      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      width: var(--choice-list-mark-size);
      height: var(--choice-list-mark-size);
      border: var(--choice-list-mark-border-width) solid var(--choice-list-mark-border-color);
      border-radius: var(--radius-full);
      background: var(--choice-list-mark-surface);
    }

    .choice-mark::before {
      content: '';
      width: var(--choice-list-mark-dot-size);
      height: var(--choice-list-mark-dot-size);
      border-radius: var(--radius-full);
      background: var(--choice-list-mark-dot-color);
      transform: scale(0);
      transition: transform 110ms ease-in-out;
    }

    .choice[aria-checked='true'] .choice-mark {
      --choice-list-mark-border-color: var(--choice-list-mark-dot-color);
    }

    .choice[aria-checked='true'] .choice-mark::before {
      transform: scale(1);
    }

    .choice-name {
      --choice-list-name-font-family: var(--font-sans-mothership);
      --choice-list-name-font-size: var(--font-size-lg);
      --choice-list-name-font-weight: var(--font-weight-semibold);
      --choice-list-name-text: var(--text-primary);

      font-family: var(--choice-list-name-font-family);
      font-size: var(--choice-list-name-font-size);
      font-weight: var(--choice-list-name-font-weight);
      line-height: var(--line-height-tight);
      color: var(--choice-list-name-text);
    }

    .choice.muted .choice-name {
      --choice-list-name-font-weight: var(--font-weight-normal);
      --choice-list-name-text: var(--text-secondary);
    }

    .choice-note {
      --choice-list-note-font-size: var(--font-size-sm);
      --choice-list-note-text: var(--text-secondary);

      font-family: var(--font-sans-mothership);
      font-size: var(--choice-list-note-font-size);
      color: var(--choice-list-note-text);
      text-align: right;
      white-space: nowrap;
    }

    /* Neutral, not red: red means "a condition is acting on this roll" everywhere else in the
       window, and this value isn't that. */
    .choice-value:not(:empty) {
      --choice-list-value-font-family: var(--font-display);
      --choice-list-value-font-size: var(--font-size-lg);
      --choice-list-value-font-weight: var(--font-weight-bold);
      --choice-list-value-text: var(--color-neutral-700);
      --choice-list-value-min-width: 46px;

      display: inline-block;
      min-width: var(--choice-list-value-min-width);
      padding: var(--space-4) var(--space-8);
      font-family: var(--choice-list-value-font-family);
      font-size: var(--choice-list-value-font-size);
      font-weight: var(--choice-list-value-font-weight);
      font-variant-numeric: tabular-nums;
      line-height: var(--line-height-none);
      text-align: center;
      color: var(--choice-list-value-text);
      border: var(--border-width-1) solid currentColor;
      border-radius: var(--radius-sm);
    }

    /* Fixed height regardless of content, so rows below never move as the selection travels.
       2 lines fits the longest skill description (114 chars); callers with longer text pass 3. */
    .choice-description {
      --choice-list-description-font-size: var(--font-size-sm);
      --choice-list-description-text: var(--color-neutral-800);
      /* Whole pixels, not a ratio: a fractional line-height rounds to a different pixel depending
         on where the row above happens to end, so the slot below shifts by one under itself. */
      --choice-list-description-line-height: 18px;
      --choice-list-description-lines: 2;

      grid-column: 2 / -1;
      height: 0;
      overflow: hidden;
      font-family: var(--font-sans-mothership);
      font-size: var(--choice-list-description-font-size);
      line-height: var(--choice-list-description-line-height);
      color: var(--choice-list-description-text);
    }

    .choice[aria-checked='true'] .choice-description {
      height: calc(
        var(--choice-list-description-lines) * var(--choice-list-description-line-height)
      );
      margin-top: var(--space-2);
    }

    /* Enriched descriptions arrive wrapped in a <p> whose margins would push the second line
       out of the fixed-height slot above. */
    .choice-description :global(p) {
      margin: var(--space-0);
    }
  }
</style>
