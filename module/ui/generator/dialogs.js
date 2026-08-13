import { svelteDialog } from '../../dialogs/svelte-dialog.ts';
import { localize } from '../../i18n.ts';
import { statLabel } from '../class/choosable-stats.js';
import BonusOption from './BonusOption.svelte';
import SkillPicker from './SkillPicker.svelte';
import StatChoice from './StatChoice.svelte';
import { candidates } from './skills.js';

/**
 * The generator's three sub-dialogs. Each resolves a value and touches nothing else — the AppV1
 * versions rendered Handlebars templates and then wrote their result straight back into the parent
 * window's DOM through `this._element`, which is what made the form the source of truth. Each is a
 * Svelte component in `DialogV2.wait` now (audit U10), so the markup is compiled rather than
 * concatenated and the escaping is the compiler's.
 */

// The rank a pick draws from, in the order the dialog stacks its dropdowns. A *_full_set pick is
// one skill plus the prerequisite chain beneath it, so it offers every rank at once and gates
// none of them; a bare Expert or Master pick is gated on already owning a prerequisite.
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

const DESCRIPTION = {
  master_full_set: 'Mosh.CharacterGenerator.SkillOption.PopupFullMasterDescription',
  expert_full_set: 'Mosh.CharacterGenerator.SkillOption.PopupFullExpertDescription',
  trained: 'Mosh.CharacterGenerator.SkillOption.PopupTrainedDescription',
  expert: 'Mosh.CharacterGenerator.SkillOption.PopupExpertDescription',
  master: 'Mosh.CharacterGenerator.SkillOption.PopupMasterDescription',
};

const RANK_LABEL = {
  Trained: 'Mosh.SkillRankTrained',
  Expert: 'Mosh.SkillRankExpert',
  Master: 'Mosh.SkillRankMaster',
};

/**
 * One skill pick. Resolves the chosen UUIDs — up to three for a master full set, none if the
 * dialog is closed or every dropdown is left on `---`.
 */
export async function pickSkills(kind, catalog, owned) {
  const lists = SETS[kind].map(({ rank, gated }) => ({
    rank,
    label: localize(RANK_LABEL[rank]),
    options: candidates(catalog, rank, owned, { requirePrerequisite: gated }),
  }));

  const picked = await svelteDialog({
    component: SkillPicker,
    props: { description: localize(DESCRIPTION[kind]), lists },
    title: localize('Mosh.CharacterGenerator.SkillOption.PopupTitle'),
    initial: {},
    buttons: [
      {
        action: 'save',
        label: localize('Mosh.Save'),
        icon: 'fas fa-check',
        default: true,
        // Rank order, broadest first: the order a class hands its picks out in.
        answer: (picked) => lists.map(({ rank }) => picked[rank]).filter(Boolean),
      },
    ],
  });

  return picked ?? [];
}

/** The counts a bonus package hands out, in the order the dialog lists them. */
const PACKAGE_COUNTS = [
  ['master', 'Mosh.SkillRankMaster'],
  ['expert', 'Mosh.SkillRankExpert'],
  ['trained', 'Mosh.SkillRankTrained'],
  ['master_full_set', 'Mosh.CharacterGenerator.SkillOption.PopupFullMasterName'],
  ['expert_full_set', 'Mosh.CharacterGenerator.SkillOption.PopupFullExpertName'],
];

/**
 * The `choose_skill_or` branch: the class offers several bonus-skill packages and the player takes
 * one. Resolves the chosen option, or null if the dialog is closed.
 */
export async function pickBonusOption(options) {
  const described = options.map((option) => ({
    name: option.name,
    counts: PACKAGE_COUNTS.filter(([key]) => option[key]).map(
      ([key, label]) => `${localize(label)}: ${option[key]}`,
    ),
    fromList: option.fromListNames.join(', '),
  }));

  return await svelteDialog({
    component: BonusOption,
    props: { text: localize('Mosh.CharacterGenerator.SkillOption.ChoiceText'), options: described },
    title: localize('Mosh.CharacterGenerator.SkillOption.PopupTitle'),
    initial: null,
    width: 500,
    buttons: options.map((option, index) => ({
      action: `option-${index}`,
      label: option.name,
      icon: 'fas fa-check',
      answer: () => option,
    })),
  });
}

/**
 * One `choose_stat` entry: the class grants a modification the player spends on one of a set of
 * stats or saves. Resolves the chosen key, or null if the dialog is closed.
 */
export async function pickStat(entry) {
  const question = `${localize('Mosh.CharacterGenerator.StatOptionPopupText')} (${entry.modification})`;

  return await svelteDialog({
    component: StatChoice,
    props: { text: question },
    title: localize('Mosh.CharacterGenerator.StatOptionPopupTitle'),
    initial: null,
    buttons: entry.stats.map((stat) => ({
      action: stat,
      label: localize(statLabel(stat) ?? stat),
      icon: 'fas fa-check',
      answer: () => stat,
    })),
  });
}
