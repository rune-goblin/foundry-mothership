<script>
  import { onActivate } from '../activate.js';
  import { localize } from '../../../i18n.ts';

  // The armour readout: derived armour points and damage reduction, each showing the bonus the
  // chosen cover adds beside it. Both are read-only -- `prepareDerivedData` owns the arithmetic.
  //
  // No <style> block: every class here is shared vocabulary. `resource` carries no rule at all
  // and `rollable` is the hover group css/mothership.css scopes with `:where()`. Everything else
  // Cover.svelte hand-writes -- markup and inline overrides alike, byte for byte -- and
  // MinMaxField writes the wrapper, slant and captions besides, so a scoped block would reach
  // one writer of two, or of three.
  let { armor, onroll, style } = $props();

  const COVER_ARMOR_POINTS = { insignificant: 5, light: 10, heavy: 20 };
  const COVER_DAMAGE_REDUCTION = { heavy: 5 };

  // Spreading keeps a *dynamic* role beside a dynamic tabindex, which is what the a11y analysis
  // for a <label> acting as a button reads through -- the markup is unchanged.
  const rollable = $derived({
    role: 'button',
    tabindex: 0,
    onclick: onroll,
    onkeydown: onActivate(onroll),
  });
</script>

<div class="resource healthspread minmaxtopstat" {style}>
  <label for="system.stats.armor.value" class="resource-label minmaxtext rollable" {...rollable}>
    {localize('Mothership.Armor')}
  </label>

  <div class="minmaxwrapper" style="width: 100%; background: black; border-radius: 0.3em;">
    <div class="maxhealth-input" style="display: flex;">
      <div class="whiteText">{armor.mod}</div>
      {#if COVER_ARMOR_POINTS[armor.cover]}
        <!-- The gap is a non-breaking space in the text node, not a margin -- keep it adjacent
             to the number or Svelte's whitespace collapsing adds a second one. -->
        <div class="highlightText" style="font-size: 0.8rem;">&nbsp;{COVER_ARMOR_POINTS[armor.cover]}</div>
      {/if}
    </div>

    <div class="slant" style="border-right: 2px solid #ffffff; transform: skewX(0deg);"></div>

    <div class="maxhealth-input" style="display: flex;">
      <div class="whiteText">{armor.damageReduction}</div>
      {#if COVER_DAMAGE_REDUCTION[armor.cover]}
        <div class="highlightText" style="font-size: 0.8rem;">&nbsp;{COVER_DAMAGE_REDUCTION[armor.cover]}</div>
      {/if}
    </div>
  </div>

  <div class="healthmaxtext">{localize('Mothership.ArmorPoints')}</div>
  <div class="healthmaxtext">{localize('Mothership.DMGReduction')}</div>
</div>
