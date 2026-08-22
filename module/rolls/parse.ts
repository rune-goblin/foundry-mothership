import { keepOf, type Advantage, type Aim, type RollSpec } from './spec.ts';

const MODIFIER = /\[([+-])\]/;
const PLAIN_DIE = /^-?(\d*)d(\d+)$/i;
const POOL = /^\{([^,{}]+),([^,{}]+)\}(kh|kl)$/i;

/**
 * `{X,X}kh` is what `toFormula` builds `[+]` into, so a formula that arrives already built — a crit
 * rule's, a macro's — reads back as the modifier it is. Which modifier depends on the aim, the way
 * `keepOf` does, so the spec rebuilds the same pool. Two different branches are somebody's own pool
 * and stay whole: rolling them as `{first,first}` would throw the other one away.
 */
function pooled(text: string, aim: Aim): Pick<RollSpec, 'dice' | 'advantage'> | null {
  const match = POOL.exec(text);
  if (match === null) return null;

  const [, first, second, keep] = match;
  if (first.trim() !== second.trim()) return null;

  const helpful = aim === 'low' ? 'kl' : 'kh';
  return {
    dice: first.trim(),
    advantage: keep.toLowerCase() === helpful ? 'advantage' : 'disadvantage',
  };
}

/**
 * Lexes the roll mini-language — `1d100`, `1d10 [+]`, `-1d10`, `[-]`. `fallbackDice` supplies the
 * die when the string carries only a modifier, as with the Panic Check: the table names the die.
 */
export function parseRollSpec(rollString: string, aim: Aim, fallbackDice = ''): RollSpec {
  const text = String(rollString ?? '').trim();
  const pool = pooled(text, aim);
  const modifier = MODIFIER.exec(text);
  const advantage: Advantage =
    pool !== null
      ? pool.advantage
      : modifier === null
        ? 'none'
        : modifier[1] === '+'
          ? 'advantage'
          : 'disadvantage';

  const bracket = text.indexOf('[');
  const dice =
    pool !== null ? pool.dice : (bracket === -1 ? text : text.slice(0, bracket)).trim() || fallbackDice.trim();
  const plain = PLAIN_DIE.exec(dice);

  return {
    dice,
    count: plain === null ? null : Number(plain[1] || 1),
    faces: plain === null ? null : Number(plain[2]),
    sign: dice.startsWith('-') ? -1 : 1,
    advantage,
    aim,
  };
}

/** The spec as Foundry rolls it: a pool of two kept one way, or the dice expression alone. */
export function toFormula(spec: RollSpec): string {
  const keep = keepOf(spec);
  return keep === null ? spec.dice : `{${spec.dice},${spec.dice}}${keep}`;
}

/** The spec back in the mini-language, for the dialogs and macros that pass roll strings around. */
export function toRollString(spec: RollSpec): string {
  if (spec.advantage === 'none') return spec.dice;
  return `${spec.dice} ${spec.advantage === 'advantage' ? '[+]' : '[-]'}`;
}

/** A damage formula in the mini-language's own words: the pool a crit rule built prints as `[+]`. */
export function damageString(formula: string): string {
  return toRollString(parseRollSpec(formula, 'high'));
}

export function rollFormula(rollString: string, aim: Aim, fallbackDice = ''): string {
  return toFormula(parseRollSpec(rollString, aim, fallbackDice));
}

/**
 * A formula wearing a Dice So Nice colorset — Foundry reads the bracket suffix as flavour on the
 * term, and Dice So Nice reads that flavour as the theme name.
 */
export function themed(formula: string, colorset: string): string {
  return colorset.trim() === '' ? formula : `${formula}[${colorset.trim()}]`;
}
