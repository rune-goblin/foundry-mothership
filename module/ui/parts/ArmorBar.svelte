<script>
  // spread=true doubles maxhealth-input onto the value div; its margin:auto pushes value
  // and bonus to opposite ends of the flex cell.
  let { left, right, leftBonus, rightBonus, spread = false } = $props();
</script>

{#snippet cell(value, bonus)}
  <div class="maxhealth-input" style="display: flex;">
    <div class:maxhealth-input={spread} class="whiteText">{value}</div>
    {#if bonus}
      <!-- The gap is a non-breaking space in the text node, not a margin -- keep it adjacent to
           the number or Svelte's whitespace collapsing adds a second one. -->
      <div class="highlightText" style="font-size: 0.8rem;">&nbsp;{bonus}</div>
    {/if}
  </div>
{/snippet}

<div class="minmaxwrapper" style="width: 100%; background: black; border-radius: 0.3em;">
  {@render cell(left, leftBonus)}
  <div class="slant" style="border-right: 2px solid #ffffff; transform: skewX(0deg);"></div>
  {@render cell(right, rightBonus)}
</div>
