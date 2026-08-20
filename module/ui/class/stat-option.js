import { svelteDialog } from '../../dialogs/svelte-dialog.ts';
import { localize } from '../../i18n.ts';
import StatOption from './StatOption.svelte';
import { CHOOSABLE_STATS } from './choosable-stats.js';

export async function promptStatOption() {
  const entry = await svelteDialog({
    component: StatOption,
    props: {
      heading: localize('Mothership.CharacterGenerator.StatOption'),
      valueLabel: localize('Mothership.Value'),
      stats: CHOOSABLE_STATS.map((stat) => ({ key: stat.key, label: localize(stat.label) })),
    },
    title: localize('Mothership.CharacterGenerator.StatOption'),
    // The generator reads the modification back with arithmetic and the generated classes store it
    // as a number, so the dialog answers with one rather than with an input's string.
    initial: { modification: 0, stats: [] },
    buttons: [
      {
        action: 'create',
        label: localize('Mothership.Create'),
        icon: 'fas fa-check',
        default: true,
        answer: (draft) => draft,
      },
      { action: 'cancel', label: localize('Mothership.Cancel'), icon: 'fas fa-times', answer: () => null },
    ],
  });

  if (entry === null) return null;
  if (entry.stats.length < 2) {
    ui.notifications.error(localize('Mothership.classNewStatOptionEmptyError'));
    return null;
  }
  return entry;
}
