<script>
  import ArmorBar from '../ArmorBar.svelte';
  import { onActivate } from '../activate.js';
  import { localize } from '../../../i18n.ts';

  // The armour readout: derived armour points and damage reduction, each showing the bonus the
  // chosen cover adds beside it. Both are read-only -- `prepareDerivedData` owns the arithmetic.
  //
  // No <style> block: every class here is shared vocabulary. `resource` carries no rule at all
  // and `rollable` is the hover group css/mothership.css scopes with `:where()`; the captions and
  // the outer wrapper are MinMaxField's too. The bar itself is ArmorBar now -- Cover drew the
  // same one by hand.
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

  <ArmorBar
    left={armor.mod}
    leftBonus={COVER_ARMOR_POINTS[armor.cover]}
    right={armor.damageReduction}
    rightBonus={COVER_DAMAGE_REDUCTION[armor.cover]}
  />

  <div class="healthmaxtext">{localize('Mothership.ArmorPoints')}</div>
  <div class="healthmaxtext">{localize('Mothership.DMGReduction')}</div>
</div>
