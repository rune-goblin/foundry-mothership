import type { PostableRoll } from '../chat/cards.ts';
import { themed, toFormula } from '../rolls/parse.ts';
import { resolveOutcome, type EvaluatedRoll, type Outcome } from '../rolls/resolve.ts';
import { CHECK_SEMANTICS, type CheckKind, type RollSpec } from '../rolls/spec.ts';

declare const Roll: new (formula: string) => { evaluate(): Promise<EvaluatedRoll & PostableRoll> };

export interface Rolled {
  readonly roll: EvaluatedRoll & PostableRoll;
  readonly outcome: Outcome;
}

export interface RollRequest {
  readonly spec: RollSpec;
  readonly kind: CheckKind;
  /** What the roll must beat, when it must beat anything. */
  readonly target?: number | null;
  /** A Dice So Nice colorset for these dice. */
  readonly colorset?: string;
}

export async function evaluateRoll(request: RollRequest): Promise<Rolled> {
  const semantics = CHECK_SEMANTICS[request.kind];
  const roll = await new Roll(themed(toFormula(request.spec), request.colorset ?? '')).evaluate();

  return {
    roll,
    outcome: resolveOutcome(roll, {
      spec: request.spec,
      kind: request.kind,
      target: request.target ?? null,
      comparison: semantics.comparison,
      crits: semantics.crits,
      zeroBased: semantics.zeroBased,
      autoFail: semantics.autoFail,
    }),
  };
}
