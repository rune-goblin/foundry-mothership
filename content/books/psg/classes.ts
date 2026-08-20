import type { SkillId, SkillTier } from './skills.ts';
import { psg, type Source } from './source.ts';

export type ClassId = 'marine' | 'android' | 'scientist' | 'teamster';

/** A stat, a save, or — when `target` is null — a stat the player picks. */
export type AdjustmentTarget =
  | 'strength'
  | 'speed'
  | 'intellect'
  | 'combat'
  | 'sanity'
  | 'fear'
  | 'body'
  | 'all'
  | null;

export interface Adjustment {
  raw: string;
  value: number;
  kind: 'stat' | 'save' | 'max-wounds';
  target: AdjustmentTarget;
  /** How many the player picks, when `target` is null. */
  choose?: number;
}

export interface SkillPick {
  tier: SkillTier;
  count: number;
}

export interface CharacterClass {
  id: ClassId;
  name: string;
  description: string;
  adjustments: readonly Adjustment[];
  maxWounds: number;
  traumaResponse: string;
  skills: {
    granted: readonly SkillId[];
    /** A pick the book qualifies in prose — the Scientist's Master skill and its prerequisites. */
    choices: readonly { raw: string; tier: SkillTier; count: number; withPrerequisites: boolean }[];
    /** One entry per OR branch; each branch is the set of picks taken together. */
    bonus: { raw: string; options: readonly (readonly SkillPick[])[] };
  };
  source: Source;
}

export const CLASSES = [
  {
    id: 'marine',
    name: 'Marine',
    description: 'Marines are handy in a fight, but whenever they Panic it may cause problems for the rest of the crew.',
    adjustments: [
      { raw: '+10 COMBAT', value: 10, kind: 'stat', target: 'combat' },
      { raw: '+10 BODY SAVE', value: 10, kind: 'save', target: 'body' },
      { raw: '+20 FEAR SAVE', value: 20, kind: 'save', target: 'fear' },
      { raw: '+1 MAX WOUNDS', value: 1, kind: 'max-wounds', target: null },
    ],
    maxWounds: 3,
    traumaResponse: 'Whenever you Panic, every Close friendly player must make a Fear Save.',
    skills: {
      granted: ['military-training', 'athletics'],
      choices: [],
      bonus: {
        raw: '1 Expert Skill OR: 2 Trained Skills',
        options: [[{ tier: 'expert', count: 1 }], [{ tier: 'trained', count: 2 }]],
      },
    },
    source: psg(42),
  },
  {
    id: 'android',
    name: 'Android',
    description: 'Androids are a terrifying and exciting addition to any crew. They tend to unnerve other crewmembers with their cold inhumanity.',
    adjustments: [
      { raw: '+20 INTELLECT', value: 20, kind: 'stat', target: 'intellect' },
      { raw: '-10 TO 1 STAT', value: -10, kind: 'stat', target: null, choose: 1 },
      { raw: '+60 FEAR SAVE', value: 60, kind: 'save', target: 'fear' },
      { raw: '+1 MAX WOUNDS', value: 1, kind: 'max-wounds', target: null },
    ],
    maxWounds: 3,
    traumaResponse: 'Fear Saves made by Close friendly players are at Disadvantage.',
    skills: {
      granted: ['linguistics', 'computers', 'mathematics'],
      choices: [],
      bonus: {
        raw: '1 Expert Skill OR: 2 Trained Skills',
        options: [[{ tier: 'expert', count: 1 }], [{ tier: 'trained', count: 2 }]],
      },
    },
    source: psg(42),
  },
  {
    id: 'scientist',
    name: 'Scientist',
    description: 'Scientists are doctors, researchers, or anyone who wants to slice open creatures (or infected crewmembers) with a scalpel.',
    adjustments: [
      { raw: '+10 INTELLECT', value: 10, kind: 'stat', target: 'intellect' },
      { raw: '+5 TO 1 STAT', value: 5, kind: 'stat', target: null, choose: 1 },
      { raw: '+30 SANITY SAVE', value: 30, kind: 'save', target: 'sanity' },
    ],
    maxWounds: 2,
    traumaResponse: 'Whenever you fail a Sanity Save, all Close friendly players gain 1 Stress.',
    skills: {
      granted: [],
      choices: [
        {
          raw: '1 Master Skill, and an Expert and Trained Skill prerequisite.',
          tier: 'master',
          count: 1,
          withPrerequisites: true,
        },
      ],
      bonus: { raw: '1 Trained Skill', options: [[{ tier: 'trained', count: 1 }]] },
    },
    source: psg(42),
  },
  {
    id: 'teamster',
    name: 'Teamster',
    description: 'Teamsters are rough and tumble blue-collar space workers, mechanics, engineers, miners, and pilots.',
    adjustments: [
      { raw: '+5 TO ALL STATS', value: 5, kind: 'stat', target: 'all' },
      { raw: '+10 TO ALL SAVES', value: 10, kind: 'save', target: 'all' },
    ],
    maxWounds: 2,
    traumaResponse: 'Once per session, you may take Advantage on a Panic Check.',
    skills: {
      granted: ['industrial-equipment', 'zero-g'],
      choices: [],
      bonus: {
        raw: '1 Trained Skill and 1 Expert Skill.',
        options: [[{ tier: 'trained', count: 1 }, { tier: 'expert', count: 1 }]],
      },
    },
    source: psg(42),
  },
] as const satisfies readonly CharacterClass[];
