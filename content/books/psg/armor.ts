import { psg, type Source } from './source.ts';
import type { Cost, Duration, Modifier } from '../common.ts';

export interface Armor {
  id: string;
  name: string;
  description: string | null;
  cost: Cost;
  armorPoints: number;
  oxygen: Duration | null;
  speed: { raw: string; modifiers: readonly Modifier[] };
  damageReduction: number;
  special: string | null;
  source: Source;
}

export const ARMOR = [
  {
    id: 'standard-crew-attire',
    name: 'Standard Crew Attire',
    description: 'Basic clothing.',
    cost: { raw: '100cr', value: 100, each: false },
    armorPoints: 1,
    oxygen: null,
    speed: { raw: 'Normal', modifiers: [] },
    damageReduction: 0,
    special: null,
    source: psg(2),
  },
  {
    id: 'vaccsuit',
    name: 'Vaccsuit',
    description: 'Designed for outer space operations.',
    cost: { raw: '10kcr', value: 10000, each: false },
    armorPoints: 3,
    oxygen: { raw: '12 hrs', minutes: 720 },
    speed: { raw: '[-]', modifiers: ['disadvantage'] },
    damageReduction: 0,
    special: 'Includes short-range comms, headlamp, and radiation shielding. Decompression within 1d5 rounds if punctured.',
    source: psg(2),
  },
  {
    id: 'hazard-suit',
    name: 'Hazard Suit',
    description: 'Environmental protection while exploring unknown planets.',
    cost: { raw: '4kcr', value: 4000, each: false },
    armorPoints: 5,
    oxygen: { raw: '1 hr', minutes: 60 },
    speed: { raw: 'Normal', modifiers: [] },
    damageReduction: 0,
    special: 'Includes air filter, extreme heat/cold protection, hydration reclamation (1L of water lasts 4 days), short-range comms, headlamp, and radiation shielding.',
    source: psg(2),
  },
  {
    id: 'standard-battle-dress',
    name: 'Standard Battle Dress',
    description: 'Lightly-plated armor worn by most marines.',
    cost: { raw: '2kcr', value: 2000, each: false },
    armorPoints: 7,
    oxygen: null,
    speed: { raw: 'Normal', modifiers: [] },
    damageReduction: 0,
    special: 'Includes short-range comms.',
    source: psg(2),
  },
  {
    id: 'advanced-battle-dress',
    name: 'Advanced Battle Dress',
    description: 'Heavy armor for marines deployed in high combat offworld engagements.',
    cost: { raw: '12kcr', value: 12000, each: false },
    armorPoints: 10,
    oxygen: { raw: '1 hr', minutes: 60 },
    speed: { raw: '[-]', modifiers: ['disadvantage'] },
    damageReduction: 3,
    special: 'Includes short-range comms, body cam, headlamp, HUD, exoskeletal weave (Strength Checks [+]), and radiation shielding. Damage Reduction: 3.',
    source: psg(2),
  },
] as const satisfies readonly Armor[];

export type ArmorId = (typeof ARMOR)[number]['id'];
