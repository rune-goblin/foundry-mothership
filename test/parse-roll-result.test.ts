import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../module/mosh.js', () => ({ fromIdUuid: () => undefined }));

const { MothershipActor } = await import('../module/actor/actor.js');

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

function resolve(o: {
  rollString: string;
  dice: number[];
  formula?: string;
  zeroBased?: boolean;
  checkCrit?: boolean;
  rollTarget?: number | null;
  comparison?: string;
  specialRoll?: string | null;
}) {
  return MothershipActor.prototype.parseRollResult.call(
    {},
    o.rollString,
    roll(o.dice, o.formula ?? o.rollString, o.rollString.includes('d10') && !o.rollString.includes('d100') ? 10 : 100),
    o.zeroBased ?? false,
    o.checkCrit ?? false,
    o.rollTarget ?? null,
    o.comparison ?? '<',
    o.specialRoll ?? null,
  );
}

describe('parseRollResult — single die', () => {
  it('takes the total from the only die', () => {
    expect(resolve({ rollString: '1d100', dice: [45] }).total).toBe(45);
  });

  it('negates the total for a negative roll', () => {
    expect(resolve({ rollString: '-1d100', dice: [30] }).total).toBe(-30);
  });
});

// Mothership's d100 and d10 are zero-based: the maximum face reads as zero.
describe('parseRollResult — zero-based dice', () => {
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

describe('parseRollResult — success', () => {
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
describe('parseRollResult — criticals', () => {
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
describe('parseRollResult — advantage [+]', () => {
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

describe('parseRollResult — disadvantage [-]', () => {
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
describe('parseRollResult — advantage [+] on a roll-over check', () => {
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

describe('parseRollResult — disadvantage [-] on a roll-over check', () => {
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
describe('parseRollResult — panic check', () => {
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

});
