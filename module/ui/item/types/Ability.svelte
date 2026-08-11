<script>
  import Field from '../parts/Field.svelte';
  import { localize } from '../../i18n.js';

  let { system } = $props();
</script>

<div class="circle-statwrapper-horizontal">
  <Field name="system.roll" label={localize('Mosh.Damage')} value={system.roll} />
</div>
