import { describe, it, expect, vi } from 'vitest';

vi.mock('../module/mosh.js', () => ({ fromIdUuid: () => undefined }));

const { MothershipActor } = await import('../module/actor/actor.js');

type Modifier = { modifier: 'advantage' | 'disadvantage'; scope: string };

const condition = (name: string, modifiers: Modifier[] = []) =>
  ({ type: 'condition', name, system: { modifiers } });

const resolve = (items: unknown[], scope: string | null) =>
  MothershipActor.prototype.conditionModifier.call({ items }, scope) as {
    sign: string;
    names: string[];
  } | null;

const NIGHTMARES = condition('Nightmares', [{ modifier: 'disadvantage', scope: 'restSave' }]);
const SPIRALING = condition('Spiraling', [{ modifier: 'disadvantage', scope: 'panicCheck' }]);
const FRIGHTENED = condition('Frightened', [{ modifier: 'disadvantage', scope: 'fear' }]);

describe('conditionModifier — which roll a condition reaches', () => {
  it('applies to the roll the condition names', () => {
    expect(resolve([NIGHTMARES], 'restSave')).toEqual({ sign: '[-]', names: ['Nightmares'] });
  });

  it('leaves every other roll alone', () => {
    for (const scope of ['fear', 'body', 'combat', 'panicCheck']) {
      expect(resolve([NIGHTMARES], scope)).toBeNull();
    }
  });

  // A Rest Save resolves to the actor's lowest save, which may be Fear. It is still a Rest Save.
  it('does not let Frightened reach a Rest Save', () => {
    expect(resolve([FRIGHTENED], 'restSave')).toBeNull();
  });

  it('picks out only the conditions in scope when several are held', () => {
    expect(resolve([NIGHTMARES, SPIRALING, FRIGHTENED], 'panicCheck')).toEqual({
      sign: '[-]',
      names: ['Spiraling'],
    });
  });

  it('names every condition contributing to the same roll', () => {
    const other = condition('Sleepless', [{ modifier: 'disadvantage', scope: 'restSave' }]);
    expect(resolve([NIGHTMARES, other], 'restSave')).toEqual({
      sign: '[-]',
      names: ['Nightmares', 'Sleepless'],
    });
  });

  it('reads advantage as well as disadvantage', () => {
    const blessed = condition('Blessed', [{ modifier: 'advantage', scope: 'body' }]);
    expect(resolve([blessed], 'body')).toEqual({ sign: '[+]', names: ['Blessed'] });
  });

  // The book's rule for [+] against [-]. parseRollString reads only the [-] out of a string
  // holding both, so the cancellation has to happen before the roll string is built.
  it('cancels opposed modifiers to a normal roll', () => {
    const blessed = condition('Blessed', [{ modifier: 'advantage', scope: 'restSave' }]);
    expect(resolve([NIGHTMARES, blessed], 'restSave')).toBeNull();
  });

  it('ignores items that are not conditions', () => {
    const weapon = { type: 'weapon', name: 'Revolver', system: { modifiers: [{ modifier: 'disadvantage', scope: 'combat' }] } };
    expect(resolve([weapon], 'combat')).toBeNull();
  });

  it('is null for a condition holding no modifiers, and for a roll with no scope', () => {
    expect(resolve([condition('Haunted')], 'fear')).toBeNull();
    expect(resolve([NIGHTMARES], null)).toBeNull();
  });
});

describe('conditionPreselect — the dialog button a modifier defaults to', () => {
  const preselect = (modifier: unknown, sign: string) =>
    MothershipActor.prototype.conditionPreselect.call({}, modifier, sign) as Record<string, unknown>;

  it('marks the button matching the sign', () => {
    expect(preselect({ sign: '[-]', names: ['Nightmares'] }, '[-]')).toEqual({
      default: true,
      class: 'condition-preselect',
    });
  });

  // DialogV2 autofocuses the first button when no button claims `default`, so the unmarked ones
  // must stay empty rather than carry `default: false`.
  it('adds nothing to the other buttons, or when no modifier applies', () => {
    expect(preselect({ sign: '[-]', names: ['Nightmares'] }, '[+]')).toEqual({});
    expect(preselect(null, '[-]')).toEqual({});
  });
});
