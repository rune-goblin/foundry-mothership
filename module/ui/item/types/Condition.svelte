<script>
  import Field from '../../parts/Field.svelte';
  import { localize } from '../../i18n.js';

  let { system } = $props();
</script>

<div class="circle-statwrapper-horizontal">
  <Field name="system.severity" label={localize('Mosh.Severity')} value={system.severity} dtype="Number" />
</div>
