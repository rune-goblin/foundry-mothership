<script>
  import Field from '../../parts/Field.svelte';
  import { localize } from '../../../i18n.ts';

  let { system } = $props();
</script>

<div class="circle-statwrapper-horizontal">
  <Field name="system.quantity" label={localize('Mosh.Quantity')} value={system.quantity} dtype="Number" />
  <Field name="system.weight" label={localize('Mosh.Weight')} value={system.weight} dtype="Number" />
  <Field name="system.cost" label={localize('Mosh.Value')} value={system.cost} dtype="Number" />
</div>
