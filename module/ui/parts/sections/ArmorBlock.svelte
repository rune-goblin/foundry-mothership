<script>
  import ArmorBar from '../ArmorBar.svelte';
  import { localize } from '../../../i18n.ts';
  import { COVER_BONUS, COVER_LABEL } from '../../../rules.ts';

  // armor.mod/damageReduction are read-only here -- prepareDerivedData owns the arithmetic.
  let { armor, onchoose, style } = $props();

  const cover = $derived(armor.cover ?? 'none');
  const bonus = $derived(COVER_BONUS[cover]);
</script>

<div class="resource healthspread minmaxtopstat" {style}>
  <div class="resource-label minmaxtext">{localize('Mothership.Armor')}</div>

  <!-- Two rows of one table: what you are wearing, then what the room is lending you. The bar's
       own superscript is left to the cover prompt, which has no second row to put it in. -->
  <ArmorBar left={armor.mod} right={armor.damageReduction} />

  <div class={['cover-row', !bonus.armorPoints && !bonus.damageReduction && 'is-empty']}>
    <div class={['cover-cell', !bonus.armorPoints && 'is-zero']}>+{bonus.armorPoints}</div>
    <div class="slant"></div>
    <div class={['cover-cell', !bonus.damageReduction && 'is-zero']}>+{bonus.damageReduction}</div>
  </div>

  <div class="healthmaxtext">{localize('Mothership.AP')}</div>
  <div class="healthmaxtext">{localize('Mothership.DR')}</div>

  <button type="button" class="cover-choice" onclick={onchoose}>
    {localize(COVER_LABEL[cover])}
    <i class="fas fa-chevron-down" aria-hidden="true"></i>
  </button>
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

      grid-column: 1 / -1;
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
  }
</style>
