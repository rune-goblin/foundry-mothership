<script>
  import Field from '../../parts/Field.svelte';
  import CheckField from '../../parts/CheckField.svelte';
  import { localize } from '../../../i18n.ts';

  let { system } = $props();
</script>

<div class="item-armor-grid" style="margin-top: 10px; margin-bottom: 10px;">
  <div>
    <div class="circle-statwrapper-horizontal transparentBackground">
      <Field
        name="system.armorPoints"
        label={localize('Mosh.ArmorPoints')}
        value={system.armorPoints}
        dtype="Number"
      />
      <Field
        name="system.damageReduction"
        label={localize('Mosh.DMGReduction')}
        value={system.damageReduction}
        dtype="Number"
      />
    </div>

    <div class="circle-statwrapper-horizontal transparentBackground">
      <CheckField
        name="system.equipped"
        label={localize('Mosh.Equipped')}
        checked={system.equipped}
      />
      <Field name="system.speed" label={localize('Mosh.Speed')} value={system.speed} />
    </div>
  </div>

  <div class="circle-statwrapper-vertical" style="gap: 10px;">
    <Field name="system.oxygenMax" value={system.oxygenMax} dtype="Number">
      {#snippet label()}{localize('Mosh.Maximum')} O<sup>2</sup>{/snippet}
    </Field>
    <Field name="system.oxygenCurrent" value={system.oxygenCurrent} dtype="Number">
      {#snippet label()}{localize('Mosh.Current')} O<sup>2</sup>{/snippet}
    </Field>
  </div>
</div>

<Field
  name="system.features"
  label={localize('Mosh.Features')}
  value={system.features}
  wrapper="text"
  width="100%"
  slim
/>
<br />
