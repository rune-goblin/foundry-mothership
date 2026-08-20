import { describe, it, expect } from 'vitest';
import { RANK_BONUS, rankBonus, skillRank } from '../module/rules.ts';

describe('skillRank — the one place a stored rank becomes a rank', () => {
  it('reads the capitalized word a skill item stores', () => {
    expect(skillRank('Trained')).toBe('trained');
    expect(skillRank('Expert')).toBe('expert');
    expect(skillRank('Master')).toBe('master');
  });

  it('reads the key the rules table is written in', () => {
    expect(skillRank('master')).toBe('master');
    expect(skillRank(' Expert ')).toBe('expert');
  });

  it('refuses a rank it does not know instead of scoring it zero', () => {
    expect(() => skillRank('Veteran')).toThrow(/Unknown skill rank/);
    expect(() => skillRank('')).toThrow(/Unknown skill rank/);
    expect(() => skillRank(undefined as unknown as string)).toThrow(/Unknown skill rank/);
  });

  it('refuses an inherited property name', () => {
    expect(() => skillRank('toString')).toThrow(/Unknown skill rank/);
  });
});

describe('rankBonus', () => {
  it('gives the PSG bonus for a stored rank', () => {
    expect(rankBonus('Trained')).toBe(10);
    expect(rankBonus('Expert')).toBe(15);
    expect(rankBonus('Master')).toBe(20);
  });

  it('reads the same table the rules state', () => {
    expect(rankBonus('Master')).toBe(RANK_BONUS.master);
  });
});
