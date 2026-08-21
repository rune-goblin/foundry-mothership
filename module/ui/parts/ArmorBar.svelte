<script>
  // spread=true doubles maxhealth-input onto the value div; its margin:auto pushes value
  // and bonus to opposite ends of the flex cell.
  //
  // leftName turns the left cell into a field, and only a creature's caller passes one: a
  // character's armour points are derived from what it is wearing and must stay read-only, while
  // a horror's are a number on the horror that something has to be able to type.
  let { left, right, leftName, leftBonus, rightBonus, spread = false } = $props();
</script>

{#snippet cell(value, bonus, name)}
  <div class="maxhealth-input" style="display: flex;">
    {#if name}
      <input class="maxhealth-input whiteText" type="text" {name} {value} data-dtype="Number" />
    {:else}
      <div class:maxhealth-input={spread} class="whiteText">{value}</div>
    {/if}
    {#if bonus}
      <!-- The gap is a non-breaking space in the text node, not a margin -- keep it adjacent to
           the number or Svelte's whitespace collapsing adds a second one. -->
      <div class="highlightText" style="font-size: 0.8rem;">&nbsp;{bonus}</div>
    {/if}
  </div>
{/snippet}

<div class="minmaxwrapper" style="width: 100%; background: black; border-radius: 0.3em;">
  {@render cell(left, leftBonus, leftName)}
  <div class="slant" style="border-right: 2px solid #ffffff; transform: skewX(0deg);"></div>
  {@render cell(right, rightBonus)}
</div>
