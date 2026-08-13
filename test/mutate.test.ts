import { describe, it, expect } from 'vitest';
import { AddressError } from '../module/mutation/address.ts';
import {
  changeAmount,
  mutate,
  planChange,
  planHealthChange,
  type Change,
  type Tracked,
} from '../module/mutation/mutate.ts';

const bounded = (value: number, min: number, max: number): Tracked => ({ value, bounds: { min, max } });
const unbounded = (value: number): Tracked => ({ value, bounds: { min: null, max: null } });

describe('planChange — the clamp', () => {
  it('applies the whole change when it fits', () => {
    expect(planChange(4, 3, { min: 2, max: 20 })).toEqual({
      from: 4, to: 7, applied: 3, overflow: 0, bound: null,
    });
  });

  it('reports landing exactly on a bound', () => {
    expect(planChange(18, 2, { min: 2, max: 20 })).toMatchObject({ to: 20, overflow: 0, bound: 'ceiling' });
    expect(planChange(3, -3, { min: 0, max: 10 })).toMatchObject({ to: 0, overflow: 0, bound: 'floor' });
  });

  // Stress past its maximum is the surplus the book turns into a stat reduction, so the number
  // the bound refused has to survive the clamp.
  it('reports the surplus a bound refused', () => {
    expect(planChange(18, 5, { min: 2, max: 20 })).toMatchObject({ to: 20, applied: 2, overflow: 3 });
    expect(planChange(2, -4, { min: 2, max: 20 })).toMatchObject({ to: 2, applied: 0, overflow: -4 });
  });

  it('clamps nothing on a pod that declares no bounds', () => {
    expect(planChange(3, -9, { min: null, max: null })).toMatchObject({ to: -6, overflow: 0, bound: null });
  });

  it('honours a floor without a ceiling, and a ceiling without a floor', () => {
    expect(planChange(1, -5, { min: 0, max: null })).toMatchObject({ to: 0, overflow: -4, bound: 'floor' });
    expect(planChange(1, 50, { min: null, max: 10 })).toMatchObject({ to: 10, overflow: 41, bound: 'ceiling' });
  });

  it('pulls a value already outside its bounds back inside', () => {
    expect(planChange(25, 0, { min: 2, max: 20 })).toMatchObject({ to: 20, applied: -5, overflow: 5 });
  });
});

describe('planHealthChange — the wound rollover', () => {
  it('leaves the wounds alone while the bar holds', () => {
    expect(planHealthChange(bounded(7, 0, 10), bounded(0, 0, 2), -3)).toMatchObject({
      to: 4, wounds: null, dead: false,
    });
  });

  it('costs a wound and refills the bar when damage empties it exactly', () => {
    expect(planHealthChange(bounded(3, 0, 10), bounded(0, 0, 2), -3)).toMatchObject({
      to: 10, overflow: 0, wounds: { from: 0, to: 1 }, dead: false,
    });
  });

  // The surplus is the point: 8 damage against 3 Health costs a Wound and 5 off the new bar.
  it('carries the surplus into the refilled bar', () => {
    expect(planHealthChange(bounded(3, 0, 10), bounded(0, 0, 2), -8)).toMatchObject({
      from: 3, to: 5, overflow: 0, wounds: { from: 0, to: 1 }, dead: false,
    });
  });

  it('keeps going through as many bars as the damage crosses', () => {
    expect(planHealthChange(bounded(3, 0, 10), bounded(0, 0, 4), -25)).toMatchObject({
      to: 8, wounds: { from: 0, to: 3 }, dead: false,
    });
  });

  // The last Wound is survivable; the one past it is not.
  it('takes the wound that fills the track and still refills', () => {
    expect(planHealthChange(bounded(3, 0, 10), bounded(1, 0, 2), -5)).toMatchObject({
      to: 8, wounds: { from: 1, to: 2 }, dead: false,
    });
  });

  it('dies when the damage runs out of wounds mid-way, reporting what went unabsorbed', () => {
    expect(planHealthChange(bounded(3, 0, 10), bounded(0, 0, 2), -25)).toMatchObject({
      to: 0, overflow: -2, wounds: { from: 0, to: 2 }, dead: true,
    });
  });

  it('dies with the track already full, spending no wound it does not have', () => {
    expect(planHealthChange(bounded(3, 0, 10), bounded(2, 0, 2), -5)).toMatchObject({
      to: 0, overflow: -2, wounds: null, dead: true,
    });
  });

  it('never rolls healing over', () => {
    expect(planHealthChange(bounded(3, 0, 10), bounded(1, 0, 2), 20)).toMatchObject({
      to: 10, overflow: 13, wounds: null, dead: false,
    });
  });

  // Sitting at zero is not being reduced to zero: only damage spends a Wound.
  it('costs nothing when nothing happens to an empty bar', () => {
    expect(planHealthChange(bounded(0, 0, 10), bounded(1, 0, 2), 0)).toMatchObject({
      to: 0, wounds: null, dead: false,
    });
    expect(planHealthChange(bounded(0, 0, 10), bounded(1, 0, 2), 6)).toMatchObject({
      to: 6, wounds: null,
    });
  });

  it('rolls nothing over without a bar to refill or a track to spend', () => {
    expect(planHealthChange(unbounded(3), bounded(0, 0, 2), -9)).toMatchObject({ to: -6, wounds: null });
    expect(planHealthChange(bounded(3, 0, 10), unbounded(0), -9)).toMatchObject({ to: 0, wounds: null });
  });
});

describe('changeAmount', () => {
  it('takes a constant as given', () => {
    expect(changeAmount({ kind: 'amount', amount: -3 })).toBe(-3);
  });

  // The roll's own arithmetic, not the kept die an Outcome reports: 2d10 damage is the sum.
  it('takes a roll at its total', () => {
    const roll = { total: -14, dice: [{ faces: 10, results: [{ result: 10 }, { result: 4 }] }] };
    expect(changeAmount({ kind: 'roll', roll })).toBe(-14);
  });
});

function actor(system: object) {
  const writes: Record<string, number>[] = [];
  return {
    writes,
    toObject: () => ({ system }),
    update: async (data: Record<string, number>) => {
      writes.push(data);
      return data;
    },
  };
}

const character = () => ({
  health: { value: 3, min: 0, max: 10, label: 'Health' },
  hits: { value: 0, min: 0, max: 2, label: 'Wounds' },
  other: { stress: { value: 18, min: 2, max: 20, label: 'Stress' } },
});

describe('mutate — one engine, one update', () => {
  it('writes the clamped value and reports the field it moved', async () => {
    const doc = actor(character());
    const result = await mutate(doc, 'system.other.stress.value', { kind: 'amount', amount: 5 });

    expect(doc.writes).toEqual([{ 'system.other.stress.value': 20 }]);
    expect(result).toMatchObject({
      amount: 5,
      roll: null,
      field: { label: 'Stress', from: 18, to: 20 },
      overflow: 3,
      bound: 'ceiling',
      wounds: null,
      dead: false,
    });
    expect(result.field.address.pod).toBe('stress');
  });

  it('writes health and wounds as one update when the bar rolls over', async () => {
    const doc = actor(character());
    const result = await mutate(doc, 'system.health.value', { kind: 'amount', amount: -8 });

    expect(doc.writes).toEqual([{ 'system.health.value': 5, 'system.hits.value': 1 }]);
    expect(result.wounds).toMatchObject({ label: 'Wounds', from: 0, to: 1 });
  });

  // Legacy ran the whole pipeline twice, once per kind of change, and the copies drifted (F7):
  // one narrated the refilled health with a message key that never mentioned it. There is one
  // path now, so a constant and a roll worth the same cannot describe the same event differently.
  it('treats a rolled amount and a constant amount identically', async () => {
    const flat = actor(character());
    const rolled = actor(character());
    const roll = { total: -8, dice: [{ faces: 10, results: [{ result: 8 }] }] };

    const fromValue = await mutate(flat, 'system.health.value', { kind: 'amount', amount: -8 });
    const fromRoll = await mutate(rolled, 'system.health.value', { kind: 'roll', roll });

    expect(rolled.writes).toEqual(flat.writes);
    expect({ ...fromRoll, roll: null }).toEqual(fromValue);
    expect(fromRoll.roll).toBe(roll);
  });

  it('reports the refilled health once, as the number a message can name', async () => {
    const doc = actor(character());
    const result = await mutate(doc, 'system.health.value', { kind: 'amount', amount: -3 });

    expect(result.field.to).toBe(10);
    expect(result.dead).toBe(false);
  });

  it('holds its result until the document write settles', async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const doc = {
      toObject: () => ({ system: character() }),
      update: async () => gate,
    };

    let settled = false;
    const pending = mutate(doc, 'system.health.value', { kind: 'amount', amount: -1 }).then((result) => {
      settled = true;
      return result;
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(settled).toBe(false);

    release();
    await expect(pending).resolves.toMatchObject({ field: { to: 2 } });
  });

  // prepareDerivedData multiplies a swarm creature's Combat in place. Adding to the number the
  // sheet shows would persist the multiplication, so a mutation reads the stored value.
  it('changes the stored value, not the derived one', async () => {
    const writes: Record<string, number>[] = [];
    const doc = {
      system: { stats: { combat: { value: 15, min: 0, max: 99, label: 'Combat' } } },
      toObject: () => ({ system: { stats: { combat: { value: 5, min: 0, max: 99, label: 'Combat' } } } }),
      update: async (data: Record<string, number>) => {
        writes.push(data);
        return data;
      },
    };

    await mutate(doc, 'system.stats.combat.value', { kind: 'amount', amount: 1 });
    expect(writes).toEqual([{ 'system.stats.combat.value': 6 }]);
  });

  it('refuses a bad address before it writes anything', async () => {
    const doc = actor(character());
    const change: Change = { kind: 'amount', amount: 1 };

    await expect(mutate(doc, 'system.health', change)).rejects.toThrow(AddressError);
    await expect(mutate(doc, 'system.xp.value', change)).rejects.toThrow(AddressError);
    expect(doc.writes).toEqual([]);
  });
});
