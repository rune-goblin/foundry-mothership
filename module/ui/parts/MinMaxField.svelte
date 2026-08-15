<script>
  import { onActivate } from './activate.js';

  // The `.minmaxwrapper` pair: a caption, two number inputs either side of a slant, and a
  // caption under each. Health, wounds and the character's stress are all this shape -- the
  // right-hand field is a maximum on the first two and a minimum on stress, so it is named
  // rather than derived.
  //
  // No <style> block: ArmorBlock and Cover hand-write this same wrapper, slant and captions, so
  // every class here is shared vocabulary css/mothership.css declares and a scoped block could
  // only reach one of the three writers.
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
  <label for={name} class="resource-label minmaxtext {labelClass}" {...rollable}>{label}</label>

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
