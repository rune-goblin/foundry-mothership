/**
 * base_adjustment's keys minus max_wounds/skills_granted — the class sheet and the generator
 * both name adjustments from this one list.
 */
export const CHOOSABLE_STATS = [
  { key: 'strength', label: 'Mothership.Strength', kind: 'stat' },
  { key: 'speed', label: 'Mothership.Speed', kind: 'stat' },
  { key: 'intellect', label: 'Mothership.Intellect', kind: 'stat' },
  { key: 'combat', label: 'Mothership.Combat', kind: 'stat' },
  { key: 'sanity', label: 'Mothership.Sanity', kind: 'save' },
  { key: 'fear', label: 'Mothership.Fear', kind: 'save' },
  { key: 'body', label: 'Mothership.Body', kind: 'save' },
];

export const statLabel = (key) => CHOOSABLE_STATS.find((stat) => stat.key === key)?.label ?? null;

/**
 * Names what a choose_stat entry offers. Mixed kinds fall back to "stat or save"; a single kind
 * (e.g. the Scientist's four stats) names itself precisely instead.
 */
export function offerLabel(keys) {
  const kinds = new Set(keys.map((key) => CHOOSABLE_STATS.find((stat) => stat.key === key)?.kind));
  if (kinds.size !== 1) return 'Mothership.CharacterGenerator.OneStatOrSave';
  return kinds.has('save') ? 'Mothership.CharacterGenerator.OneSave' : 'Mothership.CharacterGenerator.OneStat';
}
