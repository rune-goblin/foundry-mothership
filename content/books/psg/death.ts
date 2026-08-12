import { psg, type Source } from './source.ts';
import type { RollRange } from '../common.ts';

export interface Death {
  id: string;
  name: string;
  die: string;
  results: readonly { range: RollRange; effect: string }[];
  source: Source;
}

export const DEATH = {
  id: 'death',
  name: 'Death',
  die: '1d10',
  results: [
    {
      range: [0, 0],
      effect: 'You are unconscious. You wake up in 2d10 minutes. Reduce your Maximum Health by 1d5.',
    },
    { range: [1, 2], effect: 'You are unconscious and dying. You die in 1d5 rounds without intervention.' },
    {
      range: [3, 4],
      effect: 'You are comatose. Only extraordinary measures can return you to the waking world.',
    },
    { range: [5, 9], effect: 'You have died. Roll up a new character.' },
  ],
  source: psg(29, '29.2'),
} as const satisfies Death;
