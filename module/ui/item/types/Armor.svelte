<script>
  import Field from '../../parts/Field.svelte';
  import CheckField from '../../parts/CheckField.svelte';
  import { localize } from '../../../i18n.ts';

  // No <style> block: `item-armor-grid` and both `circle-statwrapper-*` wrappers are hand-written
  // here and in Weapon.svelte too — shared tier in css/mothership.css.
  let { system } = $props();
</script>

<div class="item-armor-grid" style="margin-top: 10px; margin-bottom: 10px;">
  <div>
    <div class="circle-statwrapper-horizontal transparentBackground">
      <Field
        name="system.armorPoints"
        label={localize('Mothership.ArmorPoints')}
        value={system.armorPoints}
        dtype="Number"
      />
      <Field
        name="system.damageReduction"
        label={localize('Mothership.DMGReduction')}
        value={system.damageReduction}
        dtype="Number"
      />
    </div>

    <div class="circle-statwrapper-horizontal transparentBackground">
      <CheckField
        name="system.equipped"
        label={localize('Mothership.Equipped')}
        checked={system.equipped}
      />
      <Field name="system.speed" label={localize('Mothership.Speed')} value={system.speed} />
    </div>
  </div>

  <div class="circle-statwrapper-vertical" style="gap: 10px;">
    <Field name="system.oxygenMax" value={system.oxygenMax} dtype="Number">
      {#snippet label()}{localize('Mothership.Maximum')} O<sup>2</sup>{/snippet}
    </Field>
    <Field name="system.oxygenCurrent" value={system.oxygenCurrent} dtype="Number">
      {#snippet label()}{localize('Mothership.Current')} O<sup>2</sup>{/snippet}
    </Field>
  </div>
</div>

<Field
  name="system.features"
  label={localize('Mothership.Features')}
  value={system.features}
  wrapper="text"
  width="100%"
  slim
/>
<br />
