export type Advantage = 'none' | 'advantage' | 'disadvantage';

/** Which way a check wants its result to go: stats and saves roll under, damage rolls over. */
export type Aim = 'low' | 'high';

export type Comparison = '<' | '<=' | '>' | '>=';

/** Foundry's pool suffix: keep highest, keep lowest. */
export type Keep = 'kh' | 'kl';

/**
 * One roll, lexed once. `dice` is the expression advantage duplicates — `1d100`, `2d10+1`,
 * `Str/10` — and `count`/`faces` are filled in only when that expression is a plain NdX, which
 * is what the zero-based and crit rules need to know.
 */
export interface RollSpec {
  readonly dice: string;
  readonly count: number | null;
  readonly faces: number | null;
  readonly sign: 1 | -1;
  readonly advantage: Advantage;
  readonly aim: Aim;
}

export type CheckKind =
  | 'stat'
  | 'skill'
  | 'weapon-attack'
  | 'weapon-damage'
  | 'rest-save'
  | 'panic'
  | 'table';

/** The stats and saves a check can target — the key space `system.stats` uses. */
export type StatKey =
  | 'strength'
  | 'speed'
  | 'intellect'
  | 'combat'
  | 'sanity'
  | 'fear'
  | 'body';

/** What is being rolled. Each kind carries its own arguments, so no parameter means two things. */
export type Check =
  | { readonly kind: 'stat'; readonly stat: StatKey }
  | { readonly kind: 'skill'; readonly stat: StatKey; readonly skillId: string; readonly bonus: number }
  | { readonly kind: 'weapon-attack'; readonly itemId: string }
  | { readonly kind: 'weapon-damage'; readonly itemId: string; readonly damage: string | null }
  | { readonly kind: 'rest-save' }
  | { readonly kind: 'panic' }
  | { readonly kind: 'table'; readonly tableId: string };

export interface CheckSemantics {
  readonly aim: Aim;
  readonly comparison: Comparison;
  /** Whether doubles count as criticals. */
  readonly crits: boolean;
  /** Whether the die reads its top face as zero. Damage dice do not: 10 damage is 10. */
  readonly zeroBased: boolean;
}

/** How each kind of check is judged. A table roll may override this with the table's own die. */
export const CHECK_SEMANTICS: Readonly<Record<CheckKind, CheckSemantics>> = {
  stat: { aim: 'low', comparison: '<', crits: true, zeroBased: true },
  skill: { aim: 'low', comparison: '<', crits: true, zeroBased: true },
  'weapon-attack': { aim: 'low', comparison: '<', crits: true, zeroBased: true },
  'weapon-damage': { aim: 'high', comparison: '>', crits: false, zeroBased: false },
  'rest-save': { aim: 'low', comparison: '<', crits: false, zeroBased: true },
  panic: { aim: 'high', comparison: '>', crits: false, zeroBased: false },
  table: { aim: 'low', comparison: '<', crits: false, zeroBased: true },
};

/**
 * Which die of the pair the formula keeps. Advantage keeps the die that helps, and what helps
 * depends on the direction of the check — so the same modifier inverts between rolling under
 * and rolling over.
 */
export function keepOf(spec: RollSpec): Keep | null {
  if (spec.advantage === 'none') return null;
  const helpful = spec.aim === 'low' ? 'kl' : 'kh';
  return spec.advantage === 'advantage' ? helpful : helpful === 'kl' ? 'kh' : 'kl';
}
