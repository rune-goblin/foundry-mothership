<script module>
  export const meta = {
    group: 'Windows',
    title: 'CreatureSettings',
    path: 'module/ui/creature/CreatureSettings.svelte',
    note: 'Which of the creature’s stats its sheet shows, plus the swarm toggle. One CheckField per stat.',
  };
</script>

<script>
  import CreatureSettings from '../../module/ui/creature/CreatureSettings.svelte';
  import { creature, store } from './fixtures.js';
</script>

<CreatureSettings store={store(creature)} />
