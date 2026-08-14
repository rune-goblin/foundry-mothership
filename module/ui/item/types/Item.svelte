<script>
  import Field from '../../parts/Field.svelte';
  import { localize } from '../../../i18n.ts';

  let { system } = $props();
</script>

<div class="circle-statwrapper-horizontal">
  <Field name="system.quantity" label={localize('Mothership.Quantity')} value={system.quantity} dtype="Number" />
  <Field name="system.weight" label={localize('Mothership.Weight')} value={system.weight} dtype="Number" />
  <Field name="system.cost" label={localize('Mothership.Value')} value={system.cost} dtype="Number" />
</div>
