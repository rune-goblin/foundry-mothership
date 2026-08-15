<script module>
  export const meta = {
    group: 'Windows',
    title: 'CharacterSheet',
    path: 'module/ui/actor/CharacterSheet.svelte',
    width: 820,
    note: 'The whole sheet, built out of the shared primitives — MainStat, MinMaxField, PipTrack, RollableStat, HealthBlock, ArmorBlock and one ItemPanel per taxonomy. Nothing here writes a class of its own beyond the header grid.',
  };
</script>

<script>
  import CharacterSheet from '../../module/ui/actor/CharacterSheet.svelte';
  import { characterStore } from './fixtures.js';
</script>

<CharacterSheet store={characterStore} />
