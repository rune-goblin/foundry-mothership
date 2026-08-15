<script module>
  export const meta = {
    group: 'Primitives',
    title: 'ItemList family',
    path: 'module/ui/parts/ItemList.svelte',
    note: 'ItemList, ItemRow, ItemImage, ItemCell, ItemControls and ItemControl — the six primitives every list on every sheet is built from. The header row, a plain row, a rollable name pill and the +/- quantity cell are all here.',
  };
</script>

<script>
  import ItemList from '../../module/ui/parts/ItemList.svelte';
  import ItemRow from '../../module/ui/parts/ItemRow.svelte';
  import ItemImage from '../../module/ui/parts/ItemImage.svelte';
  import ItemCell from '../../module/ui/parts/ItemCell.svelte';
  import ItemControls from '../../module/ui/parts/ItemControls.svelte';
  import ItemControl from '../../module/ui/parts/ItemControl.svelte';
  import { gear, say } from './fixtures.js';
</script>

<ItemList>
  <ItemRow header>
    <ItemImage />
    <ItemCell grow={2}>Name</ItemCell>
    <ItemCell grow={1}>Qty</ItemCell>
    <ItemCell grow={1}>Weight</ItemCell>
    <ItemControls>
      <ItemControl icon="plus" label="Add" title="Create item" onclick={say('create')} />
    </ItemControls>
  </ItemRow>

  {#each gear as item (item.id)}
    <ItemRow itemId={item.id}>
      <ItemImage src={item.img} title={item.name} />
      <ItemCell variant="name" grow={2} roll onclick={say('print description', item.name)}>
        {item.name}
      </ItemCell>
      <ItemCell grow={1} roll title="Left click adds one, right click removes one"
        onclick={say('quantity +1')} oncontextmenu={say('quantity -1')}>
        {item.system.quantity}
      </ItemCell>
      <ItemCell grow={1}>{item.system.weight}</ItemCell>
      <ItemControls>
        <ItemControl icon="edit" title="Edit" onclick={say('edit', item.name)} />
        <ItemControl icon="trash" title="Delete" onclick={say('delete', item.name)} />
      </ItemControls>
    </ItemRow>
  {/each}
</ItemList>
