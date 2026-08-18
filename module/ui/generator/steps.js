import { CHARACTER_CREATION } from '../../../content/books/psg/character-creation.ts';

/**
 * The wizard's panes: the book's steps in the book's order, each paired with the draft state it
 * fills in. Nothing here renders — this is the spine the window walks, and it is pure so
 * `test/generator.test.ts` can walk it too.
 *
 * A pane is a question. The book's steps 5 and 6 ask nothing — Stress starts at 2 for everyone,
 * and the Trauma Response is whatever the chosen class prints — so neither is a pane: the class
 * pane shows the Trauma Response the class brings. The rail numbers what it walks, which is why a
 * pane's number is its position rather than the book's.
 *
 * Two panes are the wizard's own rather than the book's, and say so with `step: null`: the front
 * matter, which asks nothing and so is the one pane the rail stars instead of numbering, and the
 * adjustments pane, which places what a class leaves to the player. Step 3 is two questions —
 * which class, then where its free adjustment goes — and asking both on one pane meant answering
 * the second against cards that had already stopped being the subject. A pane of the wizard's own
 * prints its own copy, so it carries `titleKey`/`introKeys` where a book pane carries the step.
 *
 * `done` both ticks the rail and gates the pane after it. Every question must be answered before
 * the wizard walks forward, so the same predicate is the single source of truth for progress and
 * navigation.
 */

const byId = (id) => {
  const step = CHARACTER_CREATION.steps.find((entry) => entry.id === id);
  if (!step) throw new Error(`No creation step "${id}" in the PSG catalog`);
  return step;
};

/** The intro asks nothing; it is the book's own front matter, and always done. */
const stated = () => true;

const rolled = (keys) => (draft) => keys.every((key) => draft.rolled[key] !== null);

export const PANES = [
  {
    id: 'intro',
    title: CHARACTER_CREATION.name,
    intro: CHARACTER_CREATION.intro,
    step: null,
    numbered: false,
    done: stated,
  },
  { id: 'stats', step: byId('step-1-roll-stats'), done: rolled(['strength', 'speed', 'intellect', 'combat']) },
  { id: 'saves', step: byId('step-2-roll-saves'), done: rolled(['sanity', 'fear', 'body']) },
  { id: 'class', step: byId('step-3-choose-your-class'), done: (draft) => draft.classUuid !== '' },
  {
    id: 'adjustments',
    titleKey: 'Mothership.CharacterGenerator.Wizard.Adjustments',
    step: null,
    // A draft with no class has no choices to spend, and `every` over nothing is true — so this
    // reads the class too, or the rail would tick a pane the player has not reached.
    done: (draft) => draft.classUuid !== '' && draft.statChoicesSpent,
  },
  { id: 'health', step: byId('step-4-roll-health'), done: rolled(['health']) },
  { id: 'skills', step: byId('step-7-choose-skills'), done: (draft) => draft.skillsPicked },
  {
    id: 'gear',
    step: byId('step-8-roll-loadout-trinket-and-patch'),
    done: (draft) => draft.loadout !== null && draft.trinket !== null && draft.patch !== null && draft.rolled.credits !== null,
  },
  { id: 'finish', step: byId('step-9-finishing'), done: (draft) => draft.name.trim() !== '' },
];

/** The book's own title for a pane. A pane printing the wizard's copy carries `titleKey` instead. */
export const paneTitle = (pane) => pane.title ?? pane.step.title;

/** The panes the counter counts, in order: everything the wizard asks something on. */
export const NUMBERED = PANES.filter((pane) => pane.numbered !== false);

/** The pane a wizard opening on an untouched draft should land on: the first one left to do. */
export function firstIncomplete(draft) {
  return PANES.findIndex((pane) => !pane.done(draft));
}

/** Where to open: the first incomplete pane, or Finish when a complete draft is reopened. */
export function firstUnfinished(draft) {
  const index = firstIncomplete(draft);
  return index === -1 ? PANES.length - 1 : index;
}
