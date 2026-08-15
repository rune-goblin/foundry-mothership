<script module>
  export const meta = {
    group: 'Sections',
    title: 'ArmorBlock',
    path: 'module/ui/parts/sections/ArmorBlock.svelte',
    note: 'Derived armour points and damage reduction, each showing the bonus the chosen cover adds beside it. Both are read-only — `prepareDerivedData` owns the arithmetic.',
  };
</script>

<script>
  import ArmorBlock from '../../module/ui/parts/sections/ArmorBlock.svelte';
  import { say } from './fixtures.js';

  const covers = ['none', 'insignificant', 'light', 'heavy'];
</script>

<div class="grid grid-4col">
  {#each covers as cover (cover)}
    <ArmorBlock armor={{ mod: 7, damageReduction: 0, cover }} onroll={say('roll armor save')} />
  {/each}
</div>
