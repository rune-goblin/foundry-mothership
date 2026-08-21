import { localize } from '../../i18n.ts';
import { offerLabel } from '../class/choosable-stats.js';

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

/**
 * The class card's own vocabulary and its own order: the book's step 3 prints "+10 BODY SAVE",
 * "+1 MAX WOUNDS", and Body before Fear — not the save-rolling order SAVES carries.
 */
export const BONUS_LABEL = {
  strength: 'Mothership.Strength',
  speed: 'Mothership.Speed',
  intellect: 'Mothership.Intellect',
  combat: 'Mothership.Combat',
  body: 'Mothership.BodySave',
  fear: 'Mothership.FearSave',
  sanity: 'Mothership.SanitySave',
  health: 'Mothership.Health',
  max_wounds: 'Mothership.MaxWounds',
};

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

const CARD_ORDER = Object.keys(BONUS_LABEL);

// Stats, then saves, then everything else — the three bands step 3 prints a class's adjustments in.
const BAND = { strength: 0, speed: 0, intellect: 0, combat: 0, all_stats: 0, body: 1, fear: 1, sanity: 1, all_saves: 1 };

const band = (key) => BAND[key] ?? 2;

const bandOf = (stats) => (offerLabel(stats) === 'Mothership.CharacterGenerator.OneSave' ? 1 : band(stats[0]));

/**
 * The class card as the book prints it — the sheet's own lines, in the sheet's own order, with a
 * picked adjustment standing in its band rather than appended after everything: the Android reads
 * "+20 INTELLECT, -10 TO 1 STAT, +60 FEAR SAVE, +1 MAX WOUNDS".
 */
export function classCard(adjustments, choices = []) {
  const rows = collapseAdjustments(
    [...adjustments].sort((a, b) => CARD_ORDER.indexOf(a.key) - CARD_ORDER.indexOf(b.key)),
  ).map((row) => ({ ...row, band: band(row.key) }));

  choices.forEach((choice, position) => {
    rows.push({
      key: `choice-${position}`,
      position,
      label: offerLabel(choice.stats),
      value: choice.modification,
      band: bandOf(choice.stats),
    });
  });

  return rows.sort((a, b) => a.band - b.band);
}
