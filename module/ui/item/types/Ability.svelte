<script>
  import Field from '../../parts/Field.svelte';
  import { localize } from '../../../i18n.ts';

  // No <style> block: `circle-statwrapper-horizontal` is shared stat vocabulary — all five item
  // bodies hand-write it.
  let { system } = $props();
</script>

<div class="circle-statwrapper-horizontal">
  <Field name="system.roll" label={localize('Mothership.Damage')} value={system.roll} />
</div>
