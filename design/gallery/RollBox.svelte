<script module>
  export const meta = {
    group: 'Dialog bodies',
    title: 'RollBox',
    path: 'module/ui/generator/RollBox.svelte',
    note: 'One rolled value: a die you click, which becomes the result, plus the class bonus beside it. Local to the generator by design — recurrence inside one window gets a local component, not a shared primitive.',
  };
</script>

<script>
  import RollBox from '../../module/ui/generator/RollBox.svelte';

  let unrolled = $state(0);
  let rolled = $state(5);
</script>

<form class="grid grid-2col">
  <RollBox key="strength" label="Strength" value={null} bind:bonus={unrolled} onroll={() => {}} />
  <RollBox key="intellect" label="Intellect" value={48} bind:bonus={rolled} onroll={() => {}} />
</form>
