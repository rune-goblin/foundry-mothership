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
      /* DS6b cut live-tokens' dot-size scale, and 15 is off the space scale (§4.7 snaps it to
         16), so the pip keeps its measured size until the reviewed literal sweep. */
      --pip-track-pip-size: 15px;
      --pip-track-pip-radius: var(--radius-md);
      /* §4.7 maps rgb(22,22,22) onto --color-neutral-850 (#222), rgb(100,100,100) onto
         --color-neutral-600 (#707070) and lists rgb(200,200,200) nowhere. Each of the first two
         moves a rendered value, so all three wait for the sweep that reviews the shift against
         the baselines. */
      --pip-track-pip-text: rgb(22, 22, 22);
      --pip-track-pip-surface: var(--surface-neutral-paper);
      --pip-track-pip-filled-surface: rgb(100, 100, 100);
      --pip-track-pip-milestone-surface: rgb(200, 200, 200);
      --pip-track-pip-milestone-filled-surface: var(--surface-neutral-lowest);

      --pip-track-caption-font-family: var(--font-sans-mothership);
      /* 11pt is 14.67px, between --font-size-md (14.4) and --font-size-lg (16) and on neither. */
      --pip-track-caption-font-size: 11pt;
      --pip-track-caption-font-weight: var(--font-weight-medium);
      --pip-track-caption-text: var(--text-tertiary);
      --pip-track-caption-filled-text: var(--text-primary);
      /* The caption hangs below the pip it names; 17 sits off the space scale (16 | 20). */
      --pip-track-caption-offset-block: 17px;

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
