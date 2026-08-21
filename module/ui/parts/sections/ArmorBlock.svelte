<script>
  import ArmorBar from '../ArmorBar.svelte';
  import { localize } from '../../../i18n.ts';
  import { COVER_BONUS, COVER_EXAMPLES, COVER_KEYS, COVER_LABEL } from '../../../rules.ts';

  // armor.damageReduction is read-only here -- prepareDerivedData owns the arithmetic, and so is
  // a character's armour: deriveArmor sums it off the worn items into `mod`.
  //
  // `name` is the write path for armour points, and only the creature sheet has one. A horror
  // wears nothing, so its armour is the stored `value` deriveArmor folds into `total`; given the
  // path, the points cell becomes the field that sets it.
  let { armor, oncover, name, style } = $props();

  const points = $derived(name ? armor.value : armor.mod);
  const cover = $derived(armor.cover ?? 'none');
  const bonus = $derived(COVER_BONUS[cover]);

  const options = COVER_KEYS.map((key) => ({
    key,
    label: COVER_LABEL[key],
    examples: COVER_EXAMPLES[key],
    bonus: COVER_BONUS[key],
  }));

  let open = $state(false);

  const choose = (key) => () => {
    open = false;
    oncover?.(key);
  };

  // Escape closes from anywhere inside, and a blur that lands outside the menu closes it too:
  // a popover that outlives the pointer is worse than no popover.
  const onkeydown = (event) => {
    if (event.key === 'Escape') open = false;
  };

  const onfocusout = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) open = false;
  };
</script>

<div class="resource healthspread minmaxtopstat" {style}>
  <div class="resource-label minmaxtext">{localize('Mothership.Armor')}</div>

  <!-- Two rows of one table: what you are wearing, then what the room is lending you. The bar's
       own superscript is left to the cover prompt, which has no second row to put it in. -->
  <ArmorBar left={points} leftName={name} right={armor.damageReduction} />

  <div class={['cover-row', !bonus.armorPoints && !bonus.damageReduction && 'is-empty']}>
    <div class={['cover-cell', !bonus.armorPoints && 'is-zero']}>+{bonus.armorPoints}</div>
    <div class="slant"></div>
    <div class={['cover-cell', !bonus.damageReduction && 'is-zero']}>+{bonus.damageReduction}</div>
  </div>

  <div class="healthmaxtext">{localize('Mothership.AP')}</div>
  <div class="healthmaxtext">{localize('Mothership.DR')}</div>

  <!-- The handlers are the menu's, not a control's: Escape closes it from any of its buttons, and
       focus leaving the subtree closes it too. The buttons inside carry the semantics. -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="cover-menu" {onkeydown} {onfocusout}>
    <button
      type="button"
      class="cover-choice"
      aria-haspopup="listbox"
      aria-expanded={open}
      onclick={() => (open = !open)}
    >
      {localize(COVER_LABEL[cover])}
      <i class="fas fa-chevron-down" aria-hidden="true"></i>
    </button>

    {#if open}
      <ul class="cover-list" role="listbox" aria-label={localize('Mothership.Cover')}>
        {#each options as option (option.key)}
          <li role="option" aria-selected={option.key === cover}>
            <button
              type="button"
              class={['cover-option', option.key === cover && 'is-current']}
              onclick={choose(option.key)}
            >
              <span class="cover-option-name">{localize(option.label)}</span>
              <span class="cover-option-detail">
                <span>{localize(option.examples)}</span>
                <!-- The pair is one word: the two bonuses wrap together or not at all, so a long
                     line of examples never leaves the DR stranded on its own row. -->
                <b class="cover-option-bonus">
                  +{option.bonus.armorPoints} {localize('Mothership.AP')} · +{option.bonus
                    .damageReduction} {localize('Mothership.DR')}
                </b>
              </span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>

<style>
  @layer system {
    /* The armour bar's twin, in paper rather than ink: the same two columns and the same slant, so
       the pair reads as one table, but the borrowed row never outweighs the worn one. */
    .cover-row {
      --armorblock-cover-row-height: 26px;
      --armorblock-cover-row-font-family: var(--font-display);
      --armorblock-cover-row-font-size: var(--font-size-lg);
      --armorblock-cover-row-font-weight: var(--font-weight-bold);
      --armorblock-cover-row-text: var(--text-primary);
      --armorblock-cover-row-surface: var(--surface-neutral-paper);
      --armorblock-cover-row-border-width: var(--border-width-2);
      --armorblock-cover-row-border-color: var(--border-neutral-ink);

      grid-column: 1 / -1;
      display: grid;
      grid-template-columns: 1fr 1px 1fr;
      align-items: stretch;
      width: 100%;
      height: var(--armorblock-cover-row-height);
      margin-top: var(--space-4);
      border: var(--armorblock-cover-row-border-width) solid var(--armorblock-cover-row-border-color);
      border-radius: var(--radius-md);
      background: var(--armorblock-cover-row-surface);
    }

    .cover-row.is-empty {
      --armorblock-cover-row-border-color: var(--border-neutral-faint);
    }

    .cover-cell {
      display: grid;
      place-items: center;
      color: var(--armorblock-cover-row-text);
      font-family: var(--armorblock-cover-row-font-family);
      font-size: var(--armorblock-cover-row-font-size);
      font-weight: var(--armorblock-cover-row-font-weight);
      line-height: var(--line-height-none);
    }

    /* Upright, like the bar above it: ArmorBar unskews its own, and the two rows are one table. */
    .cover-row .slant {
      border-right-color: var(--armorblock-cover-row-border-color);
      transform: none;
    }

    .cover-cell.is-zero {
      --armorblock-cover-row-text: var(--text-muted);
    }

    /* The menu is the positioning context for its own list, and it spans the block so the list
       can match the chip's width rather than the cell's. */
    .cover-menu {
      grid-column: 1 / -1;
      position: relative;
      width: 100%;
    }

    /* Cover is a state, not a quantity, so the control naming it is a chip and not a fourth box --
       and it sits under the numbers it changes, because choosing one rewrites the row above. */
    .cover-choice {
      --armorblock-cover-min-height: 34px;
      --armorblock-cover-font-family: var(--font-display);
      --armorblock-cover-font-size: var(--font-size-md);
      --armorblock-cover-font-weight: var(--font-weight-bold);
      --armorblock-cover-text: var(--color-neutral-800);
      --armorblock-cover-surface: var(--surface-neutral-paper);
      --armorblock-cover-border-width: var(--border-width-3);
      --armorblock-cover-border-color: var(--border-neutral-ink);
      --armorblock-cover-radius: var(--radius-xl);
      --armorblock-cover-caret-scale: 0.6;
      --armorblock-cover-caret-opacity: 0.55;

      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-8);
      width: 100%;
      min-height: var(--armorblock-cover-min-height);
      margin-top: var(--space-6);
      padding: var(--space-4) var(--space-8);
      border: var(--armorblock-cover-border-width) solid var(--armorblock-cover-border-color);
      border-radius: var(--armorblock-cover-radius);
      background: var(--armorblock-cover-surface);
      color: var(--armorblock-cover-text);
      font-family: var(--armorblock-cover-font-family);
      font-size: var(--armorblock-cover-font-size);
      font-weight: var(--armorblock-cover-font-weight);
      /* Wraps rather than truncates: at the width the sheet gives this block, "Insignificant
         Cover" is one line too long already, and a translation can only be longer. */
      line-height: var(--line-height-tightest);
      text-align: center;
      cursor: pointer;
    }

    .cover-choice:hover,
    .cover-choice:focus-visible {
      background: var(--surface-neutral-lowest);
      color: var(--text-inverted);
    }

    .cover-choice i {
      font-size: calc(var(--armorblock-cover-caret-scale) * 1em);
      opacity: var(--armorblock-cover-caret-opacity);
    }

    .cover-choice[aria-expanded='true'] i {
      transform: rotate(180deg);
    }

    /* Absolute, and wider than the chip: the block is a narrow column, and four rows carrying a
       name over its examples cannot be read at that width. It overhangs to the side with room --
       the sheet puts this block at the right edge, so it opens leftwards. */
    .cover-list {
      --armorblock-list-width: 290px;
      --armorblock-list-surface: var(--surface-neutral-paper);
      --armorblock-list-border-width: var(--border-width-3);
      --armorblock-list-border-color: var(--border-neutral-ink);
      --armorblock-list-radius: var(--radius-md);
      --armorblock-list-shadow: var(--shadow-glow-soft);

      position: absolute;
      z-index: 10;
      top: calc(100% + var(--space-4));
      right: 0;
      width: max(100%, var(--armorblock-list-width));
      margin: 0;
      padding: 0;
      list-style: none;
      border: var(--armorblock-list-border-width) solid var(--armorblock-list-border-color);
      border-radius: var(--armorblock-list-radius);
      background: var(--armorblock-list-surface);
      box-shadow: var(--armorblock-list-shadow);
      overflow: hidden;
    }

    .cover-option {
      --armorblock-option-name-font-size: var(--font-size-lg);
      --armorblock-option-detail-font-size: var(--font-size-xs);
      --armorblock-option-detail-text: var(--text-secondary);

      display: flex;
      flex-direction: column;
      align-items: start;
      gap: var(--space-2);
      width: 100%;
      /* Foundry gives every button a fixed height from --input-height, which crushes a row
         carrying two lines. */
      height: auto;
      min-height: 0;
      padding: var(--space-8) var(--space-10);
      border: 0;
      border-radius: 0;
      background: transparent;
      font-family: var(--font-display);
      line-height: var(--line-height-tight);
      text-align: left;
      cursor: pointer;
    }

    .cover-menu li + li .cover-option {
      border-top: var(--border-width-1) solid var(--border-neutral-medium);
    }

    .cover-option-name {
      color: var(--text-primary);
      font-size: var(--armorblock-option-name-font-size);
      font-weight: var(--font-weight-bold);
      line-height: var(--line-height-none);
    }

    /* One line of small print carrying what the cover looks like and what it is worth: the
       examples read as prose, the two bonuses as the numbers they are. */
    .cover-option-detail {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2) var(--space-8);
      color: var(--armorblock-option-detail-text);
      font-family: var(--font-sans-mothership);
      font-size: var(--armorblock-option-detail-font-size);
      line-height: var(--line-height-tight);
    }

    .cover-option-bonus {
      color: var(--text-primary);
      font-family: var(--font-display);
      white-space: nowrap;
    }

    .cover-option:hover,
    .cover-option:focus-visible {
      background: var(--surface-neutral-lowest);
    }

    .cover-option:hover .cover-option-name,
    .cover-option:focus-visible .cover-option-name,
    .cover-option:hover .cover-option-detail,
    .cover-option:focus-visible .cover-option-detail,
    .cover-option:hover .cover-option-bonus,
    .cover-option:focus-visible .cover-option-bonus {
      color: var(--text-inverted);
    }

    .cover-option.is-current .cover-option-name::after {
      content: '\2713';
      margin-inline-start: var(--space-6);
    }
  }
</style>
