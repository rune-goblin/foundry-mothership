<script module>
  export const meta = {
    group: 'Sections',
    title: 'HealthBlock',
    path: 'module/ui/parts/sections/HealthBlock.svelte',
    note: 'Health and Wounds, the pair both actor sheets share byte for byte. The section writes no class of its own — every name in the rendered markup is MinMaxField’s.',
  };
</script>

<script>
  import HealthBlock from '../../module/ui/parts/sections/HealthBlock.svelte';
  import { character } from './fixtures.js';
</script>

<div class="grid grid-2col">
  <HealthBlock health={character.system.health} hits={character.system.hits} />
</div>
