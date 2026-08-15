<script module>
  export const meta = {
    group: 'Primitives',
    title: 'ItemImage + ItemRow',
    path: 'module/ui/parts/ItemImage.svelte',
    covers: ['module/ui/parts/ItemRow.svelte'],
    note: 'The row thumbnail and the row itself. Foundry frames every image in an AppV1 window through `body.game .app img`; a V2 window is `.application`, so the border here is what keeps it. An identified row is draggable by default — that is what an actor sheet’s rows are for.',
  };
</script>

<script>
  import ItemList from '../../module/ui/parts/ItemList.svelte';
  import ItemRow from '../../module/ui/parts/ItemRow.svelte';
  import ItemImage from '../../module/ui/parts/ItemImage.svelte';
  import ItemCell from '../../module/ui/parts/ItemCell.svelte';
  import { armors } from './fixtures.js';
</script>

<ItemList>
  <ItemRow header>
    <ItemImage />
    <ItemCell grow={3}>header row — no id, no drag</ItemCell>
  </ItemRow>
  {#each armors as item (item.id)}
    <ItemRow itemId={item.id}>
      <ItemImage src={item.img} title={item.name} />
      <ItemCell variant="name" grow={3}>{item.name}</ItemCell>
    </ItemRow>
  {/each}
  <ItemRow draggable={false}>
    <ItemImage />
    <ItemCell grow={3}>drop-only row — `draggable={'{false}'}`</ItemCell>
  </ItemRow>
</ItemList>
