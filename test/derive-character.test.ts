import { describe, it, expect } from 'vitest';

import { MothershipActor } from '../module/documents/actor.ts';

type Item = { type: string; name?: string; system: Record<string, unknown> };

const armour = (armorPoints: number, damageReduction = 0, equipped = true): Item =>
  ({ type: 'armor', system: { armorPoints, damageReduction, equipped } });

const condition = (name: string, severity: number): Item =>
  ({ type: 'condition', name, system: { severity } });

// What _deriveCharacter leaves behind: mod/total/damageReduction, netHP's two numbers and the
// whole weight block are written by the method.
type DerivedSystem = {
  stats: { armor: { value: number; mod: number; total: number; damageReduction: number } };
  health: { value: number; max: number };
  hits: { value: number; max: number };
  bleeding: { value: number };
  netHP: { value: number; min: number; max: number; label: string };
  weight: { current: number; capacity: number };
};

/**
 * The answers legacy's `_deriveCharacter` gave, kept verbatim through the swap that deleted it:
 * R0 ran every case below against both implementations.
 */
const derive = (actor: { items: Item[]; system: DerivedSystem }): void =>
  MothershipActor.prototype._deriveCharacter.call(actor as unknown as MothershipActor);

function fixture(opts: {
  items?: Item[];
  armorValue?: number;
  strength?: number;
  health?: { value: number; max: number };
  hits?: { value: number; max: number };
}): DerivedSystem {
  return {
    stats: {
      armor: { value: opts.armorValue ?? 0 },
      ...(opts.strength === undefined ? {} : { strength: { value: opts.strength } }),
    },
    health: opts.health ?? { value: 10, max: 10 },
    hits: opts.hits ?? { value: 0, max: 2 },
    bleeding: { value: 0 },
    // The schema declares netHP (`actor-models.js`'s baseSchema), so the new derivation stops
    // defending against its absence — the `??=` guards were pre-DataModel fossils (audit F25).
    netHP: { value: 0, min: 0, max: 0, label: 'Net HP' },
  } as unknown as DerivedSystem;
}

describe('_deriveCharacter', () => {
  const run = (opts: Parameters<typeof fixture>[0]): DerivedSystem => {
    const system = fixture(opts);
    derive({ items: opts.items ?? [], system });
    return system;
  };

  describe('armour', () => {
    it('sums the armour points of equipped armour', () => {
      expect(run({ items: [armour(3), armour(2)] }).stats.armor.mod).toBe(5);
    });

    it('ignores armour that is not equipped', () => {
      expect(run({ items: [armour(3), armour(99, 0, false)] }).stats.armor.mod).toBe(3);
    });

    it('adds the actor’s own armour value on top of worn armour', () => {
      expect(run({ items: [armour(3)], armorValue: 4 }).stats.armor.total).toBe(7);
    });

    it('sums damage reduction separately from armour points', () => {
      expect(run({ items: [armour(3, 1), armour(2, 2)] }).stats.armor.damageReduction).toBe(3);
    });

    it('is zero with no armour at all', () => {
      const s = run({});
      expect(s.stats.armor.mod).toBe(0);
      expect(s.stats.armor.damageReduction).toBe(0);
    });
  });

  // Net HP flattens wounds and health into one pool: each wound still available is worth a
  // full health bar, plus whatever is left in the current one.
  describe('net HP', () => {
    it('is a full pool at full health with no wounds taken', () => {
      const s = run({ health: { value: 10, max: 10 }, hits: { value: 0, max: 2 } });
      expect(s.netHP.value).toBe(20);
      expect(s.netHP.max).toBe(20);
    });

    it('drops by a whole health bar per wound taken', () => {
      expect(run({ health: { value: 10, max: 10 }, hits: { value: 1, max: 2 } }).netHP.value).toBe(10);
    });

    it('tracks partial damage within the current health bar', () => {
      expect(run({ health: { value: 4, max: 10 }, hits: { value: 0, max: 2 } }).netHP.value).toBe(14);
    });

    it('goes negative once every wound is spent', () => {
      expect(run({ health: { value: 0, max: 10 }, hits: { value: 2, max: 2 } }).netHP.value).toBe(-10);
    });

    it('scales max with both health and wound capacity', () => {
      expect(run({ health: { value: 5, max: 5 }, hits: { value: 0, max: 4 } }).netHP.max).toBe(20);
    });

    it('overwrites whatever was stored', () => {
      const system = fixture({ health: { value: 10, max: 10 }, hits: { value: 0, max: 2 } });
      system.netHP.value = 999;
      derive({ items: [], system });
      expect(system.netHP.value).toBe(20);
    });
  });

  describe('bleeding', () => {
    it('is zero with no bleeding condition', () => {
      expect(run({ items: [condition('Frightened', 3)] }).bleeding.value).toBe(0);
    });

    it('takes the severity of the bleeding condition', () => {
      expect(run({ items: [condition('Bleeding', 2)] }).bleeding.value).toBe(2);
    });

    it('stacks multiple bleeding conditions', () => {
      expect(run({ items: [condition('Bleeding', 2), condition('Bleeding', 3)] }).bleeding.value).toBe(5);
    });

    it('matches the condition by exact name', () => {
      expect(run({ items: [condition('bleeding', 4)] }).bleeding.value).toBe(0);
    });
  });

  // The sheet used to compute these during render and write them onto the document. They are
  // derived now, so the numbers are the same whether or not anyone has the sheet open.
  describe('carried weight', () => {
    const gear = (weight: number, quantity: number): Item =>
      ({ type: 'item', system: { weight, quantity } });

    it('multiplies gear weight by its quantity', () => {
      expect(run({ items: [gear(2, 3)] }).weight.current).toBe(6);
    });

    it('counts armour and weapons once, whatever their quantity field says', () => {
      const items: Item[] = [
        { type: 'armor', system: { weight: 4, quantity: 9 } },
        { type: 'weapon', system: { weight: 3, quantity: 9 } },
      ];
      expect(run({ items }).weight.current).toBe(7);
    });

    it('ignores skills and conditions', () => {
      const items: Item[] = [
        { type: 'skill', system: { weight: 5 } },
        { type: 'condition', name: 'Frightened', system: { severity: 1, weight: 5 } },
      ];
      expect(run({ items }).weight.current).toBe(0);
    });

    it('is zero with nothing carried', () => {
      expect(run({}).weight.current).toBe(0);
    });

    it('rounds capacity up from a tenth of strength', () => {
      expect(run({ strength: 45 }).weight.capacity).toBe(5);
      expect(run({ strength: 40 }).weight.capacity).toBe(4);
    });
  });
});
