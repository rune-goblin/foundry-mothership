import { describe, it, expect } from 'vitest';
import { rollFormula } from '../module/rolls/parse.ts';
import type { Aim } from '../module/rolls/spec.ts';

const parse = (rollString: string, aimFor: Aim): string => rollFormula(rollString, aimFor);

describe('rollFormula — the roll string a check is built from', () => {
  it('passes a plain roll through untouched', () => {
    expect(parse('1d100', 'low')).toBe('1d100');
    expect(parse('2d10', 'high')).toBe('2d10');
  });

  // [+] rolls the dice set twice and keeps the result that helps; aimFor decides which end that is.
  it('keeps the highest for advantage when aiming high', () => {
    expect(parse('1d100[+]', 'high')).toBe('{1d100,1d100}kh');
  });

  it('keeps the lowest for advantage when aiming low', () => {
    expect(parse('1d100[+]', 'low')).toBe('{1d100,1d100}kl');
  });

  it('keeps the lowest for disadvantage when aiming high', () => {
    expect(parse('1d100[-]', 'high')).toBe('{1d100,1d100}kl');
  });

  it('keeps the highest for disadvantage when aiming low', () => {
    expect(parse('1d100[-]', 'low')).toBe('{1d100,1d100}kh');
  });

  it('inverts between the two directions for the same modifier', () => {
    expect(parse('1d100[+]', 'high')).not.toBe(parse('1d100[+]', 'low'));
    expect(parse('1d100[-]', 'high')).not.toBe(parse('1d100[-]', 'low'));
  });

  it('advantage and disadvantage are opposites at the same aim', () => {
    expect(parse('1d100[+]', 'high')).toBe(parse('1d100[-]', 'low'));
    expect(parse('1d100[-]', 'high')).toBe(parse('1d100[+]', 'low'));
  });

  it('duplicates whatever dice precede the modifier', () => {
    expect(parse('2d10[+]', 'high')).toBe('{2d10,2d10}kh');
    expect(parse('1d5[-]', 'low')).toBe('{1d5,1d5}kh');
  });

  it('tolerates whitespace before the modifier', () => {
    expect(parse('1d100 [+]', 'high')).toBe('{1d100,1d100}kh');
  });

  it('duplicates a negative die whole', () => {
    expect(parse('-1d10[-]', 'low')).toBe('{-1d10,-1d10}kh');
  });
});
