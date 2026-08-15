<script module>
  export const meta = {
    group: 'Dialog bodies',
    title: 'PickFromPack',
    path: 'module/ui/actor/PickFromPack.svelte',
    note: 'The compendium picker: filter, an optional prerequisite gate, and one radio per row. The pick is mirrored in local state because `value` never re-renders — svelte-dialog holds it in a closure — and a refilter rebuilds the radio nodes.',
  };
</script>

<script>
  import PickFromPack from '../../module/ui/actor/PickFromPack.svelte';
  import { say } from './fixtures.js';

  const rows = [
    { id: 'a', name: 'Zero-G', img: 'icons/svg/upgrade.svg', cells: ['Trained', '+10'], unmet: false },
    { id: 'b', name: 'Piloting', img: 'icons/svg/upgrade.svg', cells: ['Expert', '+15'], unmet: false },
    { id: 'c', name: 'Hyperspace', img: 'icons/svg/upgrade.svg', cells: ['Master', '+20'], unmet: true },
  ];
</script>

<div class="mothership macro-popup-dialog">
  <PickFromPack
    filterLabel="Filter by name"
    headers={['Skill', 'Rank', 'Bonus']}
    {rows}
    enforceLabel="Require prerequisites"
    value="a"
    onchange={say('picked')}
  />
</div>
