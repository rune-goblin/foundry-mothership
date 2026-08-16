/**
 * What a class's skill picks expand to. A pick is a promise of one skill at some rank; a
 * *_full_set pick is one skill plus the prerequisite chain beneath it, so it expands to a slot per
 * rank and gates none of them, while a bare Expert or Master pick is one slot gated on already
 * owning a prerequisite.
 *
 * The wizard fills these in place, so the expansion has to be a pure function of the class: the
 * pane rebuilds its slots whenever a bonus package changes and keeps the picks whose slot survives.
 */

const SETS = {
  master_full_set: [
    { rank: 'Master', gated: false },
    { rank: 'Expert', gated: false },
    { rank: 'Trained', gated: false },
  ],
  expert_full_set: [
    { rank: 'Expert', gated: false },
    { rank: 'Trained', gated: false },
  ],
  trained: [{ rank: 'Trained', gated: false }],
  expert: [{ rank: 'Expert', gated: true }],
  master: [{ rank: 'Master', gated: true }],
};

export const PICK_KINDS = Object.keys(SETS);

export const RANK_LABEL = {
  Trained: 'Mothership.SkillRankTrained',
  Expert: 'Mothership.SkillRankExpert',
  Master: 'Mothership.SkillRankMaster',
};

/** The counts a bonus package hands out, in the order the pane lists them. */
const PACKAGE_COUNTS = [
  ['master', 'Mothership.SkillRankMaster'],
  ['expert', 'Mothership.SkillRankExpert'],
  ['trained', 'Mothership.SkillRankTrained'],
  ['master_full_set', 'Mothership.CharacterGenerator.SkillOption.PopupFullMasterName'],
  ['expert_full_set', 'Mothership.CharacterGenerator.SkillOption.PopupFullExpertName'],
];

/**
 * One slot per skill the pick-set promises, broadest rank first — the order the prerequisite chain
 * needs, and the order a player reads. `source` keys the slots to what handed them out, so a
 * package swapped for another does not carry the old package's answers across.
 */
export function expandSlots(picks, source) {
  const slots = [];
  for (const kind of PICK_KINDS) {
    for (let index = 0; index < (picks?.[kind] ?? 0); index += 1) {
      for (const { rank, gated } of SETS[kind]) {
        slots.push({ key: `${source}:${kind}:${index}:${rank}`, rank, gated });
      }
    }
  }
  return slots;
}

/** What a bonus package promises, as label keys and counts the pane can print. */
export function packageCounts(option) {
  return PACKAGE_COUNTS.filter(([key]) => option[key]).map(([key, label]) => ({
    label,
    count: option[key],
  }));
}
