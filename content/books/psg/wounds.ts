import { psg, type Source } from './source.ts';
import type { Modifier, RollRange, WoundType } from '../common.ts';

export interface WoundTable {
  id: WoundType;
  name: string;
  results: readonly { range: RollRange; effect: string; modifiers: readonly Modifier[] }[];
}

export interface Wounds {
  id: string;
  die: string;
  source: Source;
  /** The severity band a roll falls into: the first entry whose `from` the roll reaches or passes. */
  severityByRoll: readonly { from: number; name: string }[];
  tables: readonly WoundTable[];
}

export const WOUNDS = {
  id: 'wounds',
  die: '1d10',
  source: psg(29, '29.1'),
  severityByRoll: [
    { from: 0, name: 'Flesh Wound' },
    { from: 1, name: 'Minor Injury' },
    { from: 5, name: 'Major Injury' },
    { from: 7, name: 'Lethal Injury (Death Save in 1d10 rounds)' },
    { from: 9, name: 'Fatal Injury (Death Save)' },
  ],
  tables: [
    {
      id: 'blunt-force',
      name: 'Blunt Force',
      results: [
        { range: [0, 0], effect: 'Knocked down.', modifiers: [] },
        { range: [1, 1], effect: 'Winded. [-] until you catch your breath.', modifiers: ['disadvantage'] },
        { range: [2, 2], effect: 'Sprained Ankle. [-] on Speed Checks.', modifiers: ['disadvantage'] },
        { range: [3, 3], effect: 'Concussion. [-] on mental tasks.', modifiers: ['disadvantage'] },
        { range: [4, 4], effect: 'Leg or foot broken. [-] on Speed Checks.', modifiers: ['disadvantage'] },
        { range: [5, 5], effect: 'Arm or hand broken. [-] manual tasks.', modifiers: ['disadvantage'] },
        {
          range: [6, 6],
          effect: 'Snapped collarbone. [-] on Strength Checks.',
          modifiers: ['disadvantage'],
        },
        { range: [7, 7], effect: 'Back broken. [-] on all rolls.', modifiers: ['disadvantage'] },
        { range: [8, 8], effect: 'Skull fracture. [-] on all rolls.', modifiers: ['disadvantage'] },
        { range: [9, 9], effect: 'Spine or neck broken. Death Save.', modifiers: [] },
      ],
    },
    {
      id: 'bleeding',
      name: 'Bleeding',
      results: [
        { range: [0, 0], effect: 'Drop held item.', modifiers: [] },
        { range: [1, 1], effect: 'Lots of blood. Those Close gain 1 Stress.', modifiers: [] },
        { range: [2, 2], effect: 'Blood in eyes. [-] until wiped clean.', modifiers: ['disadvantage'] },
        { range: [3, 3], effect: 'Laceration. Bleeding +1.', modifiers: [] },
        { range: [4, 4], effect: 'Major cut. Bleeding +2.', modifiers: [] },
        { range: [5, 5], effect: 'Fingers/toes severed. Bleeding +3.', modifiers: [] },
        { range: [6, 6], effect: 'Hand/foot severed. Bleeding +4.', modifiers: [] },
        { range: [7, 7], effect: 'Limb severed. Bleeding +5.', modifiers: [] },
        { range: [8, 8], effect: 'Major artery cut. Bleeding +6.', modifiers: [] },
        { range: [9, 9], effect: 'Throat slit or heart pierced. Death Save.', modifiers: [] },
      ],
    },
    {
      id: 'gunshot',
      name: 'Gunshot',
      results: [
        { range: [0, 0], effect: 'Grazed. Knocked down.', modifiers: [] },
        { range: [1, 1], effect: 'Bleeding +1.', modifiers: [] },
        { range: [2, 2], effect: 'Broken rib.', modifiers: [] },
        { range: [3, 3], effect: 'Fractured extremity.', modifiers: [] },
        { range: [4, 4], effect: 'Internal bleeding. Bleeding +2.', modifiers: [] },
        { range: [5, 5], effect: 'Lodged bullet. Surgery required.', modifiers: [] },
        { range: [6, 6], effect: 'Gunshot wound to the neck.', modifiers: [] },
        { range: [7, 7], effect: 'Major blood loss. Bleeding +4.', modifiers: [] },
        { range: [8, 8], effect: 'Sucking chest wound. Bleeding +5.', modifiers: [] },
        { range: [9, 9], effect: 'Headshot. Death Save.', modifiers: [] },
      ],
    },
    {
      id: 'fire-explosives',
      name: 'Fire & Explosives',
      results: [
        { range: [0, 0], effect: 'Hair burnt. Gain 1d5 Stress.', modifiers: [] },
        { range: [1, 1], effect: 'Awesome scar. +1 Minimum Stress.', modifiers: [] },
        { range: [2, 2], effect: 'Singed. [-] on next action.', modifiers: ['disadvantage'] },
        { range: [3, 3], effect: 'Shrapnel/large burn.', modifiers: [] },
        { range: [4, 4], effect: 'Extensive burns. -1d10 Strength.', modifiers: [] },
        { range: [5, 5], effect: 'Major Burn. -2d10 Body Save.', modifiers: [] },
        { range: [6, 6], effect: 'Skin grafts required. -2d10 Body Save.', modifiers: [] },
        { range: [7, 7], effect: 'Limb on fire. 2d10 Damage per round.', modifiers: [] },
        { range: [8, 8], effect: 'Body on fire. 3d10 Damage per round.', modifiers: [] },
        { range: [9, 9], effect: 'Engulfed in fiery explosion. Death Save.', modifiers: [] },
      ],
    },
    {
      id: 'gore-massive',
      name: 'Gore & Massive',
      results: [
        { range: [0, 0], effect: 'Vomit. [-] on next action.', modifiers: ['disadvantage'] },
        { range: [1, 1], effect: 'Awesome scar. +1 Minimum Stress.', modifiers: [] },
        { range: [2, 2], effect: 'Digit mangled.', modifiers: [] },
        { range: [3, 3], effect: 'Eyes gouged out.', modifiers: [] },
        { range: [4, 4], effect: 'Ripped off flesh. -1d10 Strength.', modifiers: [] },
        { range: [5, 5], effect: 'Paralyzed waist down.', modifiers: [] },
        { range: [6, 6], effect: 'Limb severed. Bleeding +5.', modifiers: [] },
        { range: [7, 7], effect: 'Impaled. Bleeding +6.', modifiers: [] },
        { range: [8, 8], effect: 'Guts spooled on floor. Bleeding +7.', modifiers: [] },
        { range: [9, 9], effect: 'Head explodes. No Death Save. You have died.', modifiers: [] },
      ],
    },
  ],
} as const satisfies Wounds;
