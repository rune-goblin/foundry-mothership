<script module>
  export const meta = {
    group: 'Dialog bodies',
    title: 'NewCharacter',
    path: 'module/dialogs/NewCharacter.svelte',
    note: 'The fork in the road a new character reaches. The dialog buttons are the answer, so this component only supplies its heading.',
  };
</script>

<script>
  import NewCharacter from '../../module/dialogs/NewCharacter.svelte';
</script>

<div class="mothership macro-popup-dialog">
  <NewCharacter />
</div>
