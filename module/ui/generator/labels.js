// What the wizard prints: the label pairs its panes iterate, the class art it hangs beside a
// heading, and the two spellings — a signed number, an unanswered slot — that several panes share.
// Kept out of the components because the panes were split apart and would otherwise each keep
// their own copy of the book's ordering.
import { localize, format } from '../../i18n.ts';
import { NUMBERED, paneTitle } from './steps.js';

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

// The rail numbers the panes it walks. Two of the book's nine steps ask the player nothing, and
// step 3 asks two things, so the wizard's numbering is its own.
export const numberOf = (entry) => NUMBERED.indexOf(entry) + 1;

/** A pane prints the book's step, or — where the wizard interposes one of its own — its own copy. */
export function titleOf(entry, draft) {
  if (entry.id === 'adjustments' && draft.className) {
    return format('Mothership.CharacterGenerator.Wizard.ClassAdjustments', { class: draft.className });
  }
  return entry.titleKey ? localize(entry.titleKey) : paneTitle(entry);
}
