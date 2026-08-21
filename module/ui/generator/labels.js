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

const GROUPS = [
  { key: 'all_stats', label: 'Mothership.CharacterGenerator.AllStats', members: STATS },
  { key: 'all_saves', label: 'Mothership.CharacterGenerator.AllSaves', members: SAVES },
];

const uniform = (adjustments, group) => {
  const values = group.members.map(([key]) => adjustments.find((row) => row.key === key)?.value);
  return values.every((value) => value !== undefined && value === values[0]);
};

/**
 * The book prints the Teamster's flat bonus as "+5 to all Stats", not as four identical rows —
 * so a group whose members all move by the same amount collapses to one row where the first
 * of them stood.
 */
export function collapseAdjustments(adjustments) {
  const collapsed = GROUPS.filter((group) => uniform(adjustments, group));
  const rows = [];
  for (const { key, value } of adjustments) {
    const group = collapsed.find((entry) => entry.members.some(([member]) => member === key));
    if (!group) {
      rows.push({ key, label: BONUS_LABEL[key], value });
    } else if (!rows.some((row) => row.key === group.key)) {
      rows.push({ key: group.key, label: group.label, value });
    }
  }
  return rows;
}
