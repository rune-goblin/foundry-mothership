import { localize } from '../../i18n.ts';
import { SKILL_RANKS, storedRank } from '../../rules.ts';

/**
 * The three ranks as a picker's options, weakest first. Skill items store the rank capitalized and
 * `Mothership.SkillRank<Rank>` names it the same way, so the stored word is also the key's suffix.
 */
export const rankChoices = () =>
  SKILL_RANKS.map((rank) => ({
    value: storedRank(rank),
    label: localize(`Mothership.SkillRank${storedRank(rank)}`),
  }));
