<script module>
  export const meta = {
    group: 'Dialog bodies',
    title: 'PickFromPack',
    path: 'module/ui/actor/PickFromPack.svelte',
    width: 600,
    note: 'The compendium picker, drawn from the same ChoiceList the roll prompts use: a filter, a sticky header over the columns the pack supplies, an optional prerequisite gate, and one row per document. Beneath the pack sits whatever this world holds of the same type, which Create adds to — it writes a world document and opens its sheet, so the dialog stays open and the new row can be picked out of the list it just joined. No icon column: every document in a pack ships the same placeholder art.',
  };
</script>

<script>
  import PickFromPack from '../../module/ui/actor/PickFromPack.svelte';

  const rows = [
    { id: 'a', name: 'Zero-G', cells: ['Trained', '+10'], unmet: false, group: '' },
    { id: 'b', name: 'Piloting', cells: ['Expert', '+15'], unmet: false, group: '' },
    { id: 'c', name: 'Hyperspace', cells: ['Master', '+20'], unmet: true, group: '' },
    { id: 'd', name: 'Rimward Cant', cells: ['Trained', '+10'], unmet: false, group: 'From this world' },
  ];

  let value = $state('a');
</script>

<div class="mothership macro-popup-dialog">
  <PickFromPack
    filterLabel="Filter"
    headers={['Skill Name', 'Rank', 'Bonus']}
    {rows}
    enforceLabel="Enforce Prerequisites"
    createLabel="Create"
    oncreate={() => {}}
    {value}
    onchange={(next) => (value = next)}
  />
</div>
