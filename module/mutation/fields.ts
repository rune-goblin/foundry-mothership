/**
 * The names content uses for the numbers it changes. `address.ts` keeps taking the dotted string
 * because 39 shipped macros carry it; this is the short vocabulary written *into* content — the
 * book's word, not the schema's, which is why the Wound track is `wounds` here and `hits` there.
 * One map, so a renamed pod is one edit rather than a search through prose.
 */

import type { PodLeaf } from './address.ts';

const PODS = {
  health: 'system.health',
  wounds: 'system.hits',
  stress: 'system.other.stress',
  strength: 'system.stats.strength',
  speed: 'system.stats.speed',
  intellect: 'system.stats.intellect',
  combat: 'system.stats.combat',
  sanity: 'system.stats.sanity',
  fear: 'system.stats.fear',
  body: 'system.stats.body',
} as const;

export type FieldKey = keyof typeof PODS;

export const FIELD_KEYS: readonly FieldKey[] = Object.keys(PODS) as FieldKey[];

export function isFieldKey(value: string): value is FieldKey {
  return Object.hasOwn(PODS, value);
}

export function addressOf(key: FieldKey, leaf: PodLeaf = 'value'): string {
  return `${PODS[key]}.${leaf}`;
}
