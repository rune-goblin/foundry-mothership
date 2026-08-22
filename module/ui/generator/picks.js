// Every slot above the base rank is gated: filling slots bottom-up forces each higher rank onto
// the slot the set itself just bought. Ungated was the bug — a Scientist could finish with a
// Master and two unrelated skills.

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

const PACKAGE_COUNTS = [
  ['master', 'Mothership.SkillRankMaster'],
  ['expert', 'Mothership.SkillRankExpert'],
  ['trained', 'Mothership.SkillRankTrained'],
  ['master_full_set', 'Mothership.CharacterGenerator.SkillOption.PopupFullMasterName'],
  ['expert_full_set', 'Mothership.CharacterGenerator.SkillOption.PopupFullExpertName'],
];

// `source` keys each slot to what handed it out, so swapping packages doesn't carry old answers across.
export function expandSlots(picks, source) {
  const slots = [];
  for (const kind of PICK_KINDS) {
    for (let index = 0; index < (picks?.[kind] ?? 0); index += 1) {
      const set = `${source}:${kind}:${index}`;
      for (const { rank, gated } of SETS[kind]) {
        slots.push({ key: `${set}:${rank}`, set, rank, gated });
      }
    }
  }
  return slots;
}

// Singular/plural are separate lang keys because Foundry's localizer has no plural rule of its own.
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

export function packageCounts(option) {
  return PACKAGE_COUNTS.filter(([key]) => option[key]).map(([key, label]) => ({
    label,
    count: option[key],
  }));
}
