<script>
  import CheckField from '../parts/CheckField.svelte';
  import { localize } from '../i18n.js';

  let { store } = $props();

  const STAT_TOGGLES = [
    { key: 'combat', label: 'Mosh.Combat' },
    { key: 'instinct', label: 'Mosh.Instinct' },
    { key: 'loyalty', label: 'Mosh.Loyalty' },
    { key: 'speed', label: 'Mosh.Speed' },
    { key: 'armor', label: 'Mosh.Armor' },
    { key: 'sanity', label: 'Mosh.Sanity' },
  ];

  // Not a form field: it carries side effects (the combat multiply/restore below) that plain
  // form persistence can't express, so it stays out of `formData` and updates itself.
  async function onSwarmChange(event) {
    const enabled = event.currentTarget.checked;
    const { document } = store;
    const { stats, hits, swarm } = document.system;

    const swarmCombat = enabled ? stats.combat.value : 0;
    const combat = enabled ? stats.combat.value * (hits.max - hits.value) : swarm.combat.value;

    await document.update({
      'system.swarm.enabled': enabled,
      'system.stats.combat.value': combat,
      'system.swarm.combat.value': swarmCombat,
    });
  }
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
      <div class="resource healthspread blankstat flex-center" style="grid-template-rows: max-content;">
        <label for="swarm-enabled" class="resource-label minmaxtext">Swarm</label>
        <input
          type="checkbox"
          id="swarm-enabled"
          data-dtype="Boolean"
          checked={store.current.system.swarm.enabled}
          onchange={onSwarmChange}
        />
      </div>
    </div>
  </div>
</header>
