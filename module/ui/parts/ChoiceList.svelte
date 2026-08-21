<script>
  // The one list this system selects from: the prompts pick a stat or a skill through it, the
  // sheets add a pack document through it. Rows are `role="radio"` buttons, not
  // `<input type="radio">`: the dialog shell tier styles every radio inside `.macro-popup-dialog`
  // at specificity (0,3,1), which no scoped block here can outrank, so owning the mark outright is
  // the only way to control its appearance.
  // `expanded` keeps every row's description open: a list whose descriptions are the choice
  // itself, rather than a gloss on the row already picked.
  let {
    options,
    value,
    onchange,
    lines = 2,
    label = '',
    /** First entry names the label column, the rest name the cells. Empty draws no header row. */
    headers = [],
    /** Non-empty draws the filter field, which matches on each option's label. */
    filterLabel = '',
    /** Drawn beside the filter field — the picker's prerequisite toggle, so far. */
    aside = null,
    trailing = null,
    expanded = false,
  } = $props();

  let group = $state(null);
  let filter = $state('');

  const needle = $derived(filter.trim().toLowerCase());
  const visible = $derived(
    needle === ''
      ? options
      : options.filter((option) => option.label.toLowerCase().includes(needle)),
  );

  const index = $derived(Math.max(0, visible.findIndex((option) => option.key === value)));

  const icons = $derived(options.some((option) => option.img));
  const cells = $derived(
    headers.length > 0
      ? headers.length - 1
      : options.reduce((most, option) => Math.max(most, option.cells?.length ?? 0), 0),
  );

  // Headers only align over cells of a declared width; a list without them lets each cell size
  // itself, which is what the prompts' single value column wants.
  const columns = $derived(
    [
      'auto',
      ...(icons ? ['auto'] : []),
      'minmax(0, 1fr)',
      ...Array(cells).fill(headers.length > 0 ? 'var(--choice-list-cell-width)' : 'auto'),
      ...(trailing ? ['auto'] : []),
    ].join(' '),
  );

  const descriptionStart = $derived(icons ? 3 : 2);
  const cellIndexes = $derived([...Array(cells).keys()]);

  const text = (cell) => (typeof cell === 'string' ? cell : cell.text);
  const boxed = (cell) => typeof cell !== 'string' && cell.boxed === true;

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

    // Walks past barred rows rather than stopping on one; a full lap means every row is barred.
    for (let hop = 1; hop <= visible.length; hop++) {
      const next = (index + step * hop + visible.length * hop) % visible.length;
      if (visible[next].disabled === true) continue;
      onchange(visible[next].key);
      group?.querySelectorAll('.choice')[next]?.focus();
      return;
    }
  }
</script>

<div
  class="choice-list"
  class:is-expanded={expanded}
  class:is-filterable={filterLabel !== ''}
  style="--choice-list-columns: {columns}; --choice-list-description-start: {descriptionStart}; --choice-list-description-lines: {lines}"
>
  {#if filterLabel !== ''}
    <div class="choice-filter">
      <input
        type="text"
        id="choice-filter"
        class="choice-filter-input"
        placeholder={filterLabel}
        aria-label={filterLabel}
        bind:value={filter}
      />
      {@render aside?.()}
    </div>
  {/if}

  {#if headers.length > 0}
    <div class="choice-header" aria-hidden="true">
      <span></span>
      {#if icons}<span></span>{/if}
      {#each headers as header, at (at)}
        <span class="choice-header-cell" class:is-label={at === 0}>{header}</span>
      {/each}
    </div>
  {/if}

  <div class="choice-rows" role="radiogroup" aria-label={label} bind:this={group}>
    {#each visible as option, position (option.key)}
      <button
        type="button"
        class="choice"
        class:muted={option.muted}
        class:has-icon={icons}
        class:has-trailing={trailing}
        role="radio"
        aria-checked={option.key === value}
        disabled={option.disabled === true}
        tabindex={position === index ? 0 : -1}
        data-choice={option.key}
        onclick={() => onchange(option.key)}
        onkeydown={keydown}
      >
        <span class="choice-mark" aria-hidden="true"></span>
        {#if icons}<img class="choice-icon" src={option.img ?? ''} alt="" />{/if}
        <span class="choice-name">{option.label}</span>
        {#each cellIndexes as at (at)}
          <span class="choice-cell" class:is-boxed={boxed(option.cells?.[at] ?? '')}
            >{text(option.cells?.[at] ?? '')}</span
          >
        {/each}
        {#if trailing}
          <span class="choice-trailing">{@render trailing(option)}</span>
        {/if}
        <span class="choice-description">{@html option.description ?? ''}</span>
      </button>
    {/each}
  </div>
</div>

<style>
  @layer system {
    .choice-list {
      --choice-list-gap: var(--space-8);
      --choice-list-cell-width: 76px;
      --choice-list-row-gap: var(--space-12);
      --choice-list-row-padding-inline: var(--space-8);

      display: flex;
      flex-direction: column;
      gap: var(--choice-list-gap);
      min-width: 0;
    }

    .choice-filter {
      --choice-list-filter-gap: var(--space-12);

      display: flex;
      align-items: center;
      gap: var(--choice-list-filter-gap);
    }

    .choice-filter-input {
      --choice-list-filter-font-size: var(--font-size-md);
      --choice-list-filter-surface: var(--surface-neutral-paper);
      --choice-list-filter-border-color: var(--border-neutral-medium);
      --choice-list-filter-text: var(--text-primary);
      --choice-list-filter-placeholder-text: var(--text-tertiary);

      flex: 1 1 auto;
      min-width: 0;
      height: auto;
      padding: var(--space-6) var(--space-10);
      font-family: var(--font-sans-mothership);
      font-size: var(--choice-list-filter-font-size);
      color: var(--choice-list-filter-text);
      background: var(--choice-list-filter-surface);
      border: var(--border-width-1) solid var(--choice-list-filter-border-color);
      border-radius: var(--radius-sm);
    }

    .choice-filter-input::placeholder {
      color: var(--choice-list-filter-placeholder-text);
    }

    .choice-filter-input:focus {
      border-color: var(--border-neutral-ink);
      outline: none;
    }

    /* Names the columns the rows print, so the numbers under them need no repeated label. */
    .choice-header {
      --choice-list-header-font-size: var(--font-size-sm);
      --choice-list-header-text: var(--text-secondary);
      --choice-list-header-rule-color: var(--border-neutral-medium);

      display: grid;
      grid-template-columns: var(--choice-list-columns);
      align-items: end;
      column-gap: var(--choice-list-row-gap);
      padding: var(--space-0) var(--choice-list-row-padding-inline) var(--space-6);
      /* Matches the marker track every row reserves, so a header sits over its own column. */
      border-left: var(--border-width-3) solid var(--color-transparent);
      border-bottom: var(--border-width-1) solid var(--choice-list-header-rule-color);
      font-family: var(--font-sans-mothership);
      font-size: var(--choice-list-header-font-size);
      font-weight: var(--font-weight-semibold);
      color: var(--choice-list-header-text);
    }

    .choice-header-cell {
      text-align: right;
    }

    .choice-header-cell.is-label {
      text-align: left;
    }

    .choice-rows {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    /* A filterable list is a long one — the packs run to dozens of rows — so it scrolls under
       its own header rather than growing the window past the screen. */
    .is-filterable .choice-rows {
      --choice-list-max-height: 384px;

      max-height: var(--choice-list-max-height);
      overflow-y: auto;
    }

    .choice {
      --choice-list-row-padding-block: var(--space-8);
      --choice-list-row-surface: var(--color-transparent);
      --choice-list-row-hover-surface: var(--color-neutral-100);
      --choice-list-row-rule-color: var(--border-neutral-strong);
      --choice-list-row-selected-surface: var(--color-neutral-100);
      --choice-list-row-selected-marker-width: var(--border-width-3);
      --choice-list-row-selected-marker-color: var(--border-danger);
      /* Which tracks the description spans — from the column after the name's, which an icon row
         pushes along by one, up to the trailing cell where a row has one. */
      --choice-list-description-start: 2;
      --choice-list-description-end: -1;

      display: grid;
      grid-template-columns: var(--choice-list-columns);
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
      border: none;
      border-radius: var(--radius-none);
      border-left: var(--choice-list-row-selected-marker-width) solid var(--color-transparent);
      border-bottom: var(--border-width-1) solid var(--choice-list-row-rule-color);
      transition:
        background 90ms ease-out,
        border-color 90ms ease-out;
    }

    .choice:last-child {
      border-bottom-color: var(--color-transparent);
    }

    .choice.has-trailing {
      --choice-list-description-end: -2;
    }

    .choice:hover:not(:disabled) {
      --choice-list-row-surface: var(--choice-list-row-hover-surface);
    }

    .choice:disabled {
      cursor: default;
      opacity: 0.4;
    }

    .choice[aria-checked='true'] {
      --choice-list-row-surface: var(--choice-list-row-selected-surface);

      border-left-color: var(--choice-list-row-selected-marker-color);
    }

    .choice:focus-visible {
      outline: var(--border-width-2) solid var(--border-neutral-ink);
      outline-offset: calc(var(--space-2) * -1);
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

    .choice-icon {
      --choice-list-icon-size: 34px;

      width: var(--choice-list-icon-size);
      height: var(--choice-list-icon-size);
      object-fit: contain;
      border: none;
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

    .choice-cell {
      --choice-list-cell-font-size: var(--font-size-sm);
      --choice-list-cell-text: var(--text-secondary);

      font-family: var(--font-sans-mothership);
      font-size: var(--choice-list-cell-font-size);
      font-variant-numeric: tabular-nums;
      color: var(--choice-list-cell-text);
      text-align: right;
      white-space: nowrap;
    }

    /* Neutral, not red: red means "a condition is acting on this roll" everywhere else in the
       window, and this value isn't that. */
    .choice-cell.is-boxed:not(:empty) {
      --choice-list-cell-font-family: var(--font-display);
      --choice-list-cell-boxed-font-size: var(--font-size-lg);
      --choice-list-cell-boxed-text: var(--color-neutral-700);
      --choice-list-cell-boxed-min-width: 46px;

      display: inline-block;
      min-width: var(--choice-list-cell-boxed-min-width);
      padding: var(--space-4) var(--space-8);
      font-family: var(--choice-list-cell-font-family);
      font-size: var(--choice-list-cell-boxed-font-size);
      font-weight: var(--font-weight-bold);
      line-height: var(--line-height-none);
      text-align: center;
      color: var(--choice-list-cell-boxed-text);
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

      grid-column: var(--choice-list-description-start) / var(--choice-list-description-end);
      height: 0;
      overflow: hidden;
      font-family: var(--font-sans-mothership);
      font-size: var(--choice-list-description-font-size);
      line-height: var(--choice-list-description-line-height);
      color: var(--choice-list-description-text);
    }

    .choice[aria-checked='true'] .choice-description:not(:empty),
    .is-expanded .choice-description:not(:empty) {
      height: calc(
        var(--choice-list-description-lines) * var(--choice-list-description-line-height)
      );
      margin-top: var(--space-2);
    }

    /* Whatever the caller draws here sizes itself. It spans both rows so a cell taller than the
       label cannot push the description away from the name it belongs to. */
    .choice-trailing {
      --choice-list-trailing-width: 190px;

      /* Positioned rather than auto-placed: an item with a definite row is placed before the
         auto-placed ones, and would otherwise take the first column instead of the last. */
      grid-column: -2 / -1;
      grid-row: 1 / span 2;
      align-self: center;
      width: var(--choice-list-trailing-width);
    }

    /* Enriched descriptions arrive wrapped in a <p> whose margins would push the second line
       out of the fixed-height slot above. */
    .choice-description :global(p) {
      margin: var(--space-0);
    }
  }
</style>
