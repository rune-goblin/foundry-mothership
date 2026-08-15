<script module>
  export const meta = {
    group: 'Dialog bodies',
    title: 'NewCharacter',
    path: 'module/dialogs/NewCharacter.svelte',
    note: 'The fork in the road a new character reaches: walk the PSG’s nine steps, or start on a blank sheet. The buttons are the answer, so this component holds no state — it explains the two.',
  };
</script>

<script>
  import NewCharacter from '../../module/dialogs/NewCharacter.svelte';
</script>

<div class="mothership macro-popup-dialog">
  <NewCharacter />
</div>
