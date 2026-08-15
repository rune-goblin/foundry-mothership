<script module>
  export const meta = {
    group: 'Dialog bodies',
    title: 'Reload',
    path: 'module/dialogs/Reload.svelte',
    note: 'Both ammunition prompts: the one offering a reload and the one with nothing left to offer. The buttons are the dialog’s, so the message is the whole window.',
  };
</script>

<script>
  import Reload from '../../module/dialogs/Reload.svelte';
  import { localize } from '../../module/i18n.ts';
</script>

<div class="mothership macro-popup-dialog">
  <Reload message={localize('Mothership.OutOfAmmoNeedReload')} />
  <Reload message={localize('Mothership.OutOfAmmo')} />
</div>
