<script>
  import Field from '../parts/Field.svelte';
  import { localize } from '../../i18n.js';

  let { system } = $props();
</script>

<div class="grid grid-3col">
  <Field name="system.cost" label={localize('Mosh.Value')} value={system.cost} dtype="Number" />
  <Field name="system.weight" label={localize('Mosh.Weight')} value={system.weight} dtype="Number" />
  <Field
    name="system.bonus"
    label={localize('Mosh.ShipWeaponBonus')}
    value={system.bonus}
    dtype="Number"
  />
</div>
