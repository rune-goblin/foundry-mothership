import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { CHECK_SCOPES } from '../module/chat/enrichers.ts';
import { TABLE_KEYS } from '../module/tables/tables.ts';

const root = fileURLToPath(new URL('../module', import.meta.url));

function sources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) return entry.name === 'ui' ? [] : sources(path);
    return entry.name.endsWith('.ts') ? [readFileSync(path, 'utf8')] : [];
  });
}

function flatten(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) => flatten(child, prefix === '' ? key : `${prefix}.${key}`));
}

const lang = (file: string): Set<string> =>
  new Set(flatten(JSON.parse(readFileSync(fileURLToPath(new URL(`../lang/${file}`, import.meta.url)), 'utf8'))));

const en = lang('en.json');
const ptBR = lang('pt-BR.json');

/** What the runtime spells out, plus the two families it builds from a key space. */
const used = [
  ...new Set(sources(root).flatMap((source) => [...source.matchAll(/'(Mosh\.[A-Za-z][\w.]*)'/g)].map((m) => m[1]))),
  ...CHECK_SCOPES.map((scope) => `Mosh.RollScope.${scope}`),
  ...TABLE_KEYS.map((key) => `Mosh.Table.${key}`),
].sort();

describe('the strings the new runtime asks for', () => {
  it('finds more than a handful of them, or this spec is asserting nothing', () => {
    expect(used.length).toBeGreaterThan(20);
  });

  it('exist in English', () => {
    expect(used.filter((key) => !en.has(key))).toEqual([]);
  });

  // A translation that silently stops covering the system is how `pt-BR` would rot: every key
  // added by a unit is added to both files in that unit.
  it('exist in Portuguese', () => {
    expect(used.filter((key) => !ptBR.has(key))).toEqual([]);
  });
});
