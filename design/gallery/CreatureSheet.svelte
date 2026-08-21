<script module>
  export const meta = {
    group: 'Windows',
    title: 'CreatureSheet',
    path: 'module/ui/creature/CreatureSheet.svelte',
    width: 820,
    note: 'The UCR stat block and nothing else: the name, the two stats a horror is rolled on, its wounds over its Health, its attacks and its special abilities. Speed, Loyalty, Sanity and AP appear only where the creature settings turn them on.',
  };
</script>

<script>
  import CreatureSheet from '../../module/ui/creature/CreatureSheet.svelte';
  import { creatureStore } from './fixtures.js';
</script>

<CreatureSheet store={creatureStore} />
