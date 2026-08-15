<script module>
  export const meta = {
    group: 'Item bodies',
    title: 'ITEM_BODIES',
    path: 'module/ui/item/types.js',
    covers: [
      'module/ui/item/types/Ability.svelte',
      'module/ui/item/types/Armor.svelte',
      'module/ui/item/types/Condition.svelte',
      'module/ui/item/types/Item.svelte',
      'module/ui/item/types/Weapon.svelte',
    ],
    note: 'The stat block each item type shows above the tabs, in the registry ItemSheet reads. Every one takes a plain `system` object and writes no class of its own beyond the shared stat vocabulary.',
  };
</script>

<script>
  import { ITEM_BODIES } from '../../module/ui/item/types.js';
  import { itemSystem, weapons, armors, gear, conditions, abilities } from './fixtures.js';

  const samples = {
    ability: abilities[0].system,
    armor: armors[0].system,
    condition: conditions[0].system,
    item: gear[0].system,
    weapon: weapons[0].system,
  };

  const bodies = Object.entries(ITEM_BODIES).map(([type, Body]) => ({
    type,
    Body,
    system: samples[type] ?? itemSystem(type),
  }));
</script>

{#each bodies as { type, Body, system } (type)}
  <p class="ds-caption">{type}</p>
  <Body {system} />
{/each}
