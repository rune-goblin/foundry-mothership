<script module>
  export const meta = {
    group: 'Primitives',
    title: 'RollButton',
    path: 'module/ui/parts/RollButton.svelte',
    note: 'The die you click, filling a stat’s number circle until the roll lands and a readonly value takes its place. RollDie’s opposite number: there the die is a cue riding a label that carries the roll, here it is the control itself, so it turns on its own hover and answers the keyboard.',
  };
</script>

<script>
  import RollButton from '../../module/ui/parts/RollButton.svelte';
  import { say } from './fixtures.js';
</script>

<p class="ds-caption">Waiting for the roll, and the value that replaces it</p>
<div class="flex-group-left">
  <RollButton key="strength" title="Strength" onroll={say('roll strength')} />
  <input class="circle-input" type="text" readonly value="48" />
</div>
