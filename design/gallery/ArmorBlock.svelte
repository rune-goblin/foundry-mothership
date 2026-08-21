<script module>
  export const meta = {
    group: 'Sections',
    title: 'ArmorBlock',
    path: 'module/ui/parts/sections/ArmorBlock.svelte',
    note: 'Two rows of one table: the armour you are wearing, then the armour the room is lending you. Both are read-only — `prepareDerivedData` owns the arithmetic — unless the caller hands over a write path, which only the creature sheet does: a horror wears nothing, so its armour points are a number on the horror rather than a sum of its kit. The chip at the bottom opens the cover menu — each option carries its examples and what it is worth in small print — and choosing one rewrites the row above it. It is the only control here, and it does not roll. Each specimen is staged at the width the sheet gives the block.',
  };
</script>

<script>
  import ArmorBlock from '../../module/ui/parts/sections/ArmorBlock.svelte';
  import { say } from './fixtures.js';

  const covers = ['none', 'insignificant', 'light', 'heavy'];
</script>

<p class="ds-caption">Derived — the character sheet, where the armour is worn</p>
<div class="grid grid-4col" style="max-width: 640px;">
  {#each covers as cover (cover)}
    <ArmorBlock armor={{ mod: 7, damageReduction: 0, cover }} oncover={say('set cover')} />
  {/each}
</div>

<p class="ds-caption">Named — the creature sheet, where the points are typed</p>
<div class="grid grid-4col" style="max-width: 640px;">
  <ArmorBlock
    armor={{ value: 10, mod: 0, damageReduction: 0, cover: 'none' }}
    name="system.stats.armor.value"
    oncover={say('set cover')}
  />
</div>
