<script module>
  export const meta = {
    group: 'Dialog bodies',
    title: 'NoCharacter',
    path: 'module/dialogs/NoCharacter.svelte',
    note: 'Nothing to run the macro on. What to do about it depends on where macros are pointed, so the caller passes the setting’s current value rather than this window reading it.',
  };
</script>

<script>
  import NoCharacter from '../../module/dialogs/NoCharacter.svelte';
</script>

<div class="mothership macro-popup-dialog">
  <NoCharacter target="character" />
</div>
