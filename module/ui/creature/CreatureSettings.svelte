<script>
  import CheckField from '../parts/CheckField.svelte';
  import { localize } from '../../i18n.ts';

  let { store } = $props();

  const STAT_TOGGLES = [
    { key: 'combat', label: 'Mothership.Combat' },
    { key: 'instinct', label: 'Mothership.Instinct' },
    { key: 'loyalty', label: 'Mothership.Loyalty' },
    { key: 'speed', label: 'Mothership.Speed' },
    { key: 'armor', label: 'Mothership.Armor' },
    { key: 'sanity', label: 'Mothership.Sanity' },
  ];

  // Not a form field: the toggle rewrites Combat as well as itself (the rule is the document's,
  // `setSwarm`), which plain form persistence cannot express — so it stays out of `formData`.
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
