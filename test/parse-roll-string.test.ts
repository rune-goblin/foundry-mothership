import { describe, it, expect, vi } from 'vitest';

// actor.js imports fromIdUuid from the entry module, which registers hooks and Handlebars
// helpers at module scope. None of that is needed to parse a roll string.
vi.mock('../module/mosh.js', () => ({ fromIdUuid: () => undefined }));

const { MothershipActor } = await import('../module/actor/actor.js');

const parse = (rollString: string, aimFor: string): string =>
  MothershipActor.prototype.parseRollString.call({}, rollString, aimFor);

describe('parseRollString', () => {
  it('passes a plain roll through untouched', () => {
    expect(parse('1d100', 'low')).toBe('1d100');
    expect(parse('2d10', 'high')).toBe('2d10');
  });

  // [+] is advantage: roll the dice set twice and keep the result that helps. Which result
  // helps depends on the direction of the check -- Mothership rolls under for stat checks
  // and over for damage, so aimFor is what decides keep-highest vs keep-lowest.
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
});
