// The vocabulary more than one card iterates: the book's stat and save orders, the class art, the
// ledger's rows, and the two spellings — a signed number, an unanswered slot — they share.
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

/** What a class adjustment can name, in the order the class card lists them. */
export const BONUS_LABEL = Object.fromEntries([
  ...STATS,
  ...SAVES,
  ['health', 'Mothership.Health'],
  ['max_wounds', 'Mothership.Wounds'],
]);

// The ledger's two columns, filled down and then across: the four stats, then the three saves
// and the wound track the class also moves. Health is not here — it is rolled on the next pane,
// and a row reading "—  —" would be the one line on the page saying nothing.
export const LEDGER = [...STATS, ...SAVES, ['max_wounds', 'Mothership.Wounds']];

/** What every unanswered slot in this window prints, so a blank never reads as a missing element. */
export const DASH = '—';

export const signed = (value) => (value > 0 ? `+${value}` : `${value}`);
