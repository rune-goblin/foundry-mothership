/**
 * The key space `base_adjustment` declares, minus `max_wounds` and `skills_granted`: a chosen
 * adjustment is always a stat or a save. The class sheet authors `choose_stat` entries from this
 * list and the generator spends them from it, so both name the same seven keys once.
 */
export const CHOOSABLE_STATS = [
  { key: 'strength', label: 'Mothership.Strength' },
  { key: 'speed', label: 'Mothership.Speed' },
  { key: 'intellect', label: 'Mothership.Intellect' },
  { key: 'combat', label: 'Mothership.Combat' },
  { key: 'sanity', label: 'Mothership.Sanity' },
  { key: 'fear', label: 'Mothership.Fear' },
  { key: 'body', label: 'Mothership.Body' },
];

export const statLabel = (key) => CHOOSABLE_STATS.find((stat) => stat.key === key)?.label ?? null;
