<script module>
  export const meta = {
    group: 'Sections',
    title: 'ItemPanel',
    path: 'module/ui/parts/sections/ItemPanel.svelte',
    note: 'One item-list block. What every tab of the character sheet shares byte for byte is the frame — the list, the header row, the create control, the row wrapper carrying the item id, and the disclosure that opens an item’s description beneath its row. What differs per taxonomy is the columns, so `headers` is data and `row` is a snippet the caller owns. The panel hands that snippet the toggle, so a name with no action of its own opens the description too.',
  };
</script>

<script>
  import ItemPanel from '../../module/ui/parts/sections/ItemPanel.svelte';
  import ItemCell from '../../module/ui/parts/ItemCell.svelte';
  import ItemControls from '../../module/ui/parts/ItemControls.svelte';
  import ItemControl from '../../module/ui/parts/ItemControl.svelte';
  import { skills, say } from './fixtures.js';
</script>

{#snippet row(item, disclose)}
  <ItemCell variant="name" grow={2} roll={!!disclose} onclick={disclose}>{item.name}</ItemCell>
  <ItemCell grow={1}>{item.system.rank}</ItemCell>
  <ItemCell grow={1}>+{item.system.bonus}</ItemCell>
  <ItemControls>
    <ItemControl icon="edit" title="Edit" onclick={say('edit', item.name)} />
    <ItemControl icon="trash" title="Delete" onclick={say('delete', item.name)} />
  </ItemControls>
{/snippet}

<ItemPanel
  headers={[{ label: 'Skill', grow: 2 }, { label: 'Rank', grow: 1 }, { label: 'Bonus', grow: 1 }]}
  items={skills}
  {row}
  create={{ title: 'Create skill', onclick: say('create skill') }}
/>
