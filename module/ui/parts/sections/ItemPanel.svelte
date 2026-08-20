<script>
  import ItemList from '../ItemList.svelte';
  import ItemRow from '../ItemRow.svelte';
  import ItemImage from '../ItemImage.svelte';
  import ItemCell from '../ItemCell.svelte';
  import ItemControls from '../ItemControls.svelte';
  import ItemControl from '../ItemControl.svelte';
  import { localize } from '../../../i18n.ts';

  let { headers, items, row, create, style } = $props();
</script>

<ItemList {style}>
  <ItemRow header>
    <ItemImage />
    {#each headers as header (header.label)}
      <ItemCell grow={header.grow}>{header.label}</ItemCell>
    {/each}
    <ItemControls>
      <ItemControl
        icon="plus"
        label={localize('Mothership.Add')}
        title={create.title}
        onclick={create.onclick}
      />
    </ItemControls>
  </ItemRow>

  {#each items as item (item.id)}
    <ItemRow itemId={item.id}>
      {@render row(item)}
    </ItemRow>
  {/each}
</ItemList>
