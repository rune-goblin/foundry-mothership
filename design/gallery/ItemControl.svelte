<script module>
  export const meta = {
    group: 'Primitives',
    title: 'ItemControl + ItemControls',
    path: 'module/ui/parts/ItemControl.svelte',
    covers: ['module/ui/parts/ItemControls.svelte'],
    note: 'The control column at the end of a row. ItemControls owns the fixed width and only inside a list — the creature sheet mounts it in an ability card, which the stylesheet never reached — so the ancestor stays in the selector.',
  };
</script>

<script>
  import ItemList from '../../module/ui/parts/ItemList.svelte';
  import ItemRow from '../../module/ui/parts/ItemRow.svelte';
  import ItemCell from '../../module/ui/parts/ItemCell.svelte';
  import ItemControls from '../../module/ui/parts/ItemControls.svelte';
  import ItemControl from '../../module/ui/parts/ItemControl.svelte';
  import { say } from './fixtures.js';
</script>

<ItemList>
  <ItemRow header>
    <ItemCell grow={3}>With a label</ItemCell>
    <ItemControls>
      <ItemControl icon="plus" label="Add" title="Create" onclick={say('create')} />
    </ItemControls>
  </ItemRow>
  <ItemRow itemId="demo">
    <ItemCell grow={3}>Icon only</ItemCell>
    <ItemControls>
      <ItemControl icon="edit" title="Edit" onclick={say('edit')} />
      <ItemControl icon="trash" title="Delete" onclick={say('delete')} />
    </ItemControls>
  </ItemRow>
</ItemList>
