<script module>
  export const meta = {
    group: 'Windows',
    title: 'ItemSheet',
    path: 'module/ui/item/ItemSheet.svelte',
    width: 600,
    note: 'The shell the eight simple item types share: header, type body, description tab, and the second tab armour and weapon carry. Switch the type to see each body inside its own window.',
  };
</script>

<script>
  import ItemSheet from '../../module/ui/item/ItemSheet.svelte';
  import { ITEM_BODIES } from '../../module/ui/item/types.js';
  import { itemStore, weapons, armors, gear, conditions, abilities } from './fixtures.js';

  const samples = {
    weapon: ['Pulse Rifle', weapons[0].system],
    armor: ['Standard Battle Dress', armors[0].system],
    item: ['Rebreather', gear[0].system],
    condition: ['Phobia', conditions[0].system],
    ability: ['Acid Blood', abilities[0].system],
  };

  const types = Object.keys(ITEM_BODIES);
  let type = $state('weapon');

  const store = $derived(itemStore(type, ...samples[type]));
</script>

<div class="ds-switch">
  {#each types as option (option)}
    <button type="button" class:active={type === option} onclick={() => (type = option)}>{option}</button>
  {/each}
</div>

{#key type}
  <ItemSheet {store} />
{/key}
