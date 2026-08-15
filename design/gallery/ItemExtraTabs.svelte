<script module>
  export const meta = {
    group: 'Item bodies',
    title: 'ITEM_EXTRA_TABS',
    path: 'module/ui/item/types.js',
    covers: ['module/ui/item/types/ArmorExtra.svelte', 'module/ui/item/types/WeaponExtra.svelte'],
    note: 'Only armour and weapon carry a second tab. Both bodies are the cost/weight pair, and the weapon adds its to-hit bonus.',
  };
</script>

<script>
  import { ITEM_EXTRA_TABS } from '../../module/ui/item/types.js';
  import { weapons, armors } from './fixtures.js';

  const samples = { armor: armors[0].system, weapon: weapons[0].system };
</script>

{#each Object.entries(ITEM_EXTRA_TABS) as [type, extra] (type)}
  {@const Extra = extra.component}
  <p class="ds-caption">{type} — tab “{extra.tab}”</p>
  <Extra system={samples[type]} />
{/each}
