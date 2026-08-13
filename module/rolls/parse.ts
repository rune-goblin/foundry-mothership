import { keepOf, type Advantage, type Aim, type RollSpec } from './spec.ts';

const MODIFIER = /\[([+-])\]/;
const PLAIN_DIE = /^-?(\d*)d(\d+)$/i;

/**
 * Lex the roll mini-language — `1d100`, `1d10 [+]`, `-1d10`, `[-]` — into the record the rest of
 * the pipeline reads. `fallbackDice` supplies the die when the string carries only a modifier,
 * which is how the Panic Check is asked for: the table names the die, the caller names the odds.
 */
export function parseRollSpec(rollString: string, aim: Aim, fallbackDice = ''): RollSpec {
  const text = String(rollString ?? '').trim();
  const modifier = MODIFIER.exec(text);
  const advantage: Advantage =
    modifier === null ? 'none' : modifier[1] === '+' ? 'advantage' : 'disadvantage';

  const bracket = text.indexOf('[');
  const dice = (bracket === -1 ? text : text.slice(0, bracket)).trim() || fallbackDice.trim();
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

export function rollFormula(rollString: string, aim: Aim, fallbackDice = ''): string {
  return toFormula(parseRollSpec(rollString, aim, fallbackDice));
}

/**
 * A formula wearing a Dice So Nice colorset. Foundry reads the suffix as flavour on the term and
 * the module reads that flavour as the name of a dice theme, which is how the two shipped theme
 * settings reach the table.
 */
export function themed(formula: string, colorset: string): string {
  return colorset.trim() === '' ? formula : `${formula}[${colorset.trim()}]`;
}
