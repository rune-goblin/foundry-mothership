import { psg, type Source } from './source.ts';

// Only step 5 kept its `text` — a test reads STARTING_STRESS out of it.
export interface CreationStep {
  id: string;
  number: number;
  title: string;
  instruction: string | null;
  text?: readonly string[];
  /** `formula` is what the generator rolls; `raw` is display text. */
  roll: { raw: string; formula: string } | null;
  source: Source;
}

export interface CharacterCreation {
  id: string;
  name: string;
  steps: readonly CreationStep[];
  source: Source;
}

export const CHARACTER_CREATION = {
  id: 'character-creation',
  name: 'How to Make Your Character',
  steps: [
    {
      id: 'step-1-roll-stats',
      number: 1,
      title: 'Roll Stats',
      instruction: 'Roll 2 ten-sided dice (2d10), add them together, then add 25. Record the results for each Stat.',
      source: psg(4),
      roll: {
        raw: 'Roll 2 ten-sided dice (2d10), add them together, then add 25. Record the results for each Stat.',
        formula: '2d10+25',
      },
    },
    {
      id: 'step-2-roll-saves',
      number: 2,
      title: 'Roll Saves',
      instruction: 'Roll 2 ten-sided dice (2d10), add them together, then add 10. Record the results for each Save.',
      source: psg(4),
      roll: {
        raw: 'Roll 2 ten-sided dice (2d10), add them together, then add 10. Record the results for each Save.',
        formula: '2d10+10',
      },
    },
    {
      id: 'step-3-choose-your-class',
      number: 3,
      title: 'Choose Your Class',
      instruction: 'Mark your class, then alter your Stats and Saves accordingly.',
      source: psg(4),
      roll: null,
    },
    {
      id: 'step-4-roll-health',
      number: 4,
      title: 'Roll Health',
      instruction: 'Roll 1 ten-sided die (1d10) then add 10. Record the result for Maximum Health.',
      source: psg(5),
      roll: {
        raw: 'Roll 1 ten-sided die (1d10) then add 10. Record the result for Maximum Health.',
        formula: '1d10+10',
      },
    },
    {
      id: 'step-5-gain-stress',
      number: 5,
      title: 'Gain Stress',
      instruction: null,
      text: ["Characters' current Stress and Minimum Stress both start at 2."],
      source: psg(5),
      roll: null,
    },
    {
      id: 'step-6-note-trauma-response',
      number: 6,
      title: 'Note Trauma Response',
      instruction: null,
      source: psg(5),
      roll: null,
    },
    {
      id: 'step-7-choose-skills',
      number: 7,
      title: 'Choose Skills',
      instruction: 'To choose a Skill you must have at least one prerequisite Skill (a Skill that has an arrow pointing from it) first.',
      source: psg(5),
      roll: null,
    },
    {
      id: 'step-8-roll-loadout-trinket-and-patch',
      number: 8,
      title: 'Roll Loadout, Trinket, and Patch',
      instruction: null,
      source: psg(5),
      roll: { raw: 'Finally, roll 2d10 and multiply it by 10 for starting Credits.', formula: '2d10*10' },
    },
    {
      id: 'step-9-finishing',
      number: 9,
      title: 'Finishing',
      instruction: null,
      source: psg(5),
      roll: null,
    },
  ],
  source: psg(4),
} as const satisfies CharacterCreation;
