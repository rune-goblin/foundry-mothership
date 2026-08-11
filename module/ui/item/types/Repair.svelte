<script>
  import Field from '../../parts/Field.svelte';
  import CheckField from '../../parts/CheckField.svelte';
  import { localize } from '../../i18n.js';

  let { system } = $props();
</script>

<div class="circle-statwrapper-horizontal">
  <Field name="system.quantity" label={localize('Mosh.Quantity')} value={system.quantity} dtype="Number" />
  <CheckField name="system.major" label={localize('Mosh.Major')} checked={system.major} />
</div>
