<script>
  let { count, value, variant = 'circle', milestones = {} } = $props();

  const pips = $derived(
    Array.from({ length: count }, (_, index) => ({
      key: index,
      filled: index + 1 <= value,
      milestone: milestones[index + 1],
    }))
  );

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
  @layer system {
    .pip-track {
      --pip-track-gap: var(--space-4);
      --pip-track-caption-clearance: var(--space-20);

      display: inline-flex;
      align-items: center;
      gap: var(--pip-track-gap);
    }

    /* space-evenly, not a measured 15-pips-plus-gaps width: the intrinsic width (296px) is
       wider than the row the sheets give it (~278px), and a fixed layout overflowed and
       clipped the last pip/caption. */
    .pip-track.captioned {
      display: flex;
      justify-content: space-evenly;
      gap: 0;
      padding-bottom: var(--pip-track-caption-clearance);
    }

    .pip {
      --pip-track-pip-size: var(--space-16);
      --pip-track-pip-radius: var(--radius-full);
      --pip-track-pip-border-width: var(--border-width-1);

      --pip-track-pip-surface: var(--surface-neutral-paper);
      --pip-track-pip-border-color: var(--border-neutral-medium);
      --pip-track-pip-filled-surface: var(--surface-neutral);
      --pip-track-pip-filled-border-color: var(--surface-neutral);
      --pip-track-pip-milestone-surface: var(--surface-neutral-paper);
      --pip-track-pip-milestone-border-color: var(--border-neutral-ink);
      --pip-track-pip-milestone-filled-surface: var(--surface-neutral-lowest);
      --pip-track-pip-milestone-filled-border-color: var(--surface-neutral-lowest);

      position: relative;
      /* flex-shrink + aspect-ratio deliberately: a pip that can't shrink slices the row edge
         when it's one pixel short; aspect-ratio keeps it round rather than squashed. */
      flex: 0 1 var(--pip-track-pip-size);
      min-width: 0;
      box-sizing: border-box;
      width: var(--pip-track-pip-size);
      height: auto;
      aspect-ratio: 1;
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

    /* Anchored to the pip's outer edge, not centred: a centred end caption overflows by half its
       own width, and label length varies by locale ("Master" vs "Especializado"). */
    .pip:first-child .pip-caption {
      left: 0;
      transform: none;
    }

    .pip:last-child .pip-caption {
      left: auto;
      right: 0;
      transform: none;
    }

    /* (0,3,0) over the caption's (0,2,0): the pair reads in either order. */
    .pip.filled .pip-caption {
      --pip-track-caption-text: var(--text-primary);
    }
  }
</style>
