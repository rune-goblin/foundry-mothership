/**
 * What a class's skill picks expand to. A pick is a promise of one skill at some rank; a
 * *_full_set pick is one skill plus the prerequisite chain beneath it, so it expands to a slot per
 * rank, while a bare Expert or Master pick is one slot gated on already owning a prerequisite.
 *
 * A set's slots run narrowest rank first, and every slot above the base is gated — which is the
 * whole of the Scientist's "1 Master Skill, and an Expert and Trained Skill prerequisite". The set
 * needs no rule of its own: step 7's rule for everyone, "you must have at least one prerequisite
 * Skill first", already forces the chain when the picks are taken from the bottom up, because the
 * only Expert the Master can stand on is the one the set just bought. Gating nothing was the bug —
 * it let a Scientist finish with a Master and two unrelated skills.
 *
 * The wizard fills these in place, so the expansion has to be a pure function of the class: the
 * pane rebuilds its slots whenever a bonus package changes and keeps the picks whose slot survives.
 */

const SETS = {
  master_full_set: [
    { rank: 'Trained', gated: false },
    { rank: 'Expert', gated: true },
    { rank: 'Master', gated: true },
  ],
  expert_full_set: [
    { rank: 'Trained', gated: false },
    { rank: 'Expert', gated: true },
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
 * One slot per skill the pick-set promises, narrowest rank first — the order the prerequisite chain
 * needs, since a gated slot can only be filled once something it stands on is held. `source` keys
 * the slots to what handed them out, so a package swapped for another does not carry the old
 * package's answers across.
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

/**
 * The same pick-set as a sentence rather than a tally, broadest rank first — what the book's class
 * card prints under a class name before anything has been chosen. Singular and plural are separate
 * keys because the book writes "1 Expert Skill" and "2 Trained Skills"; Foundry's localizer has no
 * plural rule of its own.
 */
const PHRASES = {
  master_full_set: 'MasterSet',
  master: 'Master',
  expert_full_set: 'ExpertSet',
  expert: 'Expert',
  trained: 'Trained',
};

export function pickPhrases(picks) {
  return Object.entries(PHRASES)
    .filter(([kind]) => picks?.[kind])
    .map(([kind, name]) => ({
      label: `Mothership.CharacterGenerator.Pick.${name}${picks[kind] === 1 ? '' : 'Plural'}`,
      count: picks[kind],
    }));
}

/** What a bonus package promises, as label keys and counts the pane can print. */
export function packageCounts(option) {
  return PACKAGE_COUNTS.filter(([key]) => option[key]).map(([key, label]) => ({
    label,
    count: option[key],
  }));
}
