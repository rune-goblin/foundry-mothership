<script module>
  export const meta = {
    group: 'Dialog bodies',
    title: 'PickFromPack',
    path: 'module/ui/actor/PickFromPack.svelte',
    width: 600,
    note: 'The compendium picker, drawn from the same ChoiceList the roll prompts use: a filter, a header row over the columns the pack supplies, an optional prerequisite gate, and one row per document. No icon column — every document in a pack ships the same placeholder art, so the column carried nothing.',
  };
</script>

<script>
  import PickFromPack from '../../module/ui/actor/PickFromPack.svelte';

  const rows = [
    { id: 'a', name: 'Zero-G', cells: ['Trained', '+10'], unmet: false },
    { id: 'b', name: 'Piloting', cells: ['Expert', '+15'], unmet: false },
    { id: 'c', name: 'Hyperspace', cells: ['Master', '+20'], unmet: true },
  ];

  let value = $state('a');
</script>

<div class="mothership macro-popup-dialog">
  <PickFromPack
    filterLabel="Filter"
    headers={['Skill Name', 'Rank', 'Bonus']}
    {rows}
    enforceLabel="Enforce Prerequisites"
    {value}
    onchange={(next) => (value = next)}
  />
</div>
