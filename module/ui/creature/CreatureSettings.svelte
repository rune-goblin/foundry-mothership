<script>
  // No <style> block: this window owns no class. `creature-settings`, which tells it apart from
  // the creature sheet underneath, styles nothing and is the e2e locator; `sheet-header` is
  // core's; `header-fields` needs a `char-header` ancestor only CharacterSheet and Generator
  // provide, so the one rule it has is inert here; the `.grid*`/`.flex*` set is shared.
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
      <CheckField
        id="swarm-enabled"
        label="Swarm"
        checked={store.current.system.swarm.enabled}
        onchange={onSwarmChange}
      />
    </div>
  </div>
</header>
