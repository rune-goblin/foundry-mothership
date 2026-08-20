<script>
  import ArmorBar from '../ArmorBar.svelte';
  import { onActivate } from '../activate.js';
  import { localize } from '../../../i18n.ts';

  // armor.mod/damageReduction are read-only here -- prepareDerivedData owns the arithmetic.
  let { armor, onroll, style } = $props();

  const COVER_ARMOR_POINTS = { insignificant: 5, light: 10, heavy: 20 };
  const COVER_DAMAGE_REDUCTION = { heavy: 5 };

  // Spread so the a11y linter sees a dynamic role next to a dynamic tabindex on this <label>.
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
