<script>
  /**
   * One row per choice: a name, an optional rank word, an optional number, and — on the chosen row
   * only — its description. Four dialogs used to draw this list four ways, each with its own
   * `grid-template-columns` string written inline on the markup.
   *
   * The rows are `role="radio"` buttons rather than `<input type="radio">`. The dialog shell tier
   * styles every radio inside `.macro-popup-dialog` at (0,3,1), which no scoped block here can
   * outrank, so owning the mark outright is the only way this component can own its appearance.
   */
  let { options, value, onchange, lines = 2, label = '' } = $props();

  let group = $state(null);

  const index = $derived(Math.max(0, options.findIndex((option) => option.key === value)));

  const STEPS = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };

  function keydown(event) {
    // Enter belongs to the dialog, not to the list. DialogV2 marks its default button `autofocus`
    // and the form submits through it, but a focused `<button>` answers Enter with a click of its
    // own — so a row that had been clicked would swallow the one keystroke the window promises.
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
  /* Svelte emits component CSS unlayered, which would outrank every layered rule; @layer system
     puts these in the slot the rest of the system occupies. */
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
      /* The chosen row is the one lifted off the list onto the page, and marked at its inner edge. */
      --choice-list-row-selected-surface: var(--surface-neutral-paper);
      --choice-list-row-selected-border-color: var(--border-neutral-medium);
      --choice-list-row-selected-marker-width: var(--border-width-3);
      --choice-list-row-selected-marker-color: var(--border-danger);

      display: grid;
      grid-template-columns: var(--choice-list-row-columns);
      align-items: center;
      column-gap: var(--choice-list-row-gap);
      width: 100%;
      /* Foundry pins every `button` to `height: var(--button-size)` — 28px — which a row carrying a
         second line silently overflows: the description lays itself out below the box the button
         paints. A row is sized by what is in it. */
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

    /* The row that adds nothing — "No Skill". It is an option, not an achievement. */
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

    /* The number the row is worth: a skill's bonus, or a stat's value. One neutral treatment for
       every rank — red carries "a condition is acting on this roll" everywhere else in the window,
       and a Master skill is not that. */
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

    /* The slot is a fixed number of lines whether the chosen row needs them or not, so the rows
       below never move as the selection travels. Two lines holds every skill description the book
       ships (longest 114 characters); the Stat and Save examples ask for three (longest 125). */
    .choice-description {
      --choice-list-description-font-size: var(--font-size-sm);
      --choice-list-description-text: var(--color-neutral-800);
      /* Whole pixels, not a ratio. The slot is a multiple of this, and `--line-height-tight` times
         13.6px is 18.36 — a fractional slot lands on a different pixel depending on where the row
         above it happens to end, which is a row that shifts by one under itself. */
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

    /* Skill descriptions arrive enriched, so they come wrapped in a paragraph the row did not
       write and whose margins would push the second line out of the slot. */
    .choice-description :global(p) {
      margin: var(--space-0);
    }
  }
</style>
