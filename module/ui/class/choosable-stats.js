/**
 * The key space `base_adjustment` declares, minus `max_wounds` and `skills_granted`: a chosen
 * adjustment is always a stat or a save. The class sheet authors `choose_stat` entries from this
 * list and the generator spends them from it, so both name the same seven keys once.
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
 * What a `choose_stat` entry offers, named the way the book names it. The Scientist's "+5 TO 1
 * STAT" and the Android's "-10 TO 1 STAT" both offer the four stats and no save, so a card that
 * advertised them as "1 Stat or Save" promised a choice the pane below it would not give.
 */
export function offerLabel(keys) {
  const kinds = new Set(keys.map((key) => CHOOSABLE_STATS.find((stat) => stat.key === key)?.kind));
  if (kinds.size !== 1) return 'Mothership.CharacterGenerator.OneStatOrSave';
  return kinds.has('save') ? 'Mothership.CharacterGenerator.OneSave' : 'Mothership.CharacterGenerator.OneStat';
}
