<script>
  import Field from '../../parts/Field.svelte';
  import { localize } from '../../../i18n.ts';

  let { system } = $props();
</script>

<div class="grid grid-3col">
  <Field name="system.cost" label={localize('Mothership.Value')} value={system.cost} dtype="Number" />
  <Field name="system.weight" label={localize('Mothership.Weight')} value={system.weight} dtype="Number" />
  <Field
    name="system.bonus"
    label={localize('Mothership.ShipWeaponBonus')}
    value={system.bonus}
    dtype="Number"
  />
</div>
