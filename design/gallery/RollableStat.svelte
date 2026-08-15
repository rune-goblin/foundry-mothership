<script module>
  export const meta = {
    group: 'Primitives',
    title: 'RollableStat',
    path: 'module/ui/parts/RollableStat.svelte',
    note: 'A caption that is also the roll. The key and label stay as data attributes; the roll itself is a prop, and the keyboard twin comes with it.',
  };
</script>

<script>
  import RollableStat from '../../module/ui/parts/RollableStat.svelte';
  import { say } from './fixtures.js';
</script>

<div class="flex-group-left">
  <RollableStat label="Sanity" key="sanity" class="mainstattext" onroll={say('roll sanity')} />
  <RollableStat label="Fear" key="fear" class="creaturestat" onroll={say('roll fear')} />
</div>
