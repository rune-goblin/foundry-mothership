import { describe, it, expect, vi } from 'vitest';

vi.mock('../module/mosh.js', () => ({ fromIdUuid: () => undefined }));

const { MothershipActor } = await import('../module/actor/actor.js');

type Item = { type: string; name?: string; system: Record<string, unknown> };

const armour = (armorPoints: number, damageReduction = 0, equipped = true): Item =>
  ({ type: 'armor', system: { armorPoints, damageReduction, equipped } });

const condition = (name: string, severity: number): Item =>
  ({ type: 'condition', name, system: { severity } });

function derive(opts: {
  items?: Item[];
  armorValue?: number;
  health?: { value: number; max: number };
  hits?: { value: number; max: number };
}) {
  const actor = {
    items: opts.items ?? [],
    system: {
      stats: { armor: { value: opts.armorValue ?? 0 } },
      health: opts.health ?? { value: 10, max: 10 },
      hits: opts.hits ?? { value: 0, max: 2 },
      bleeding: { value: 0 },
    },
  };
  MothershipActor.prototype._deriveCharacter.call(actor);
  return actor.system;
}

describe('_deriveCharacter — armour', () => {
  it('sums the armour points of equipped armour', () => {
    const s = derive({ items: [armour(3), armour(2)] });
    expect(s.stats.armor.mod).toBe(5);
  });

  it('ignores armour that is not equipped', () => {
    const s = derive({ items: [armour(3), armour(99, 0, false)] });
    expect(s.stats.armor.mod).toBe(3);
  });

  it('adds the actor’s own armour value on top of worn armour', () => {
    const s = derive({ items: [armour(3)], armorValue: 4 });
    expect(s.stats.armor.total).toBe(7);
  });

  it('sums damage reduction separately from armour points', () => {
    const s = derive({ items: [armour(3, 1), armour(2, 2)] });
    expect(s.stats.armor.damageReduction).toBe(3);
  });

  it('is zero with no armour at all', () => {
    const s = derive({});
    expect(s.stats.armor.mod).toBe(0);
    expect(s.stats.armor.damageReduction).toBe(0);
  });
});

// Net HP flattens wounds and health into one pool: each wound still available is worth a
// full health bar, plus whatever is left in the current one.
describe('_deriveCharacter — net HP', () => {
  it('is a full pool at full health with no wounds taken', () => {
    const s = derive({ health: { value: 10, max: 10 }, hits: { value: 0, max: 2 } });
    expect(s.netHP.value).toBe(20);
    expect(s.netHP.max).toBe(20);
  });

  it('drops by a whole health bar per wound taken', () => {
    const s = derive({ health: { value: 10, max: 10 }, hits: { value: 1, max: 2 } });
    expect(s.netHP.value).toBe(10);
  });

  it('tracks partial damage within the current health bar', () => {
    const s = derive({ health: { value: 4, max: 10 }, hits: { value: 0, max: 2 } });
    expect(s.netHP.value).toBe(14);
  });

  it('goes negative once every wound is spent', () => {
    const s = derive({ health: { value: 0, max: 10 }, hits: { value: 2, max: 2 } });
    expect(s.netHP.value).toBe(-10);
  });

  it('scales max with both health and wound capacity', () => {
    const s = derive({ health: { value: 5, max: 5 }, hits: { value: 0, max: 4 } });
    expect(s.netHP.max).toBe(20);
  });
});

describe('_deriveCharacter — bleeding', () => {
  it('is zero with no bleeding condition', () => {
    expect(derive({ items: [condition('Frightened', 3)] }).bleeding.value).toBe(0);
  });

  it('takes the severity of the bleeding condition', () => {
    expect(derive({ items: [condition('Bleeding', 2)] }).bleeding.value).toBe(2);
  });

  it('stacks multiple bleeding conditions', () => {
    const s = derive({ items: [condition('Bleeding', 2), condition('Bleeding', 3)] });
    expect(s.bleeding.value).toBe(5);
  });

  it('matches the condition by exact name', () => {
    expect(derive({ items: [condition('bleeding', 4)] }).bleeding.value).toBe(0);
  });
});
