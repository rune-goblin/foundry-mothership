<script>
  // The one list this system selects from: the roll prompts pick a Stat or a Skill through it,
  // the sheets add a pack document through it. It is a real table — the columns are `<col>`s, the
  // description spans its row with `colspan` and the trailing cell holds both rows with `rowspan`,
  // so nothing here computes a track or offsets a slot.
  // Selection is a native radio group, which is what makes arrow-key navigation, `Enter` reaching
  // the dialog's default button, and the checked state all work without a line of code.
  let {
    options,
    value,
    onchange,
    /** How many lines of description the open row reserves, whether or not it fills them. */
    lines = 2,
    label = '',
    /** First entry names the label column, the rest name the cells. Empty draws no header row. */
    headers = [],
    /** Non-empty draws the filter field, which matches on each option's label. */
    filterLabel = '',
    /** Drawn beside the filter field — the picker's prerequisite toggle, so far. */
    aside = null,
    /** Drawn in a cell of its own down the right, holding both of the option's rows. */
    trailing = null,
    /** Opens every description at once, for a list whose descriptions are the choice itself. */
    expanded = false,
  } = $props();

  // Two lists on one page must not share a radio group, and a row's label must point at its own
  // input: both need a name no caller has to supply.
  const uid = $props.id();

  let filter = $state('');

  const needle = $derived(filter.trim().toLowerCase());
  const visible = $derived(
    needle === ''
      ? options
      : options.filter((option) => option.label.toLowerCase().includes(needle)),
  );

  const icons = $derived(options.some((option) => option.img));
  const cellCount = $derived(
    headers.length > 0
      ? headers.length - 1
      : options.reduce((most, option) => Math.max(most, option.cells?.length ?? 0), 0),
  );
  const cellIndexes = $derived([...Array(cellCount).keys()]);

  /** A cell is its own text, unless it is the `{ text, boxed }` form the prompts use. */
  const wrapped = (cell) => cell !== null && typeof cell === 'object';
  const text = (cell) => (wrapped(cell) ? cell.text : (cell ?? ''));
  const boxed = (cell) => wrapped(cell) && cell.boxed === true;

  const pick = (option) => () => {
    if (option.disabled !== true) onchange(option.key);
  };
</script>

<div class="choice-list" style="--choice-list-description-lines: {lines}">
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

  <!-- A filterable list is a long one — the packs run to dozens of rows — so it scrolls under its
       own header rather than growing the window past the screen. -->
  <div class="choice-scroll" class:is-capped={filterLabel !== ''}>
    <table class="choice-table" aria-label={label}>
      <colgroup>
        <col class="choice-col-mark" />
        {#if icons}<col class="choice-col-icon" />{/if}
        <col class="choice-col-name" />
        {#each cellIndexes as at (at)}
          <col class="choice-col-cell" class:is-measured={headers.length > 0} />
        {/each}
        {#if trailing}<col class="choice-col-trailing" />{/if}
      </colgroup>

      {#if headers.length > 0}
        <thead>
          <tr>
            <td></td>
            {#if icons}<td></td>{/if}
            {#each headers as header, at (at)}
              <th scope="col" class:is-name={at === 0}>{header}</th>
            {/each}
            {#if trailing}<td></td>{/if}
          </tr>
        </thead>
      {/if}

      <tbody>
        {#each visible as option (option.key)}
          <tr
            class="choice"
            class:is-selected={option.key === value}
            class:is-muted={option.muted}
            class:is-disabled={option.disabled === true}
            data-choice={option.key}
            onclick={pick(option)}
          >
            <td class="choice-mark-cell">
              <span class="choice-mark-slot">
                <input
                  class="choice-input"
                  type="radio"
                  name="choice-{uid}"
                  id="choice-{uid}-{option.key}"
                  value={option.key}
                  checked={option.key === value}
                  disabled={option.disabled === true}
                  onchange={pick(option)}
                />
                <span class="choice-mark" aria-hidden="true"></span>
              </span>
            </td>
            {#if icons}
              <td>
                {#if option.img}<img class="choice-icon" src={option.img} alt="" />{/if}
              </td>
            {/if}
            <th scope="row" class="choice-name">
              <label for="choice-{uid}-{option.key}">{option.label}</label>
            </th>
            {#each cellIndexes as at (at)}
              <td class="choice-cell" class:is-boxed={boxed(option.cells?.[at])}>
                {text(option.cells?.[at])}
              </td>
            {/each}
            {#if trailing}
              <td rowspan={option.description ? 2 : 1}>
                {@render trailing(option)}
              </td>
            {/if}
          </tr>

          {#if option.description}
            <tr
              class="choice-description-row"
              class:is-open={expanded || option.key === value}
              data-description={option.key}
            >
              <td></td>
              {#if icons}<td></td>{/if}
              <td colspan={1 + cellCount}>
                <div class="choice-description">{@html option.description}</div>
              </td>
            </tr>
          {/if}
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  @layer system {
    .choice-list {
      --choice-list-gap: var(--space-8);

      display: flex;
      flex-direction: column;
      gap: var(--choice-list-gap);
      min-width: 0;
    }

    .choice-filter {
      display: flex;
      align-items: center;
      gap: var(--space-12);
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

    .choice-scroll.is-capped {
      --choice-list-max-height: 384px;

      max-height: var(--choice-list-max-height);
      overflow-y: auto;
    }

    .choice-table {
      --choice-list-cell-padding-block: var(--space-8);
      --choice-list-cell-padding-inline: var(--space-10);
      --choice-list-marker-width: var(--border-width-3);

      width: 100%;
      /* Collapsed so a row rule is one line and the marker below can live on the `<tr>` itself. */
      border-collapse: collapse;
      font-family: var(--font-sans-mothership);
    }

    .choice-col-mark {
      width: calc(var(--choice-list-marker-width) + 32px);
    }

    .choice-col-icon {
      width: 46px;
    }

    /* 100% is the shrink-wrap idiom, not a real width: under auto layout it makes this the one
       column that takes the slack, so every other column sizes to its content or its `<col>`. */
    .choice-col-name {
      width: 100%;
    }

    .choice-col-cell.is-measured {
      width: 88px;
    }

    .choice-col-trailing {
      width: 190px;
    }

    /* Foundry themes bare `<table>` elements — a frame, and a fill on every row. None of it is
       reachable from a component that doesn't reset it first. */
    .choice-table,
    .choice-table :is(thead, tbody, tr, td, th) {
      background: var(--color-transparent);
    }

    /* `tr` is left out: the row rule and the selected marker below are borders on the row
       itself, and this reset would outrank them. */
    .choice-table,
    .choice-table :is(thead, tbody, td, th) {
      border: none;
    }

    .choice-table td,
    .choice-table th {
      padding: var(--choice-list-cell-padding-block) var(--choice-list-cell-padding-inline);
      vertical-align: middle;
      text-align: left;
    }

    /* Right, and in one place: the measured columns are numbers and short values, and they read
       against the column edge whether or not a header names them. */
    .choice-table :is(.choice-cell, thead th) {
      text-align: right;
    }

    /* Sticks so the columns stay named while a pack list of dozens scrolls beneath them. */
    .choice-table thead th,
    .choice-table thead td {
      --choice-list-header-font-size: var(--font-size-sm);
      --choice-list-header-text: var(--text-secondary);
      --choice-list-header-rule-color: var(--border-neutral-medium);

      position: sticky;
      top: 0;
      z-index: 1;
      padding-top: var(--space-0);
      font-size: var(--choice-list-header-font-size);
      font-weight: var(--font-weight-semibold);
      color: var(--choice-list-header-text);
      background: var(--surface-neutral-paper);
      border-bottom: var(--border-width-1) solid var(--choice-list-header-rule-color);
    }

    .choice-table thead th.is-name {
      text-align: left;
    }

    .choice {
      --choice-list-row-rule-color: var(--border-neutral-strong);
      --choice-list-row-hover-surface: var(--color-neutral-100);
      --choice-list-row-selected-surface: var(--color-neutral-100);
      --choice-list-row-marker-color: var(--border-danger);

      cursor: pointer;
      border-top: var(--border-width-1) solid var(--choice-list-row-rule-color);
      border-left: var(--choice-list-marker-width) solid var(--color-transparent);
      transition:
        background 90ms ease-out,
        border-color 90ms ease-out;
    }

    .choice-description-row {
      border-left: var(--choice-list-marker-width) solid var(--color-transparent);
    }

    tbody .choice:first-child {
      border-top-color: var(--color-transparent);
    }

    .choice:hover:not(.is-disabled) {
      background: var(--choice-list-row-hover-surface);
    }

    .choice.is-selected,
    .choice.is-selected + .choice-description-row {
      background: var(--choice-list-row-selected-surface);
      border-left-color: var(--choice-list-row-marker-color);
    }

    .choice.is-disabled {
      cursor: default;
      opacity: 0.4;
    }

    .choice-mark-cell {
      padding-right: var(--space-0);
    }

    .choice-mark-slot {
      position: relative;
      display: inline-grid;
    }

    /* The radio itself is the semantics and the keyboard: one native group per list gives arrow
       navigation and the checked state for free. It is laid over the mark at zero opacity rather
       than styled, because Foundry's core theme reaches `input[type="radio"]` from outside every
       layer — its accent colour and glow cannot be overridden from here without `!important`.
       Covering the mark rather than being clipped away keeps it the hit target it claims to be. */
    .choice-input {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      margin: var(--space-0);
      padding: var(--space-0);
      opacity: 0;
      cursor: inherit;
    }

    .choice-mark {
      --choice-list-mark-size: 15px;
      --choice-list-mark-border-color: var(--color-neutral-500);
      --choice-list-mark-surface: var(--surface-neutral-paper);
      --choice-list-mark-dot-color: var(--color-neutral-900);
      --choice-list-mark-dot-size: 7px;

      display: grid;
      place-items: center;
      box-sizing: border-box;
      width: var(--choice-list-mark-size);
      height: var(--choice-list-mark-size);
      background: var(--choice-list-mark-surface);
      border: var(--border-width-2) solid var(--choice-list-mark-border-color);
      border-radius: var(--radius-full);
    }

    .choice-mark::before {
      content: '';
      width: var(--choice-list-mark-dot-size);
      height: var(--choice-list-mark-dot-size);
      background: var(--choice-list-mark-dot-color);
      border-radius: var(--radius-full);
      transform: scale(0);
      transition: transform 110ms ease-in-out;
    }

    .choice-input:checked + .choice-mark {
      --choice-list-mark-border-color: var(--choice-list-mark-dot-color);
    }

    .choice-input:checked + .choice-mark::before {
      transform: scale(1);
    }

    .choice-input:focus-visible + .choice-mark {
      outline: var(--border-width-2) solid var(--border-neutral-ink);
      outline-offset: var(--space-2);
    }

    .choice-icon {
      --choice-list-icon-size: 34px;

      display: block;
      width: var(--choice-list-icon-size);
      height: var(--choice-list-icon-size);
      object-fit: contain;
      border: none;
    }

    .choice-name {
      --choice-list-name-font-size: var(--font-size-lg);
      --choice-list-name-text: var(--text-primary);

      font-size: var(--choice-list-name-font-size);
      font-weight: var(--font-weight-semibold);
      line-height: var(--line-height-tight);
      color: var(--choice-list-name-text);
    }

    .choice-name label {
      cursor: inherit;
    }

    .choice.is-muted .choice-name {
      --choice-list-name-text: var(--text-secondary);

      font-weight: var(--font-weight-normal);
    }

    .choice-cell {
      --choice-list-cell-font-size: var(--font-size-sm);
      --choice-list-cell-text: var(--text-secondary);

      font-size: var(--choice-list-cell-font-size);
      font-variant-numeric: tabular-nums;
      color: var(--choice-list-cell-text);
      white-space: nowrap;
    }

    /* Neutral, not red: red means "a condition is acting on this roll" everywhere else in the
       window, and this value isn't that. */
    .choice-cell.is-boxed:not(:empty) {
      --choice-list-boxed-min-width: 46px;
      --choice-list-boxed-font-size: var(--font-size-lg);
      --choice-list-boxed-text: var(--color-neutral-700);

      font-family: var(--font-display);
      font-size: var(--choice-list-boxed-font-size);
      min-width: var(--choice-list-boxed-min-width);
      font-weight: var(--font-weight-bold);
      color: var(--choice-list-boxed-text);
      text-align: center;
      /* An inset shadow, not a border: a border on a cell of a collapsed table is resolved
         against its neighbours' and would draw the box's edges onto the row rules. */
      box-shadow: inset 0 0 0 var(--border-width-1) currentColor;
      border-radius: var(--radius-sm);
    }

    .choice-description-row td {
      padding-top: var(--space-0);
      padding-bottom: var(--space-0);
    }

    /* A slot of a fixed number of lines, so the rows below never move as the selection travels.
       2 lines fits the longest skill description (114 chars); callers with longer text pass 3. */
    .choice-description {
      --choice-list-description-font-size: var(--font-size-sm);
      --choice-list-description-text: var(--color-neutral-800);
      /* Whole pixels, not a ratio: a fractional line-height rounds to a different pixel depending
         on where the row above happens to end, so the slot below shifts by one under itself. */
      --choice-list-description-line-height: 18px;

      height: 0;
      overflow: hidden;
      font-size: var(--choice-list-description-font-size);
      line-height: var(--choice-list-description-line-height);
      color: var(--choice-list-description-text);
    }

    .choice-description-row.is-open .choice-description {
      height: calc(
        var(--choice-list-description-lines) * var(--choice-list-description-line-height)
      );
      padding-bottom: var(--choice-list-cell-padding-block);
    }

    /* Enriched descriptions arrive wrapped in a <p> whose margins would push the last line out of
       the fixed-height slot above. */
    .choice-description :global(p) {
      margin: var(--space-0);
    }
  }
</style>
