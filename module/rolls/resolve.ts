import { AUTOFAIL_AT, CRIT_DOUBLES, ZERO_BASED_FACES } from '../rules.ts';
import { keepOf, type CheckKind, type Comparison, type RollSpec } from './spec.ts';

/** The part of an evaluated Foundry `Roll` this reads. Readonly throughout: nothing here writes. */
export interface EvaluatedDie {
  readonly faces: number;
  readonly results: readonly { readonly result: number }[];
}

export interface EvaluatedRoll {
  readonly total: number;
  readonly dice: readonly EvaluatedDie[];
}

export interface ResolveOptions {
  readonly spec: RollSpec;
  readonly kind: CheckKind;
  readonly target: number | null;
  readonly comparison: Comparison;
  readonly crits: boolean;
  readonly zeroBased: boolean;
  /** Whether a 90 or more auto-fails regardless of target — the book scopes this to the d100 only. Defaults to true. */
  readonly autoFail?: boolean;
}

export interface DieOutcome {
  /** The face as the game reads it, top face zeroed where the die is zero-based. */
  readonly result: number;
  readonly faces: number;
  readonly success: boolean;
  readonly critical: boolean;
}

export interface Outcome {
  /** The die that counts, before the roll's sign. */
  readonly kept: number;
  /** Which of `dice` was kept, or -1 when the formula rolled none. */
  readonly keptIndex: number;
  readonly total: number;
  /** Foundry's own arithmetic for the whole formula — what the modifiers behind the dice add up to. */
  readonly rollTotal: number;
  readonly dice: readonly DieOutcome[];
  readonly success: boolean;
  readonly critical: boolean;
  readonly autoFailed: boolean;
  readonly target: number | null;
}

function beats(value: number, comparison: Comparison, target: number): boolean {
  switch (comparison) {
    case '<':
      return value < target;
    case '<=':
      return value <= target;
    case '>':
      return value > target;
    case '>=':
      return value >= target;
  }
}

function faceValue(result: number, faces: number, zeroBased: boolean): number {
  const topFace = zeroBased && ZERO_BASED_FACES.has(faces) && Math.abs(result) === faces;
  return topFace ? 0 : result;
}

function extreme(dice: readonly DieOutcome[], keep: 'kh' | 'kl'): number {
  let index = 0;
  for (let i = 1; i < dice.length; i += 1) {
    const better = keep === 'kh' ? dice[i].result > dice[index].result : dice[i].result < dice[index].result;
    if (better) index = i;
  }
  return index;
}

/**
 * A critical outranks a merely better number, in the direction the modifier points — advantage
 * takes a critical success and ducks a critical failure, disadvantage the reverse. A Panic Check
 * ignores that preference and takes the pool's own answer.
 */
function pick(dice: readonly DieOutcome[], options: ResolveOptions): number {
  if (dice.length === 0) return -1;
  const keep = keepOf(options.spec);
  if (keep === null || dice.length < 2) return 0;

  // The crit preference is a rule about a pair; a wider pool gets the pool's own answer.
  const fromPool = extreme(dice, keep);
  if (dice.length > 2) return fromPool;

  const [first, second] = dice;
  const bothSucceeded = first.success && second.success;
  const bothFailed = !first.success && !second.success;
  if (first.critical === second.critical) return fromPool;
  if (!bothSucceeded && !bothFailed) return fromPool;
  if (options.kind === 'panic' && bothFailed) return fromPool;

  const critical = first.critical ? 0 : 1;
  const preferCritical = bothSucceeded
    ? options.spec.advantage === 'advantage'
    : options.spec.advantage === 'disadvantage';
  return preferCritical ? critical : 1 - critical;
}

/** The evaluated roll judged against the check, as a record. It writes nothing and renders nothing. */
export function resolveOutcome(roll: EvaluatedRoll, options: ResolveOptions): Outcome {
  const { target, comparison, crits } = options;
  const autoFail = options.autoFail ?? true;

  const dice: DieOutcome[] = roll.dice.map((die) => {
    const result = faceValue(die.results[0]?.result ?? 0, die.faces, options.zeroBased);
    return {
      result,
      faces: die.faces,
      success:
        target !== null && !(autoFail && result >= AUTOFAIL_AT) && beats(result, comparison, target),
      critical: crits && CRIT_DOUBLES.has(result),
    };
  });

  const keptIndex = pick(dice, options);
  const kept = keptIndex === -1 ? Number(roll.total) || 0 : dice[keptIndex].result;
  const total = kept === 0 ? 0 : kept * options.spec.sign;
  const autoFailed = autoFail && target !== null && total >= AUTOFAIL_AT;

  return {
    kept,
    keptIndex,
    total,
    rollTotal: Number(roll.total) || 0,
    dice,
    success: target !== null && !autoFailed && beats(total, comparison, target),
    critical: crits && CRIT_DOUBLES.has(total),
    autoFailed,
    target,
  };
}
