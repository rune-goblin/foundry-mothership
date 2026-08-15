import { CHARACTER_CREATION } from '../../../content/books/psg/character-creation.ts';

/**
 * The wizard's panes: the book's nine numbered steps in the book's order, each paired with the
 * draft state it fills in. Nothing here renders — this is the spine the window walks, and it is
 * pure so `test/generator.test.ts` can walk it too.
 *
 * `done` is what the rail ticks. `required` marks the one pane the wizard will not walk past
 * unfinished: everything from step 4 on reads the class — its wound bonus, its trauma response,
 * its skills, its loadout table — so a wizard that let you skip step 3 would spend five panes
 * reporting the same missing class.
 */

const byId = (id) => {
  const step = CHARACTER_CREATION.steps.find((entry) => entry.id === id);
  if (!step) throw new Error(`No creation step "${id}" in the PSG catalog`);
  return step;
};

/** The book states step 5 and step 6 rather than asking for anything, so both are always done. */
const stated = () => true;

const rolled = (keys) => (draft) => keys.every((key) => draft.rolled[key] !== null);

export const PANES = [
  {
    id: 'intro',
    title: CHARACTER_CREATION.name,
    intro: CHARACTER_CREATION.intro,
    step: null,
    done: stated,
  },
  { id: 'stats', step: byId('step-1-roll-stats'), done: rolled(['strength', 'speed', 'intellect', 'combat']) },
  { id: 'saves', step: byId('step-2-roll-saves'), done: rolled(['sanity', 'fear', 'body']) },
  { id: 'class', step: byId('step-3-choose-your-class'), required: true, done: (draft) => draft.classUuid !== '' },
  { id: 'health', step: byId('step-4-roll-health'), done: rolled(['health']) },
  { id: 'stress', step: byId('step-5-gain-stress'), done: stated },
  { id: 'trauma', step: byId('step-6-note-trauma-response'), done: stated },
  { id: 'skills', step: byId('step-7-choose-skills'), done: (draft) => draft.skills.length > 0 },
  {
    id: 'gear',
    step: byId('step-8-roll-loadout-trinket-and-patch'),
    done: (draft) => draft.loadout !== null && draft.trinket !== null && draft.patch !== null && draft.rolled.credits !== null,
  },
  { id: 'finish', step: byId('step-9-finishing'), done: (draft) => draft.name.trim() !== '' },
];

export const paneTitle = (pane) => pane.title ?? pane.step.title;

/** The pane a wizard opening on an untouched draft should land on: the first one left to do. */
export function firstUnfinished(draft) {
  const index = PANES.findIndex((pane) => !pane.done(draft));
  return index === -1 ? PANES.length - 1 : index;
}
