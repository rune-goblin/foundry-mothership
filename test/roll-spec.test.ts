import { describe, it, expect } from 'vitest';
import { parseRollSpec, toFormula, toRollString } from '../module/rolls/parse.ts';
import { CHECK_SEMANTICS, keepOf, type Aim } from '../module/rolls/spec.ts';
import { PANIC_DIE } from '../module/rules.ts';

describe('parseRollSpec', () => {
  it('reads the die out of a plain roll', () => {
    expect(parseRollSpec('1d100', 'low')).toEqual({
      dice: '1d100', count: 1, faces: 100, sign: 1, advantage: 'none', aim: 'low',
    });
  });

  it('reads the modifier and the whitespace around it', () => {
    expect(parseRollSpec('1d100 [+]', 'low').advantage).toBe('advantage');
    expect(parseRollSpec('1d100[-]', 'low').advantage).toBe('disadvantage');
    expect(parseRollSpec('1d100 [+]', 'low').dice).toBe('1d100');
  });

  it('counts the dice', () => {
    expect(parseRollSpec('2d10[-]', 'high')).toMatchObject({ count: 2, faces: 10, dice: '2d10' });
  });

  it('carries a negative roll as a sign, keeping the expression whole', () => {
    expect(parseRollSpec('-1d10', 'low')).toMatchObject({ dice: '-1d10', sign: -1, count: 1, faces: 10 });
  });

  // Weapon damage is any Foundry expression the book prints, including one that rolls no dice.
  it('leaves an expression it cannot count as an opaque dice string', () => {
    expect(parseRollSpec('2d10+1', 'high')).toMatchObject({ dice: '2d10+1', count: null, faces: null, sign: 1 });
    expect(parseRollSpec('Str/10', 'high')).toMatchObject({ dice: 'Str/10', count: null, faces: null });
  });

  // The Panic Check macro passes the odds and lets the table name the die.
  it('takes the die from the fallback when the string is only a modifier', () => {
    const spec = parseRollSpec('[-]', 'high', PANIC_DIE);
    expect(spec).toMatchObject({ dice: '1d20', faces: 20, advantage: 'disadvantage' });
    expect(toFormula(spec)).toBe('{1d20,1d20}kl');
  });
});

describe('keepOf — which die the modifier keeps', () => {
  const keep = (advantage: string, aim: Aim) =>
    keepOf(parseRollSpec(`1d100 ${advantage}`, aim));

  it('keeps the helpful die, which inverts with the direction of the check', () => {
    expect(keep('[+]', 'low')).toBe('kl');
    expect(keep('[+]', 'high')).toBe('kh');
    expect(keep('[-]', 'low')).toBe('kh');
    expect(keep('[-]', 'high')).toBe('kl');
  });

  it('keeps nothing without a modifier', () => {
    expect(keep('', 'low')).toBeNull();
  });
});

describe('RollSpec round trips', () => {
  const strings = ['1d100', '1d100 [+]', '1d100 [-]', '2d10 [+]', '-1d10', '-1d10 [-]', '1d5'];

  it.each(strings)('%s survives a trip through the record', (rollString) => {
    const spec = parseRollSpec(rollString, 'low');
    expect(toRollString(spec)).toBe(rollString);
    expect(parseRollSpec(toRollString(spec), 'low')).toEqual(spec);
  });

  it('canonicalizes the spacing the mini-language tolerates', () => {
    expect(toRollString(parseRollSpec('1d100[+]', 'low'))).toBe('1d100 [+]');
  });
});

describe('CHECK_SEMANTICS — how each kind of check is judged', () => {
  it('rolls stats and skills under, counting doubles', () => {
    expect(CHECK_SEMANTICS.stat).toEqual({
      aim: 'low',
      comparison: '<',
      crits: true,
      zeroBased: true,
      autoFail: true,
    });
    expect(CHECK_SEMANTICS.skill).toEqual(CHECK_SEMANTICS.stat);
    expect(CHECK_SEMANTICS['weapon-attack']).toEqual(CHECK_SEMANTICS.stat);
  });

  it('rolls a Panic Check over the Stress it is compared against, with no criticals', () => {
    expect(CHECK_SEMANTICS.panic).toEqual({
      aim: 'high',
      comparison: '>',
      crits: false,
      zeroBased: false,
      autoFail: false,
    });
  });

  // PSG 24 states the 90+ rule of the d100 Check or Save. Legacy compared every roll it made
  // against 90 whatever the die, and no reachable roll differed — a d20 against Stress cannot
  // reach 90 — so the scope is written down here rather than left to the next die size.
  it('auto-fails at 90 only where the book says so: the d100 checks and saves', () => {
    const autoFails = Object.entries(CHECK_SEMANTICS)
      .filter(([, semantics]) => semantics.autoFail)
      .map(([kind]) => kind);

    expect(autoFails.sort()).toEqual(['rest-save', 'skill', 'stat', 'weapon-attack']);
  });

  // 10 damage is 10, not 0 — only the check dice read their top face as zero.
  it('does not zero-base damage dice', () => {
    expect(CHECK_SEMANTICS['weapon-damage'].zeroBased).toBe(false);
    expect(CHECK_SEMANTICS['rest-save'].zeroBased).toBe(true);
  });
});
