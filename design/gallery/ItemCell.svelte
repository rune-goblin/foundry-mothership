<script module>
  export const meta = {
    group: 'Primitives',
    title: 'ItemCell',
    path: 'module/ui/parts/ItemCell.svelte',
    note: 'The two cells a row is built from: the plain `stat` readout and the black `name` pill. `roll` adds the hover cue; a cell with a handler gets the button role, a tab stop and a key handler, and one without gets none of them.',
  };
</script>

<script>
  import ItemRow from '../../module/ui/parts/ItemRow.svelte';
  import ItemList from '../../module/ui/parts/ItemList.svelte';
  import ItemCell from '../../module/ui/parts/ItemCell.svelte';
  import { say } from './fixtures.js';
</script>

<ItemList>
  <ItemRow itemId="demo">
    <ItemCell variant="name" grow={2} roll onclick={say('name clicked')}>Pulse Rifle</ItemCell>
    <ItemCell grow={1}>3d10</ItemCell>
    <ItemCell grow={1} roll onclick={say('+1')} oncontextmenu={say('-1')} title="Left adds, right removes">4</ItemCell>
    <ItemCell grow={1}>Long</ItemCell>
  </ItemRow>
</ItemList>
