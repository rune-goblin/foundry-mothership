import { svelteDialog } from '../../dialogs/svelte-dialog.ts';
import { localize } from '../../i18n.ts';
import NewCharacter from '../../dialogs/NewCharacter.svelte';

/**
 * The question a freshly created character raises. Foundry's create dialog builds the actor and
 * renders its sheet before it hands control back, so the choice is offered over that sheet rather
 * than instead of it: "blank sheet" is then the sheet already in front of you and costs nothing,
 * and dismissing the dialog means the same thing.
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
