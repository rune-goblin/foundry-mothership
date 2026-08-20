import { describe, it, expect, vi } from 'vitest';
import { compare } from '../module/compare.js';

describe('compare — the four comparators the templates use', () => {
  it('=== on strings', () => {
    expect(compare('str', 'ability', '===', 'ability')).toBe(true);
    expect(compare('str', 'ability', '===', 'weapon')).toBe(false);
  });

  it('!== on strings', () => {
    expect(compare('str', 'damage', '!==', 'damage')).toBe(false);
    expect(compare('str', 'panic', '!==', 'damage')).toBe(true);
  });

  it('> and >= on numbers', () => {
    expect(compare('int', 1, '>', 0)).toBe(true);
    expect(compare('int', 0, '>', 0)).toBe(false);
    expect(compare('int', 90, '>=', 90)).toBe(true);
    expect(compare('int', 89, '>=', 90)).toBe(false);
  });
});

describe('compare — coercion matches the old eval', () => {
  it('compares numerically for int even when given digit strings', () => {
    expect(compare('int', '10', '>', '9')).toBe(true);
  });

  it('compares lexicographically for str', () => {
    expect(compare('str', '10', '>', '9')).toBe(false);
  });

  it('treats a missing value as NaN for int, which fails every comparison', () => {
    expect(compare('int', undefined, '>=', 22)).toBe(false);
    expect(compare('int', undefined, '<', 22)).toBe(false);
  });
});

describe('compare — what eval got wrong', () => {
  it('handles a value containing a quote', () => {
    expect(compare('str', "Sam's Rifle", '===', "Sam's Rifle")).toBe(true);
    expect(compare('str', "Sam's Rifle", '===', 'Other')).toBe(false);
  });

  it('does not execute the value as code', () => {
    const spy = vi.fn();
    (globalThis as Record<string, unknown>).__pwned = spy;
    compare('str', '"+__pwned()+"', '===', 'x');
    expect(spy).not.toHaveBeenCalled();
    delete (globalThis as Record<string, unknown>).__pwned;
  });
});

describe('compare — unknown input', () => {
  it('returns false and warns for an unsupported comparator', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(compare('int', 1, '<=>', 2)).toBe(false);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('returns false for an unknown value type', () => {
    expect(compare('bool', true, '===', true)).toBe(false);
  });
});
