import type { PodLeaf } from './address.ts';

// Content's own vocabulary, not the schema's — e.g. `wounds` here is `system.hits`, the
// book's word rather than the field's.
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
