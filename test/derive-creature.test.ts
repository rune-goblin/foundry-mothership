import { describe, it, expect } from 'vitest';

import { MothershipActor } from '../module/documents/actor.ts';

/**
 * The creature derivation had no unit test at all (audit T8), though it carries the one derived
 * number with real consequences at the table: a swarm's Combat, scaled by the Wounds it has left.
 * The armour, net HP and Bleeding blocks below are the same three the character derives — they
 * were verbatim copies in legacy (F25) and are shared functions now, so they are asserted here
 * too: the sharing is the change.
 */

type Item = { type: string; name?: string; system: Record<string, unknown> };

const armour = (armorPoints: number, damageReduction = 0, equipped = true): Item =>
  ({ type: 'armor', system: { armorPoints, damageReduction, equipped } });

type CreatureSystem = {
  stats: {
    combat: { value: number };
    armor: { value: number; mod: number; total: number; damageReduction: number };
  };
  health: { value: number; max: number };
  hits: { value: number; max: number };
  bleeding: { value: number };
  netHP: { value: number; min: number; max: number; label: string };
  notes: string;
  swarm: { enabled: boolean; combat: { value: number } };
};

const derive = (actor: { items: Item[]; system: CreatureSystem }): void =>
  MothershipActor.prototype._deriveCreature.call(actor as unknown as MothershipActor);

function fixture(opts: {
  combat?: number;
  hits?: { value: number; max: number };
  health?: { value: number; max: number };
  swarm?: { enabled: boolean; combat: number };
}): CreatureSystem {
  return {
    stats: {
      combat: { value: opts.combat ?? 30 },
      armor: { value: 0 },
    },
    health: opts.health ?? { value: 8, max: 8 },
    hits: opts.hits ?? { value: 0, max: 2 },
    bleeding: { value: 0 },
    netHP: { value: 0, min: 0, max: 0, label: 'Net HP' },
    notes: '<p>Stored.</p>',
    ...(opts.swarm === undefined
      ? {}
      : { swarm: { enabled: opts.swarm.enabled, combat: { value: opts.swarm.combat } } }),
  } as unknown as CreatureSystem;
}

describe('_deriveCreature', () => {
  const run = (opts: Parameters<typeof fixture>[0], items: Item[] = []): CreatureSystem => {
    const system = fixture(opts);
    derive({ items, system });
    return system;
  };

  describe('the three blocks it shares with the character', () => {
    it('sums equipped armour and its damage reduction', () => {
      const s = run({}, [armour(3, 1), armour(2, 2), armour(99, 99, false)]);
      expect(s.stats.armor.mod).toBe(5);
      expect(s.stats.armor.total).toBe(5);
      expect(s.stats.armor.damageReduction).toBe(3);
    });

    it('flattens wounds and health into net HP', () => {
      const s = run({ health: { value: 4, max: 8 }, hits: { value: 1, max: 3 } });
      expect(s.netHP.value).toBe(12);
      expect(s.netHP.max).toBe(24);
    });

    it('totals the severity of every Bleeding condition', () => {
      const bleeding = (severity: number): Item =>
        ({ type: 'condition', name: 'Bleeding', system: { severity } });
      expect(run({}, [bleeding(2), bleeding(1)]).bleeding.value).toBe(3);
    });

    it('leaves stored notes alone', () => {
      expect(run({}).notes).toBe('<p>Stored.</p>');
    });
  });

  // The rule with teeth: a swarm hits as hard as it is numerous, so what is left of its Wounds
  // multiplies its Combat. A sign error here survives every other tier.
  describe('a swarm’s combat', () => {
    it('is the swarm value times the wounds still standing', () => {
      const s = run({ combat: 30, hits: { value: 0, max: 3 }, swarm: { enabled: true, combat: 10 } });
      expect(s.stats.combat.value).toBe(30);
    });

    it('falls by one multiple per wound taken', () => {
      const s = run({ combat: 30, hits: { value: 1, max: 3 }, swarm: { enabled: true, combat: 10 } });
      expect(s.stats.combat.value).toBe(20);
    });

    it('reaches zero when every wound is spent', () => {
      const s = run({ combat: 30, hits: { value: 3, max: 3 }, swarm: { enabled: true, combat: 10 } });
      expect(s.stats.combat.value).toBe(0);
    });

    // The multiplier reads the stashed swarm value, never the derived Combat — otherwise every
    // re-derivation would multiply the multiplied number again.
    it('is the same number however many times derivation runs', () => {
      const system = fixture({ combat: 30, hits: { value: 1, max: 3 }, swarm: { enabled: true, combat: 10 } });
      derive({ items: [], system });
      derive({ items: [], system });
      derive({ items: [], system });
      expect(system.stats.combat.value).toBe(20);
    });

    it('leaves combat alone while the swarm toggle is off', () => {
      const s = run({ combat: 30, hits: { value: 1, max: 3 }, swarm: { enabled: false, combat: 10 } });
      expect(s.stats.combat.value).toBe(30);
    });

    it('leaves combat alone on a creature that is not a swarm at all', () => {
      expect(run({ combat: 30, hits: { value: 1, max: 3 } }).stats.combat.value).toBe(30);
    });
  });
});
