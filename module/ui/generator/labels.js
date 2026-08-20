import { localize } from '../../i18n.ts';

export const STATS = [
  ['strength', 'Mothership.Strength'],
  ['speed', 'Mothership.Speed'],
  ['intellect', 'Mothership.Intellect'],
  ['combat', 'Mothership.Combat'],
];

export const SAVES = [
  ['sanity', 'Mothership.Sanity'],
  ['fear', 'Mothership.Fear'],
  ['body', 'Mothership.Body'],
];

export const TABLES = [
  ['loadout', 'Mothership.CharacterGenerator.Table.Loadout'],
  ['trinket', 'Mothership.CharacterGenerator.Table.Trinket'],
  ['patch', 'Mothership.CharacterGenerator.Table.Patch'],
];

export const CLASS_ICONS = {
  Android: '/systems/mothershiprpg/images/class_icons/android.png',
  Marine: '/systems/mothershiprpg/images/class_icons/marine.png',
  Scientist: '/systems/mothershiprpg/images/class_icons/scientist.png',
  Teamster: '/systems/mothershiprpg/images/class_icons/teamster.png',
};

// Order matches the class card.
export const BONUS_LABEL = Object.fromEntries([
  ...STATS,
  ...SAVES,
  ['health', 'Mothership.Health'],
  ['max_wounds', 'Mothership.Wounds'],
]);

// Health isn't here: it's rolled on the next pane, and a row of nothing but dashes would be
// the one line on the page saying nothing.
export const LEDGER = [...STATS, ...SAVES, ['max_wounds', 'Mothership.Wounds']];

export const DASH = '—';

export const signed = (value) => (value > 0 ? `+${value}` : `${value}`);
