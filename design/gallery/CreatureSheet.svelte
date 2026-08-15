<script module>
  export const meta = {
    group: 'Windows',
    title: 'CreatureSheet',
    path: 'module/ui/creature/CreatureSheet.svelte',
    width: 820,
    note: 'The same sections as the character sheet, over the creature’s own stat set — which stats show at all is a per-creature setting, and the weight column is hidden.',
  };
</script>

<script>
  import CreatureSheet from '../../module/ui/creature/CreatureSheet.svelte';
  import { creatureStore } from './fixtures.js';
</script>

<CreatureSheet store={creatureStore} />
