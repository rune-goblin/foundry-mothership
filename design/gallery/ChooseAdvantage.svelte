<script module>
  export const meta = {
    group: 'Dialog bodies',
    title: 'ChooseAdvantage',
    path: 'module/dialogs/ChooseAdvantage.svelte',
    note: 'The three roll-type buttons are the dialog’s own footer, so all this window holds is what a condition has to say about the roll and the line asking for a choice. `die` names what is about to be rolled — legacy said “1d20” to every table it opened for.',
  };
</script>

<script>
  import ChooseAdvantage from '../../module/dialogs/ChooseAdvantage.svelte';
</script>

<div class="mothership macro-popup-dialog">
  <ChooseAdvantage note="Phobia: Fear Save [-]" die="1d100" />
</div>
