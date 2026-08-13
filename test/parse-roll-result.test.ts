import { describe, it, expect, beforeEach } from 'vitest';
import { parseRollSpec } from '../module/rolls/parse.ts';
import { resolveOutcome } from '../module/rolls/resolve.ts';
import type { Aim, CheckKind, Comparison } from '../module/rolls/spec.ts';

beforeEach(() => {
  (globalThis as Record<string, unknown>).game = {
    settings: { get: () => false },
  };
});

// Foundry's Roll exposes `total` as a getter over `_total`, and parseRollResult writes the
// one and reads the other — so the stub has to keep that relationship. Entries in `dice`
// are DiceTerms, which carry their own formula/total/results; the chat HTML reads all three.
function roll(dice: number[], formula: string, faces: number) {
  return {
    formula,
    dice: dice.map((result) => ({
      formula: `1d${faces}`,
      faces,
      total: result,
      results: [{ result }],
    })),
    _total: 0,
    get total() { return this._total; },
    critical: false,
    success: false,
  };
}

interface Case {
  rollString: string;
  dice: number[];
  formula?: string;
  zeroBased?: boolean;
  checkCrit?: boolean;
  rollTarget?: number | null;
  comparison?: string;
  specialRoll?: string | null;
}

interface Judgement {
  total: number;
  success: boolean;
  critical: boolean;
}

const facesOf = (rollString: string) =>
  rollString.includes('d10') && !rollString.includes('d100') ? 10 : 100;

// The keep the formula asks for, read back against the modifier, is what says which way the
// check was aiming: [+] with kl is a roll-under check, [+] with kh a roll-over one.
function aimOf(o: Case): Aim {
  const formula = o.formula ?? o.rollString;
  if (formula.endsWith('kl')) return o.rollString.includes('[+]') ? 'low' : 'high';
  if (formula.endsWith('kh')) return o.rollString.includes('[+]') ? 'high' : 'low';
  return (o.comparison ?? '<').startsWith('>') ? 'high' : 'low';
}

// These cases are legacy's `parseRollResult` contract, kept verbatim through the swap that deleted
// it: R0 ran them against both implementations, and they now hold `rolls/resolve.ts` to the
// verdicts the shipped system has always reached.
const resolve = (o: Case): Judgement =>
  resolveOutcome(roll(o.dice, o.formula ?? o.rollString, facesOf(o.rollString)), {
    spec: parseRollSpec(o.rollString, aimOf(o)),
    kind: o.specialRoll === 'panicCheck' ? ('panic' satisfies CheckKind) : 'stat',
    target: o.rollTarget ?? null,
    comparison: (o.comparison ?? '<') as Comparison,
    crits: o.checkCrit ?? false,
    zeroBased: o.zeroBased ?? false,
  });

describe('resolveOutcome — how a roll is judged', () => {
  describe('single die', () => {
    it('takes the total from the only die', () => {
      expect(resolve({ rollString: '1d100', dice: [45] }).total).toBe(45);
    });

    it('negates the total for a negative roll', () => {
      expect(resolve({ rollString: '-1d100', dice: [30] }).total).toBe(-30);
    });
  });

  // Mothership's d100 and d10 are zero-based: the maximum face reads as zero.
  describe('zero-based dice', () => {
    it('reads 100 on a d100 as zero', () => {
      expect(resolve({ rollString: '1d100', dice: [100], zeroBased: true }).total).toBe(0);
    });

    it('reads 10 on a d10 as zero', () => {
      expect(resolve({ rollString: '1d10', dice: [10], zeroBased: true }).total).toBe(0);
    });

    it('leaves the roll alone when zeroBased is off', () => {
      expect(resolve({ rollString: '1d100', dice: [100] }).total).toBe(100);
    });
  });

  describe('success', () => {
    it('succeeds under the target on a < check', () => {
      expect(resolve({ rollString: '1d100', dice: [30], rollTarget: 50, comparison: '<' }).success).toBe(true);
    });

    it('fails on the target itself with <', () => {
      expect(resolve({ rollString: '1d100', dice: [50], rollTarget: 50, comparison: '<' }).success).toBe(false);
    });

    it('succeeds on the target itself with <=', () => {
      expect(resolve({ rollString: '1d100', dice: [50], rollTarget: 50, comparison: '<=' }).success).toBe(true);
    });

    it('honours > and >=', () => {
      expect(resolve({ rollString: '1d100', dice: [60], rollTarget: 50, comparison: '>' }).success).toBe(true);
      expect(resolve({ rollString: '1d100', dice: [50], rollTarget: 50, comparison: '>' }).success).toBe(false);
      expect(resolve({ rollString: '1d100', dice: [50], rollTarget: 50, comparison: '>=' }).success).toBe(true);
    });

    it('resolves a target of zero rather than treating it as absent', () => {
      const r = resolve({ rollString: '1d100', dice: [5], rollTarget: 0, comparison: '<' });
      expect(r.success).toBe(false);
    });

    // 90+ always fails, however high the skill.
    it('auto-fails at 90 or above even against a higher target', () => {
      expect(resolve({ rollString: '1d100', dice: [90], rollTarget: 99, comparison: '<' }).success).toBe(false);
      expect(resolve({ rollString: '1d100', dice: [95], rollTarget: 99, comparison: '<' }).success).toBe(false);
    });

    it('still succeeds at 89 against the same target', () => {
      expect(resolve({ rollString: '1d100', dice: [89], rollTarget: 99, comparison: '<' }).success).toBe(true);
    });
  });

  // Criticals are doubles: 00, 11, 22 ... 99.
  describe('criticals', () => {
    it('flags a double as critical', () => {
      for (const d of [0, 11, 22, 33, 44, 55, 66, 77, 88, 99]) {
        expect(resolve({ rollString: '1d100', dice: [d], checkCrit: true }).critical).toBe(true);
      }
    });

    it('does not flag a non-double', () => {
      for (const d of [12, 45, 78]) {
        expect(resolve({ rollString: '1d100', dice: [d], checkCrit: true }).critical).toBe(false);
      }
    });

    it('does not flag anything when crit checking is off', () => {
      expect(resolve({ rollString: '1d100', dice: [33] }).critical).toBe(false);
    });
  });

  // Advantage on a roll-under check keeps the lowest die (parseRollString picks kl for
  // aimFor 'low'), but a critical outranks a merely lower number.
  describe('advantage [+]', () => {
    const adv = (dice: number[], extra = {}) =>
      resolve({ rollString: '1d100[+]', formula: '{1d100,1d100}kl', dice, rollTarget: 50, comparison: '<', checkCrit: true, ...extra });

    it('keeps the lower die when neither is critical', () => {
      expect(adv([30, 70]).total).toBe(30);
    });

    it('prefers a critical success over a lower ordinary success', () => {
      expect(adv([33, 20]).total).toBe(33);
      expect(adv([20, 33]).total).toBe(33);
    });

    it('avoids a critical when both dice failed', () => {
      expect(adv([88, 60]).total).toBe(60);
    });
  });

  describe('disadvantage [-]', () => {
    const dis = (dice: number[], extra = {}) =>
      resolve({ rollString: '1d100[-]', formula: '{1d100,1d100}kh', dice, rollTarget: 50, comparison: '<', checkCrit: true, ...extra });

    it('keeps the higher die when neither is critical', () => {
      expect(dis([30, 70]).total).toBe(70);
    });

    it('avoids a critical success, taking the plainer one', () => {
      expect(dis([33, 40]).total).toBe(40);
    });

    it('prefers a critical failure when both dice failed', () => {
      expect(dis([88, 60]).total).toBe(88);
    });
  });

  // The blocks above cover roll-under checks, where parseRollString pairs [+] with kl. Rolling
  // over (damage) pairs [+] with kh and [-] with kl, which is a separate arm of the same
  // logic — a mutation to it survived the roll-under specs entirely.
  describe('advantage [+] on a roll-over check', () => {
    const adv = (dice: number[]) =>
      resolve({ rollString: '1d100[+]', formula: '{1d100,1d100}kh', dice, rollTarget: 50, comparison: '>', checkCrit: true });

    it('keeps the higher die when neither is critical', () => {
      expect(adv([30, 70]).total).toBe(70);
    });

    it('prefers a critical success over a higher ordinary success', () => {
      expect(adv([55, 70]).total).toBe(55);
    });

    it('avoids a critical when both dice failed', () => {
      expect(adv([44, 20]).total).toBe(20);
    });
  });

  describe('disadvantage [-] on a roll-over check', () => {
    const dis = (dice: number[]) =>
      resolve({ rollString: '1d100[-]', formula: '{1d100,1d100}kl', dice, rollTarget: 50, comparison: '>', checkCrit: true });

    it('keeps the lower die when neither is critical', () => {
      expect(dis([30, 70]).total).toBe(30);
    });

    it('avoids a critical success, taking the plainer one', () => {
      expect(dis([55, 70]).total).toBe(70);
    });

    it('prefers a critical failure when both dice failed', () => {
      expect(dis([44, 20]).total).toBe(44);
    });
  });

  // A panic check ignores the crit preferences -- it just takes the worst
  // (advantage) or best (disadvantage) of two failures.
  describe('panic check', () => {
    it('takes the best of two failures under advantage', () => {
      const r = resolve({
        rollString: '1d100[+]', formula: '{1d100,1d100}kl', dice: [88, 60],
        rollTarget: 50, comparison: '<', checkCrit: true, specialRoll: 'panicCheck',
      });
      expect(r.total).toBe(60);
    });

    it('takes the worst of two failures under disadvantage', () => {
      const r = resolve({
        rollString: '1d100[-]', formula: '{1d100,1d100}kh', dice: [88, 60],
        rollTarget: 50, comparison: '<', checkCrit: true, specialRoll: 'panicCheck',
      });
      expect(r.total).toBe(88);
    });

    // The two cases above agree with the ordinary crit preference by accident. These do not:
    // the critical die is also the one the pool would keep, so only ignoring the preference
    // gives this answer.
    it('keeps a critical failure the pool would have kept anyway, under advantage', () => {
      const r = resolve({
        rollString: '1d100[+]', formula: '{1d100,1d100}kl', dice: [88, 95],
        rollTarget: 50, comparison: '<', checkCrit: true, specialRoll: 'panicCheck',
      });
      expect(r.total).toBe(88);
    });

    it('discards a critical failure the pool would have discarded, under disadvantage', () => {
      const r = resolve({
        rollString: '1d100[-]', formula: '{1d100,1d100}kh', dice: [88, 95],
        rollTarget: 50, comparison: '<', checkCrit: true, specialRoll: 'panicCheck',
      });
      expect(r.total).toBe(95);
    });
  });
});
