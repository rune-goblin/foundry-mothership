import { svelteDialog } from '../../dialogs/svelte-dialog.ts';
import { localize } from '../../i18n.ts';
import NewCharacter from '../../dialogs/NewCharacter.svelte';

/**
 * The question a freshly created character raises. The character sheet stops its first render
 * before Foundry builds a frame, then uses this answer to open either the wizard or the blank
 * sheet. Dismissing the dialog retains the old meaning of choosing the blank sheet.
 *
 * Resolves `'wizard'` only when the player asked for it.
 */
export async function chooseCreationMode() {
  return await svelteDialog({
    component: NewCharacter,
    props: {},
    title: localize('Mothership.CharacterGenerator.NewCharacter.Title'),
    initial: null,
    width: 460,
    buttons: [
      {
        action: 'wizard',
        label: localize('Mothership.CharacterGenerator.name'),
        icon: 'fas fa-cogs',
        default: true,
        answer: () => 'wizard',
      },
      {
        action: 'blank',
        label: localize('Mothership.CharacterGenerator.NewCharacter.Blank'),
        icon: 'fas fa-file',
        answer: () => 'blank',
      },
    ],
  });
}
