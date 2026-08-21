<script>
  // A dot on the stat's circle rather than a field beside it: a modifier is set once and read every
  // session, so it costs nothing at rest, opens only when aimed at, and the sign is the only thing
  // it has to say from across the sheet -- hence the colour, and hence no glyphs while closed.
  let { name, value, label } = $props();

  const mod = $derived(Number(value) || 0);

  // Enter commits. Without the flag the badge would stay open under a pointer that never left it.
  let dismissed = $state(false);

  // Opening one is almost always replacing what is in it, including clearing it back to zero.
  const selectAll = (event) => event.currentTarget.select();

  function commit(event) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    dismissed = true;
    event.currentTarget.blur();
  }
</script>

<!-- role=group so the pointer handler sits on something the a11y rules accept; the control the
     user reaches is the field inside, which carries the label. -->
<span
  role="group"
  class={['stat-modifier', mod > 0 && 'is-up', mod < 0 && 'is-down', dismissed && 'is-dismissed']}
  onpointerleave={() => (dismissed = false)}
>
  <input
    class="stat-modifier-field"
    type="text"
    {name}
    value={mod}
    aria-label={label}
    data-dtype="Number"
    onfocus={selectAll}
    onkeydown={commit}
  />
  <!-- U+2212, not a hyphen: at 16px a hyphen reads as a speck. Decorative — the value it stands
       for is in the field underneath, which is what a screen reader gets. -->
  <span class="stat-modifier-sign" aria-hidden="true">{mod < 0 ? '\u2212' : '+'}</span>
</span>

<style>
  @layer system {
    .stat-modifier {
      --statmodifier-dot-size: 16px;
      --statmodifier-open-size: 40px;
      --statmodifier-size: var(--statmodifier-dot-size);
      --statmodifier-ink: var(--border-neutral-ink);
      --statmodifier-fill: var(--surface-neutral-paper);
      --statmodifier-text: var(--text-primary);
      --statmodifier-border-width: var(--border-width-2);
      --statmodifier-font-size: var(--font-size-2xl);
      --statmodifier-gap: var(--space-4);
      /* `.circle-input` carries a -2px margin, so its border box sits this far outside the slot
         this badge is positioned against. Without it the gap measures 2px, not 4px. */
      --statmodifier-circle-overhang: var(--space-2);
      --statmodifier-duration: 160ms;
      /* Long enough that crossing the badge on the way somewhere else does not open it. */
      --statmodifier-open-delay: 320ms;

      position: absolute;
      /* Tangent to the circle at 90deg, on the number's own line: a two-digit value at 30px very
         nearly fills a 50px disc, so the rim at 90deg is exactly where the glyphs are and anything
         centred on it lands on them. Outside the disc entirely, it reads as the second term of a
         sum rather than a badge welded to the first. */
      top: 50%;
      right: 0;
      transform: translate(
        calc(100% + var(--statmodifier-gap) + var(--statmodifier-circle-overhang)),
        -50%
      );
      display: grid;
      place-items: center;
      width: var(--statmodifier-size);
      height: var(--statmodifier-size);
      border: var(--statmodifier-border-width) solid var(--statmodifier-ink);
      border-radius: var(--radius-full);
      background: var(--statmodifier-fill);
      z-index: 7;
      transition:
        width var(--statmodifier-duration) ease,
        height var(--statmodifier-duration) ease,
        transform var(--statmodifier-duration) ease,
        background-color var(--statmodifier-duration) ease;
      transition-delay: 0ms;
    }

    /* A dot is a 16px target; this is what the pointer is actually aiming at. Behind, or it would
       paint over the field and swallow the click that focuses it. */
    .stat-modifier::after {
      content: '';
      position: absolute;
      inset: calc(var(--space-8) * -1);
      border-radius: inherit;
      z-index: -1;
    }

    /* Filled while it is doing something, hollow while it is not. */
    .stat-modifier.is-up {
      --statmodifier-ink: var(--color-success-300);
      --statmodifier-fill: var(--color-success-300);
      --statmodifier-text: var(--color-success-400);
    }

    .stat-modifier.is-down {
      --statmodifier-ink: var(--color-danger-400);
      --statmodifier-fill: var(--color-danger-400);
      --statmodifier-text: var(--color-danger-400);
    }

    /* Opening slides it clear as well as growing it, so the base number stays readable beside the
       field. It cannot slide all the way clear: the rightmost rail has 33px to the window edge. */
    .stat-modifier:hover,
    .stat-modifier:focus-within {
      --statmodifier-size: var(--statmodifier-open-size);
      --statmodifier-fill: var(--surface-neutral-paper);
      --statmodifier-border-width: var(--border-width-3);

      transform: translate(calc(50% + var(--space-8)), -50%);
      transition-delay: var(--statmodifier-open-delay);
    }

    /* Committed with Enter, pointer still on it: stay shut until the pointer leaves and comes back. */
    .stat-modifier.is-dismissed:hover:not(:focus-within) {
      --statmodifier-size: var(--statmodifier-dot-size);
      --statmodifier-border-width: var(--border-width-2);

      transform: translate(
        calc(100% + var(--statmodifier-gap) + var(--statmodifier-circle-overhang)),
        -50%
      );
      transition-delay: 0ms;
    }

    /* The sign the dot's colour already implies, said again in the shape: colour alone is not a
       cue everyone gets, and at 16px the fill is all there is room for otherwise. */
    .stat-modifier-sign {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      color: var(--text-inverted);
      font-family: var(--font-display);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-bold);
      line-height: var(--line-height-none);
      opacity: 0;
      pointer-events: none;
      transition: opacity var(--statmodifier-duration) ease;
    }

    .stat-modifier.is-up .stat-modifier-sign,
    .stat-modifier.is-down .stat-modifier-sign {
      opacity: 1;
    }

    /* Open, the field says it in full; the sign would print over the digits. */
    .stat-modifier:hover .stat-modifier-sign,
    .stat-modifier:focus-within .stat-modifier-sign {
      opacity: 0;
      transition-delay: var(--statmodifier-open-delay);
    }

    .stat-modifier.is-dismissed:hover:not(:focus-within).is-up .stat-modifier-sign,
    .stat-modifier.is-dismissed:hover:not(:focus-within).is-down .stat-modifier-sign {
      opacity: 1;
      transition-delay: 0ms;
    }

    .stat-modifier-field {
      width: 100%;
      height: 100%;
      padding: var(--space-0);
      border: var(--border-width-0);
      border-radius: inherit;
      background: transparent;
      color: var(--statmodifier-text);
      font-family: var(--font-display);
      font-size: var(--statmodifier-font-size);
      font-weight: var(--font-weight-bold);
      text-align: center;
      /* Closed, the badge says everything with its fill; the number would not fit anyway. */
      opacity: 0;
      cursor: pointer;
      transition: opacity var(--statmodifier-duration) ease;
      transition-delay: 0ms;
    }

    .stat-modifier:hover .stat-modifier-field,
    .stat-modifier:focus-within .stat-modifier-field {
      opacity: 1;
      cursor: text;
      transition-delay: var(--statmodifier-open-delay);
    }

    .stat-modifier.is-dismissed:hover:not(:focus-within) .stat-modifier-field {
      opacity: 0;
      transition-delay: 0ms;
    }

    @media (prefers-reduced-motion: reduce) {
      .stat-modifier,
      /* The sign the dot's colour already implies, said again in the shape: colour alone is not a
       cue everyone gets, and at 16px the fill is all there is room for otherwise. */
    .stat-modifier-sign {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      color: var(--text-inverted);
      font-family: var(--font-display);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-bold);
      line-height: var(--line-height-none);
      opacity: 0;
      pointer-events: none;
      transition: opacity var(--statmodifier-duration) ease;
    }

    .stat-modifier.is-up .stat-modifier-sign,
    .stat-modifier.is-down .stat-modifier-sign {
      opacity: 1;
    }

    /* Open, the field says it in full; the sign would print over the digits. */
    .stat-modifier:hover .stat-modifier-sign,
    .stat-modifier:focus-within .stat-modifier-sign {
      opacity: 0;
      transition-delay: var(--statmodifier-open-delay);
    }

    .stat-modifier.is-dismissed:hover:not(:focus-within).is-up .stat-modifier-sign,
    .stat-modifier.is-dismissed:hover:not(:focus-within).is-down .stat-modifier-sign {
      opacity: 1;
      transition-delay: 0ms;
    }

    .stat-modifier-field {
        transition: none;
      }
    }
  }
</style>
