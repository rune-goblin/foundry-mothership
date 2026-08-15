<script>
  // Both actor sheets built these pips as an HTML string in `getData()` and persisted the
  // result on the document (`xp.html`, `condition.treatment.html`). They are two renderings of
  // one shape: N pips, the first `value` of them filled.
  //
  // A pip is one element in one of four states. It used to be two class names -- `circle` and
  // `circle-f` -- each drawing its own circle, which meant the empty and filled pips shared no
  // geometry and drifted apart. `filled` and `milestone` are states on one `.pip` now, and each
  // state says only what it changes: the fill, and the stroke.
  //
  // The track lays itself out. Both sheets used to wrap it in `.flex` and nudge the result up by
  // seven pixels; a row of pips is this component's business, not every caller's.
  let { count, value, variant = 'circle', milestones = {} } = $props();

  const pips = $derived(
    Array.from({ length: count }, (_, index) => ({
      key: index,
      filled: index + 1 <= value,
      milestone: milestones[index + 1],
    }))
  );

  // The clearance below the row exists for the captions; a milestone carrying no label needs none.
  const captioned = $derived(Object.values(milestones).some((label) => label));
</script>

<span class="pip-track" class:captioned>
  {#each pips as pip (pip.key)}
    {#if variant === 'icon'}
      <i class="{pip.filled ? 'fas' : 'far'} fa-circle"></i>
    {:else}
      <span class="pip" class:filled={pip.filled} class:milestone={pip.milestone !== undefined}>
        {#if pip.milestone !== undefined}
          <span class="pip-caption">{pip.milestone}</span>
        {/if}
      </span>
    {/if}
  {/each}
</span>

<style>
  /* Svelte emits component CSS unlayered, which would outrank every layered rule in the
     application; @layer system puts these in the slot the rest of the system occupies.
     Every name here is this component's own -- nothing else writes `pip-track`, `pip` or
     `pip-caption`.

     The caption is centred under its pip by transform rather than by measurement. It used to be
     relatively positioned and pulled left by a number measured per rank (-54, -50, -52), because
     the label is wider than the 16px pip it hangs under; those three numbers were the only reason
     `milestones` carried anything but a label. */
  @layer system {
    .pip-track {
      --pip-track-gap: var(--space-4);
      /* Room for the captions, which hang out of flow below the row. */
      --pip-track-caption-clearance: var(--space-20);

      display: inline-flex;
      align-items: center;
      gap: var(--pip-track-gap);
    }

    /* A captioned track is a rank track: fifteen pips spanning a labelled row, not a small inline
       meter. It distributes into its slot rather than measuring 15 pips plus 14 gaps, because that
       intrinsic width (296px) is wider than the row the sheets give it (~278px) and the overflow
       sliced the last pip and clipped "Master" to "Mas".

       This is what the callers used to do: both sheets wrapped the track in `.flex`
       (`justify-content: space-evenly`) and the old component emitted its pips as bare siblings, so
       they were that wrapper's flex children. Moving layout in here was right; the fixed gap that
       came with it swapped a row that fits any slot for one that fits only a slot 296px wide. */
    .pip-track.captioned {
      /* The last caption is centred on the last pip, so it overhangs it by half its own width less
         half a pip — about 20px for "Master". The old caption was pulled left instead (-52px), so
         it hung back under earlier pips and never reached the edge; centred, it needs the room
         reserving or it is clipped to "Maste". */
      --pip-track-caption-overhang: var(--space-20);

      display: flex;
      justify-content: space-evenly;
      gap: 0;
      padding-inline: var(--pip-track-caption-overhang);
      padding-bottom: var(--pip-track-caption-clearance);
    }

    .pip {
      --pip-track-pip-size: var(--space-16);
      --pip-track-pip-radius: var(--radius-full);
      --pip-track-pip-border-width: var(--border-width-1);

      /* Empty is the page showing through a drawn edge; filled is ink. The milestone pair is the
         same two states one step darker, because a captioned pip marks a rank. */
      --pip-track-pip-surface: var(--surface-neutral-paper);
      --pip-track-pip-border-color: var(--border-neutral-medium);
      --pip-track-pip-filled-surface: var(--surface-neutral);
      --pip-track-pip-filled-border-color: var(--surface-neutral);
      --pip-track-pip-milestone-surface: var(--surface-neutral-paper);
      --pip-track-pip-milestone-border-color: var(--border-neutral-ink);
      --pip-track-pip-milestone-filled-surface: var(--surface-neutral-lowest);
      --pip-track-pip-milestone-filled-border-color: var(--surface-neutral-lowest);

      position: relative;
      flex: 0 0 auto;
      box-sizing: border-box;
      width: var(--pip-track-pip-size);
      height: var(--pip-track-pip-size);
      border: var(--pip-track-pip-border-width) solid var(--pip-track-pip-border-color);
      border-radius: var(--pip-track-pip-radius);
      background: var(--pip-track-pip-surface);
    }

    .pip.filled {
      border-color: var(--pip-track-pip-filled-border-color);
      background: var(--pip-track-pip-filled-surface);
    }

    .pip.milestone {
      border-color: var(--pip-track-pip-milestone-border-color);
      background: var(--pip-track-pip-milestone-surface);
    }

    .pip.milestone.filled {
      border-color: var(--pip-track-pip-milestone-filled-border-color);
      background: var(--pip-track-pip-milestone-filled-surface);
    }

    .pip-caption {
      --pip-track-caption-font-family: var(--font-sans-mothership);
      --pip-track-caption-font-size: var(--font-size-md);
      --pip-track-caption-font-weight: var(--font-weight-medium);
      --pip-track-caption-text: var(--text-tertiary);
      --pip-track-caption-offset-block: var(--space-4);

      position: absolute;
      top: calc(100% + var(--pip-track-caption-offset-block));
      left: 50%;
      transform: translateX(-50%);
      font-family: var(--pip-track-caption-font-family);
      font-size: var(--pip-track-caption-font-size);
      font-weight: var(--pip-track-caption-font-weight);
      color: var(--pip-track-caption-text);
      white-space: nowrap;
    }

    /* (0,3,0) over the caption's (0,2,0): the pair reads in either order. */
    .pip.filled .pip-caption {
      --pip-track-caption-text: var(--text-primary);
    }
  }
</style>
