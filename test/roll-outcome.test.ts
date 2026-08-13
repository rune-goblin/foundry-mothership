import { describe, it, expect } from 'vitest';
import { parseRollSpec } from '../module/rolls/parse.ts';
import { resolveOutcome, type EvaluatedRoll, type ResolveOptions } from '../module/rolls/resolve.ts';
import type { Aim } from '../module/rolls/spec.ts';

function frozenRoll(results: number[], faces: number, total = 0): EvaluatedRoll {
  return Object.freeze({
    total,
    dice: Object.freeze(
      results.map((result) => Object.freeze({ faces, results: Object.freeze([Object.freeze({ result })]) })),
    ),
  });
}

function options(rollString: string, aim: Aim, extra: Partial<ResolveOptions> = {}): ResolveOptions {
  return {
    spec: parseRollSpec(rollString, aim),
    kind: 'stat',
    target: null,
    comparison: '<',
    crits: false,
    zeroBased: false,
    ...extra,
  };
}

describe('resolveOutcome — the record, not the roll', () => {
  // The evaluated Roll is Foundry's, and it is what gets persisted to the chat message: the
  // translation to a zero-based face belongs to the outcome, not to the dice (audit F19).
  it('never writes to the roll it reads', () => {
    const roll = frozenRoll([100], 100);
    const outcome = resolveOutcome(roll, options('1d100', 'low', { zeroBased: true }));

    expect(outcome.total).toBe(0);
    expect(roll.dice[0].results[0].result).toBe(100);
    expect(roll.total).toBe(0);
  });

  it('reports every die with its own verdict, for the card to render', () => {
    const outcome = resolveOutcome(
      frozenRoll([33, 70], 100),
      options('1d100 [+]', 'low', { target: 50, comparison: '<', crits: true }),
    );

    expect(outcome.dice).toEqual([
      { result: 33, faces: 100, success: true, critical: true },
      { result: 70, faces: 100, success: false, critical: false },
    ]);
  });

  it('names which die was kept', () => {
    const outcome = resolveOutcome(
      frozenRoll([30, 70], 100),
      options('1d100 [-]', 'low', { target: 50, comparison: '<', crits: true }),
    );

    expect(outcome.keptIndex).toBe(1);
    expect(outcome.kept).toBe(70);
    expect(outcome.total).toBe(70);
  });

  it('separates the auto-failure from an ordinary miss', () => {
    const missed = resolveOutcome(frozenRoll([80], 100), options('1d100', 'low', { target: 50 }));
    const autoFailed = resolveOutcome(frozenRoll([95], 100), options('1d100', 'low', { target: 99 }));

    expect(missed).toMatchObject({ success: false, autoFailed: false });
    expect(autoFailed).toMatchObject({ success: false, autoFailed: true });
  });

  it('judges nothing without a target', () => {
    const outcome = resolveOutcome(frozenRoll([95], 100), options('1d100', 'low'));

    expect(outcome).toMatchObject({ total: 95, success: false, autoFailed: false, target: null });
    expect(outcome.dice[0].success).toBe(false);
  });

  it('reports the formula total when the formula rolls no dice', () => {
    const outcome = resolveOutcome(Object.freeze({ total: 7, dice: [] }), options('Str/10', 'high'));

    expect(outcome).toMatchObject({ kept: 7, keptIndex: -1, total: 7, dice: [] });
  });

  it('negates a zero to zero, not to minus zero', () => {
    const outcome = resolveOutcome(frozenRoll([10], 10), options('-1d10', 'low', { zeroBased: true }));

    expect(Object.is(outcome.total, 0)).toBe(true);
  });

  it('keeps the pool die under advantage even when the roll carries no target', () => {
    const outcome = resolveOutcome(frozenRoll([4, 9], 10), options('1d10 [+]', 'low'));

    expect(outcome.total).toBe(4);
  });
});
