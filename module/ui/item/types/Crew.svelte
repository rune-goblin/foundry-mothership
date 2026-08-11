<script>
  import Field from '../parts/Field.svelte';
  import { localize } from '../../i18n.js';

  let { system } = $props();
</script>

<div class="circle-statwrapper-horizontal">
  <Field
    name="system.job"
    label={localize('Mosh.Job')}
    value={system.job}
    wrapper="text"
    width="300px"
  />
</div>
