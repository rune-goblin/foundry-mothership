import { svelteDialog } from '../../dialogs/svelte-dialog.ts';
import { localize } from '../../i18n.ts';
import NewCharacter from '../../dialogs/NewCharacter.svelte';

// Resolves 'wizard' only when chosen; dismissing falls through to the caller's blank-sheet path.
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
