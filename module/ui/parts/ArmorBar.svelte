<script>
  // The black armour bar: two values either side of a white slant, each showing the cover bonus it
  // gains in orange. ArmorBlock draws it on the character sheet and Cover draws it once per option
  // in its dialog; both hand-wrote it, inline overrides and all.
  //
  // The overrides stay inline rather than moving to a scoped block. `minmaxwrapper`, `slant` and
  // `maxhealth-input` are shared with MinMaxField and so keep their rules in css/mothership.css;
  // a scoped `.minmaxwrapper` here would weigh the same (0,2,0) and win only on being later in the
  // bundle, which is the kind of tie this system documents rather than creates.
  //
  // `spread` is the one place the two hand-written copies were not identical: Cover put
  // `maxhealth-input` on the value div as well as its cell, and that class's `margin: auto` pushes
  // the value and its bonus to opposite ends of the flex cell. Nobody chose that -- it reads like
  // the class being copied one level too deep -- but only the character sheet's form is pinned by
  // a baseline, so the difference is named here rather than resolved. Dropping the prop is a
  // reviewed pixel change to the Cover dialog, which has no baseline yet.
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
