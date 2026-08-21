<script>
  // Decorative: every caller wraps it in the control that already carries the roll's label.
  // `solid` is for labels printed on a black ground, where the muted grey silts up.
  // `scale` overrides the em ratio for a caller that wants the die at the label's own height.
  let { tone = 'muted', scale, class: extra = '' } = $props();
</script>

<i
  class="fas fa-dice-d20 roll-die {tone === 'solid' ? 'is-solid' : ''} {extra}"
  style={scale ? `--rolldie-scale: ${scale}` : undefined}
  aria-hidden="true"
></i>

<style>
  @layer system {
    .roll-die {
      --rolldie-gap: var(--space-4);
      /* Unitless, not a scale step: the die rides labels from the 12px skill pill to the 32px
         stat, and --rolldie-rise divides by it. */
      --rolldie-scale: 0.85;
      --rolldie-opacity: 0.5;
      --rolldie-spin-duration: 500ms;
      /* Measured, and then solved: the d20 glyph's centre and the labels' cap-height centre both
         sit 0.35em above their own baseline, so a die scaled below the label lands this much low.
         vertical-align resolves against the die's own em, hence the division — the die stays
         centred on the word at any scale. */
      --rolldie-rise: calc(0.35em / var(--rolldie-scale) - 0.35em);

      margin-inline-start: var(--rolldie-gap);
      font-size: calc(var(--rolldie-scale) * 1em);
      /* currentColor, so one rule serves black-on-paper labels and the white-on-black name pill. */
      color: currentColor;
      opacity: var(--rolldie-opacity);
      vertical-align: var(--rolldie-rise);
      transition: transform var(--rolldie-spin-duration) ease-in-out;
    }

    .roll-die.is-solid {
      --rolldie-opacity: 1;
    }

    /* The control carrying the die is what spins it, not the die itself: the die is decorative
       and smaller than the word beside it, so hovering it directly is a harder target than the
       button the player is already aiming at. */
    :global(:hover) > .roll-die {
      transform: rotate(360deg);
    }

    @media (prefers-reduced-motion: reduce) {
      .roll-die {
        transition: none;
      }

      :global(:hover) > .roll-die {
        transform: none;
      }
    }
  }
</style>
