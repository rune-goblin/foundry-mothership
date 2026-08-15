<script>
  // Both actor sheets built these pips as an HTML string in `getData()` and persisted the
  // result on the document (`xp.html`, `condition.treatment.html`). They are two renderings of
  // one shape: N pips, the first `value` of them filled.
  //
  // `milestones` is the XP track's only extra -- the 5th, 10th and 15th pip carry a rank caption,
  // each with its own nudge because the caption is wider than the pip it sits under.
  let { count, value, variant = 'circle', milestones = {} } = $props();

  const pips = $derived(
    Array.from({ length: count }, (_, index) => ({
      key: index,
      filled: index + 1 <= value,
      milestone: milestones[index + 1],
    }))
  );
</script>

{#each pips as pip (pip.key)}
  {#if variant === 'icon'}
    <i class="{pip.filled ? 'fas' : 'far'} fa-circle"></i>
  {:else if pip.milestone}
    <div class="{pip.filled ? 'circle-f' : 'circle'} milestone">
      <div class="skill_training_text" style="left: {pip.milestone.left}px;">
        {pip.milestone.label}
      </div>
    </div>
  {:else}
    <div class={pip.filled ? 'circle-f' : 'circle'}></div>
  {/if}
{/each}

<style>
  /* Svelte emits component CSS unlayered, which would outrank every layered rule in the
     application; @layer system puts these in the slot the rest of the system occupies.
     All three names are this component's own -- nothing else writes `circle`, `circle-f` or
     `skill_training_text` -- and the component has no root element, so the slots are declared
     on the pip itself and the caption inherits them.
     A captioned pip is darker than a plain one whether it is filled or empty, and used to say
     so inline, where no token reaches; `milestone` names that state instead. */
  @layer system {
    .circle,
    .circle-f {
      --pip-track-pip-size: var(--space-16);
      --pip-track-pip-radius: var(--radius-md);
      --pip-track-pip-text: var(--text-primary);
      --pip-track-pip-surface: var(--surface-neutral-paper);
      --pip-track-pip-filled-surface: var(--surface-neutral);
      --pip-track-pip-milestone-surface: var(--surface-neutral-highest);
      --pip-track-pip-milestone-filled-surface: var(--surface-neutral-lowest);

      --pip-track-caption-font-family: var(--font-sans-mothership);
      --pip-track-caption-font-size: var(--font-size-md);
      --pip-track-caption-font-weight: var(--font-weight-medium);
      --pip-track-caption-text: var(--text-tertiary);
      --pip-track-caption-filled-text: var(--text-primary);
      --pip-track-caption-offset-block: var(--space-16);

      width: var(--pip-track-pip-size);
      height: var(--pip-track-pip-size);
      border-radius: var(--pip-track-pip-radius);
      color: var(--pip-track-pip-text);
    }

    .circle {
      background: var(--pip-track-pip-surface);

      &.milestone {
        background: var(--pip-track-pip-milestone-surface);
      }
    }

    .circle-f {
      background: var(--pip-track-pip-filled-surface);

      &.milestone {
        background: var(--pip-track-pip-milestone-filled-surface);
      }
    }

    .skill_training_text {
      position: relative;
      top: var(--pip-track-caption-offset-block);
      font-family: var(--pip-track-caption-font-family);
      font-size: var(--pip-track-caption-font-size);
      font-weight: var(--pip-track-caption-font-weight);
      color: var(--pip-track-caption-text);
      text-align: center;
    }

    /* (0,3,0) over the caption's (0,2,0): the pair reads in either order. */
    .circle-f .skill_training_text {
      color: var(--pip-track-caption-filled-text);
    }
  }
</style>
