<script>
  import RollDie from './RollDie.svelte';
  import { onActivate } from './activate.js';

  // rightName/rightValue, not max/min: the right field is a maximum on health/wounds but a
  // minimum on stress.
  //
  // No <style> block: ArmorBlock and Cover hand-write this same wrapper/slant/captions, styled
  // in css/mothership.css -- a scoped block here would miss the other two.
  let {
    label,
    labelClass = '',
    onroll,
    name,
    value,
    rightName,
    rightValue,
    leftLabel,
    rightLabel,
    style,
  } = $props();

  const rollable = $derived(
    onroll ? { role: 'button', tabindex: 0, onclick: onroll, onkeydown: onActivate(onroll) } : {}
  );
</script>

<div class="resource healthspread minmaxtopstat" {style}>
  <label for={name} class="resource-label minmaxtext {labelClass}" {...rollable}>
    {label}{#if onroll}<RollDie />{/if}
  </label>

  <div class="minmaxwrapper">
    <input class="maxhealth-input darkGreyText" type="text" {name} {value} data-dtype="Number" />
    <div class="slant"></div>
    <input
      class="maxhealth-input darkGreyText"
      type="text"
      name={rightName}
      value={rightValue}
      data-dtype="Number"
    />
  </div>

  <div class="healthmaxtext">{leftLabel}</div>
  <div class="healthmaxtext">{rightLabel}</div>
</div>
