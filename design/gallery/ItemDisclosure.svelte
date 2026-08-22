<script module>
  export const meta = {
    group: 'Primitives',
    title: 'ItemDisclosure',
    path: 'module/ui/parts/ItemDisclosure.svelte',
    note: 'The leading column of every item row. It replaced the thumbnail, which framed the same placeholder art on every document and read as a control that did nothing — this one opens the item’s description under its row. Without a handler it is the header’s spacer, and the spacer for a row with nothing to say.',
  };
</script>

<script>
  import ItemList from '../../module/ui/parts/ItemList.svelte';
  import ItemRow from '../../module/ui/parts/ItemRow.svelte';
  import ItemDisclosure from '../../module/ui/parts/ItemDisclosure.svelte';
  import ItemCell from '../../module/ui/parts/ItemCell.svelte';
  import { say } from './fixtures.js';
</script>

<ItemList>
  <ItemRow header>
    <ItemDisclosure />
    <ItemCell grow={3}>no handler — the header's spacer</ItemCell>
  </ItemRow>
  <ItemRow>
    <ItemDisclosure label="Show Description" onclick={say('open')} />
    <ItemCell variant="name" grow={3}>closed</ItemCell>
  </ItemRow>
  <ItemRow>
    <ItemDisclosure open label="Hide Description" onclick={say('close')} />
    <ItemCell variant="name" grow={3}>open — the chevron turns a quarter</ItemCell>
  </ItemRow>
</ItemList>
