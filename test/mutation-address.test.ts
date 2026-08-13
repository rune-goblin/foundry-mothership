import { describe, it, expect } from 'vitest';
import {
  AddressError,
  parseFieldAddress,
  resolveField,
  updateData,
} from '../module/mutation/address.ts';

// The three pod shapes module/data/actor-models.js builds, as a document holds them.
const system = {
  health: { value: 7, min: 0, max: 10, label: 'Health' },
  hits: { value: 1, min: 0, max: 2, label: 'Wounds' },
  bleeding: { value: 0, min: 0, label: 'Bleeding' },
  xp: { value: 3, selectedSkill: '' },
  credits: { value: '250' },
  stats: { body: { value: 40, mod: 0, min: 0, max: 99, label: 'Body', rollLabel: 'Body Save' } },
  other: { stress: { value: 4, min: 2, max: 20, label: 'Stress' } },
};

const field = (address: string) => resolveField(system, parseFieldAddress(address));

describe('parseFieldAddress', () => {
  it('names the pod and the leaf a macro addressed', () => {
    expect(parseFieldAddress('system.other.stress.value')).toEqual({
      path: 'system.other.stress.value',
      podPath: 'system.other.stress',
      pod: 'stress',
      leaf: 'value',
    });
  });

  it.each(['system.health.value', 'system.health.min', 'system.health.max'])(
    'accepts the leaf %s',
    (address) => {
      expect(parseFieldAddress(address).pod).toBe('health');
    },
  );

  it.each([
    ['system.health', 'a pod is not a field'],
    ['health.value', 'an address that skips the system root'],
    ['system.health.current', 'a leaf outside the convention'],
    ['system..value', 'an empty segment'],
    ['', 'nothing at all'],
  ])('refuses %s — %s', (address) => {
    expect(() => parseFieldAddress(address)).toThrow(AddressError);
  });
});

describe('resolveField — the pod contract, honestly', () => {
  it('reads a bounded pod with both of its bounds', () => {
    expect(field('system.other.stress.value')).toMatchObject({
      value: 4,
      bounds: { min: 2, max: 20 },
      label: 'Stress',
    });
  });

  it('reads a stat pod, which carries bounds beside two labels', () => {
    expect(field('system.stats.body.value')).toMatchObject({
      value: 40,
      bounds: { min: 0, max: 99 },
      label: 'Body',
    });
  });

  // Bleeding severity has no ceiling in the schema, and the accessor must not invent one.
  it('reports a floored pod as having no maximum', () => {
    expect(field('system.bleeding.value').bounds).toEqual({ min: 0, max: null });
  });

  it('reports a bare pod as having neither bound nor label', () => {
    expect(field('system.xp.value')).toMatchObject({ value: 3, bounds: { min: null, max: null }, label: null });
  });

  // Legacy clamped a bound against itself, so raising Maximum Stress could never take effect.
  it('leaves a bound unbounded — min and max describe the value, not themselves', () => {
    expect(field('system.other.stress.max')).toMatchObject({ value: 20, bounds: { min: null, max: null } });
    expect(field('system.other.stress.min').value).toBe(2);
  });

  it('fails loudly on a pod this document does not have', () => {
    expect(() => field('system.swarm.combat.value')).toThrow(AddressError);
    expect(() => field('system.swarm.combat.value')).toThrowError(/is not on this document/);
  });

  it('fails loudly on a leaf the pod does not declare', () => {
    try {
      field('system.bleeding.max');
      expect.unreachable('bleeding has no maximum');
    } catch (error) {
      expect((error as AddressError).fault).toBe('missing');
    }
  });

  // credits, class, rank and pronouns are string pods: arithmetic on one must not produce NaN.
  it('fails loudly on a pod holding something other than a number', () => {
    try {
      field('system.credits.value');
      expect.unreachable('credits holds a string');
    } catch (error) {
      expect((error as AddressError).fault).toBe('not-a-number');
    }
  });
});

describe('updateData', () => {
  it('builds one payload keyed by the addresses it was given', () => {
    expect(
      updateData([
        { path: 'system.health.value', from: 3, to: 8 },
        { path: 'system.hits.value', from: 0, to: 1 },
      ]),
    ).toEqual({ 'system.health.value': 8, 'system.hits.value': 1 });
  });

  // JSON.parse('{"system.health.value": NaN}') throws; an object literal cannot.
  it('carries a value no string-built payload could', () => {
    expect(updateData([{ path: 'system.health.value', from: 0, to: Number.NaN }])).toEqual({
      'system.health.value': Number.NaN,
    });
  });
});
