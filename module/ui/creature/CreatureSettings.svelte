<script>
  // No <style> block: every class here is shared or (for `creature-settings`) only an e2e locator.
  import CheckField from '../parts/CheckField.svelte';
  import { localize } from '../../i18n.ts';

  let { store } = $props();

  // Not a plain form field: setSwarm() also rewrites Combat, which form persistence can't express.
  const onSwarmChange = (event) => store.document.setSwarm(event.currentTarget.checked);
</script>

<header class="sheet-header">
  <div class="header-fields">
    <div class="grid grid-2col">
      <CheckField
        name="system.contractor"
        label={localize('Mothership.Contractor')}
        checked={store.current.system.contractor}
      />
      <CheckField
        id="swarm-enabled"
        label={localize('Mothership.Swarm')}
        checked={store.current.system.swarm.enabled}
        onchange={onSwarmChange}
      />
    </div>
  </div>
</header>
