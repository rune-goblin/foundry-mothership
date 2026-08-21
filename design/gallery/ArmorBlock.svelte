<script module>
  export const meta = {
    group: 'Sections',
    title: 'ArmorBlock',
    path: 'module/ui/parts/sections/ArmorBlock.svelte',
    note: 'Two rows of one table: the armour you are wearing, then the armour the room is lending you. Both are read-only — `prepareDerivedData` owns the arithmetic. The chip at the bottom opens the cover prompt and rewrites the row above it; it is the only control here, and it does not roll. Each specimen is staged at the width the sheet gives the block.',
  };
</script>

<script>
  import ArmorBlock from '../../module/ui/parts/sections/ArmorBlock.svelte';
  import { say } from './fixtures.js';

  const covers = ['none', 'insignificant', 'light', 'heavy'];
</script>

<div class="grid grid-4col" style="max-width: 640px;">
  {#each covers as cover (cover)}
    <ArmorBlock armor={{ mod: 7, damageReduction: 0, cover }} onchoose={say('choose cover')} />
  {/each}
</div>
