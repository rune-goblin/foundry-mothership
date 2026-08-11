<script>
  import Field from '../parts/Field.svelte';
  import { localize } from '../../i18n.js';

  let { system } = $props();
</script>

<div class="circle-statwrapper-horizontal">
  <Field name="system.quantity" label={localize('Mosh.Quantity')} value={system.quantity} dtype="Number" />
  <Field name="system.hull" label={localize('Mosh.Hull')} value={system.hull} dtype="Number" />
  <Field name="system.cost" label={localize('Mosh.Value')} value={system.cost} dtype="Number" />
</div>
<br />
<Field
  name="system.feature"
  label={localize('Mosh.Feature')}
  value={system.feature}
  wrapper="text"
  width="100%"
  slim
/>
