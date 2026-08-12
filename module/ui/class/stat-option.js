import { localize } from '../i18n.js';

// The key space base_adjustment declares, minus max_wounds and skills_granted: a chosen
// adjustment is always a stat or a save.
const CHOOSABLE = [
  ['strength', 'Mosh.Strength'],
  ['speed', 'Mosh.Speed'],
  ['intellect', 'Mosh.Intellect'],
  ['combat', 'Mosh.Combat'],
  ['sanity', 'Mosh.Sanity'],
  ['fear', 'Mosh.Fear'],
  ['body', 'Mosh.Body'],
];

const content = () => `
  <div class="macro_desc" style="margin-bottom : -5px;"><h4>${localize('Mosh.CharacterGenerator.StatOption')}</h4></div>
  <div><input type="number" id="modification" placeholder="${localize('Mosh.Value')}" /></div>
  ${CHOOSABLE.map(
    ([key, label]) =>
      `<div><label><input type="checkbox" id="${key}" />${localize(label)}</label></div>`,
  ).join('')}
`;

/**
 * Ask for one `selected_adjustment.choose_stat` entry: a value, and the stats it may be spent on.
 * Resolves to the entry, or to null if the dialog is cancelled or names fewer than two stats.
 */
export function promptStatOption() {
  return new Promise((resolve) => {
    new foundry.applications.api.DialogV2({
      window: { title: localize('Mosh.CharacterGenerator.StatOption') },
      classes: ['macro-popup-dialog'],
      content: content(),
      buttons: [
        {
          icon: 'fas fa-check',
          action: 'create',
          label: 'Create',
          callback: (event, button) => {
            const stats = CHOOSABLE.map(([key]) => key).filter(
              (key) => button.form.querySelector(`#${key}`)?.checked,
            );
            if (stats.length < 2) {
              ui.notifications.error(localize('Mosh.classNewStatOptionEmptyError'));
              resolve(null);
              return;
            }
            // The generator reads this back with parseInt and the generated classes store it as a
            // number; an input's value is a string, so convert here rather than storing both.
            resolve({ modification: Number(button.form.querySelector('#modification').value) || 0, stats });
          },
        },
        {
          icon: 'fas fa-times',
          action: 'cancel',
          label: 'Cancel',
          callback: () => resolve(null),
        },
      ],
      default: 'create',
      close: () => resolve(null),
    }).render({ force: true });
  });
}
