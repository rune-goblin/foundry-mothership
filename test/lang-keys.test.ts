import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { CHECK_SCOPES } from '../module/chat/enrichers.ts';
import { choiceKey, MENU_KEY, settingKey, SETTINGS } from '../module/settings.ts';
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

// Setting keys are built from the setting's own name, so none appears as a literal for the scan
// above to find — list them explicitly instead.
const settingKeys = [
  ...SETTINGS.flatMap((setting) => [
    settingKey(setting.key, 'Name'),
    settingKey(setting.key, 'Hint'),
    ...(setting.choices ?? []).map((choice) => choiceKey(setting.key, choice)),
  ]),
  settingKey(MENU_KEY, 'Name'),
  settingKey(MENU_KEY, 'Label'),
  settingKey(MENU_KEY, 'Hint'),
];

/** What the runtime spells out, plus the families it builds from a key space. */
const used = [
  ...new Set(sources(root).flatMap((source) => [...source.matchAll(/'(Mothership\.[A-Za-z][\w.]*)'/g)].map((m) => m[1]))),
  ...CHECK_SCOPES.map((scope) => `Mothership.RollScope.${scope}`),
  ...TABLE_KEYS.map((key) => `Mothership.Table.${key}`),
  ...settingKeys,
].sort();

describe('the strings the new runtime asks for', () => {
  it('finds more than a handful of them, or this spec is asserting nothing', () => {
    expect(used.length).toBeGreaterThan(20);
  });

  it('exist in English', () => {
    expect(used.filter((key) => !en.has(key))).toEqual([]);
  });

  it('exist in Portuguese', () => {
    expect(used.filter((key) => !ptBR.has(key))).toEqual([]);
  });
});
