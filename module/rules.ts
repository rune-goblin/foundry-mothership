/** A d100 or d10 reading its top face as zero: 100 is 00, 10 is 0. */
export const ZERO_BASED_FACES: ReadonlySet<number> = new Set([10, 100]);

/** Doubles are criticals — 00, 11, 22 … 99. */
export const CRIT_DOUBLES: ReadonlySet<number> = new Set([0, 11, 22, 33, 44, 55, 66, 77, 88, 99]);

/** A check of 90 or more fails however high the target. */
export const AUTOFAIL_AT = 90;

/** PSG 21.1 — roll the Panic Die and try to roll above your current Stress. */
export const PANIC_DIE = '1d20';

/** The Panic result whose text differs for androids: Heart Attack, or Short Circuit. */
export const ANDROID_PANIC_RESULT = 19;

/** PSG 29.1 — every Wound table. */
export const WOUND_DIE = '1d10';

/** PSG 29.2 — the Death table. */
export const DEATH_DIE = '1d10';

/** Health reduced to zero costs this many Wounds; the surplus damage carries into the refilled bar. */
export const WOUND_ROLLOVER = 1;

/** The XP track's length. The clamp and the pip count are the same number (audit U14). */
export const XP_PIPS = 15;

export type SkillRank = 'trained' | 'expert' | 'master';

/** PSG 22 — what a skill of each rank adds to the check. Skill items store the rank capitalized. */
export const RANK_BONUS: Readonly<Record<SkillRank, number>> = {
  trained: 10,
  expert: 15,
  master: 20,
};

/**
 * The one place a stored rank becomes a rank. `item-models.js` initializes `rank` to `'Trained'`
 * and the new-skill dialog writes the same capitalized words, so every reader would otherwise
 * carry its own case convention — which is how `ui/actor/items.js` came to hold a second bonus
 * table. An unrecognized rank is an error, never a silent zero.
 */
export function skillRank(stored: string): SkillRank {
  const key = String(stored ?? '').trim().toLowerCase();
  if (!Object.hasOwn(RANK_BONUS, key)) throw new Error(`Unknown skill rank: ${JSON.stringify(stored)}`);
  return key as SkillRank;
}

export function rankBonus(stored: string): number {
  return RANK_BONUS[skillRank(stored)];
}

/** Carry capacity is Strength over this, rounded up; unarmed damage is the same quotient rounded down. */
export const STR_CAPACITY_DIVISOR = 10;
