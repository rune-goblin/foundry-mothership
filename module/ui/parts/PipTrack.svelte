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
    <div
      class={pip.filled ? 'circle-f' : 'circle'}
      style="background:{pip.filled ? 'black' : 'rgb(200,200,200)'};"
    >
      <div
        class="skill_training_text"
        style="position: relative; top: 17px; text-align: center; left: {pip.milestone
          .left}px;{pip.filled ? ' color:black;' : ''}"
      >
        {pip.milestone.label}
      </div>
    </div>
  {:else}
    <div class={pip.filled ? 'circle-f' : 'circle'}></div>
  {/if}
{/each}
