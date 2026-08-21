<script>
  // No <style> block: every class here is shared or (for `creature-settings`) only an e2e locator.
  import CheckField from '../parts/CheckField.svelte';
  import { localize } from '../../i18n.ts';

  let { store } = $props();

  const STAT_TOGGLES = [
    { key: 'combat', label: 'Mothership.Combat' },
    { key: 'instinct', label: 'Mothership.Instinct' },
    { key: 'loyalty', label: 'Mothership.Loyalty' },
    { key: 'armor', label: 'Mothership.Armor' },
  ];

  // Not a plain form field: setSwarm() also rewrites Combat, which form persistence can't express.
  const onSwarmChange = (event) => store.document.setSwarm(event.currentTarget.checked);
</script>

<header class="sheet-header">
  <div class="header-fields">
    <div class="grid grid-3col">
      {#each STAT_TOGGLES as toggle (toggle.key)}
        <CheckField
          name={`system.stats.${toggle.key}.enabled`}
          label={localize(toggle.label)}
          checked={store.current.system.stats[toggle.key].enabled}
        />
      {/each}
      <CheckField
        id="swarm-enabled"
        label="Swarm"
        checked={store.current.system.swarm.enabled}
        onchange={onSwarmChange}
      />
    </div>
  </div>
</header>
