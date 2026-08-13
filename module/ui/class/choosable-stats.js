/**
 * The key space `base_adjustment` declares, minus `max_wounds` and `skills_granted`: a chosen
 * adjustment is always a stat or a save. The class sheet authors `choose_stat` entries from this
 * list and the generator spends them from it, so both name the same seven keys once.
 */
export const CHOOSABLE_STATS = [
  { key: 'strength', label: 'Mosh.Strength' },
  { key: 'speed', label: 'Mosh.Speed' },
  { key: 'intellect', label: 'Mosh.Intellect' },
  { key: 'combat', label: 'Mosh.Combat' },
  { key: 'sanity', label: 'Mosh.Sanity' },
  { key: 'fear', label: 'Mosh.Fear' },
  { key: 'body', label: 'Mosh.Body' },
];

export const statLabel = (key) => CHOOSABLE_STATS.find((stat) => stat.key === key)?.label ?? null;
