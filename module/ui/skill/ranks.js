import { localize } from '../../i18n.ts';
import { SKILL_RANKS, storedRank } from '../../rules.ts';

/**
 * Picker options, weakest first. Skill items store the rank capitalized, matching the
 * `Mothership.SkillRank<Rank>` lang key suffix.
 */
export const rankChoices = () =>
  SKILL_RANKS.map((rank) => ({
    value: storedRank(rank),
    label: localize(`Mothership.SkillRank${storedRank(rank)}`),
  }));
