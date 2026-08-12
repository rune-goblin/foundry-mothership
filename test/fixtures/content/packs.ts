import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ContentRecord, PackDefinition, TableResult } from '../../../scripts/content/record.ts';

export const FIXTURE_ROOT = join(import.meta.dirname, '.');

function records<T>(file: string): T[] {
  return JSON.parse(readFileSync(join(FIXTURE_ROOT, 'local', file), 'utf8')) as T[];
}

interface Gadget {
  id: string;
  name: string;
  img: string;
  description: string;
  severity: number;
  modifiers?: string[];
}

interface Quip {
  id: string;
  name: string;
  img: string;
  command: string;
}

interface Mishap {
  id: string;
  name: string;
  img: string;
  description?: string;
  formula: string;
  results: { id: string; range: [number, number]; description: string }[];
}

const gadgets: PackDefinition = {
  pack: 'gadgets',
  compendium: 'fixture_gadgets_1e',
  documentType: 'Item',
  load: (): ContentRecord[] =>
    records<Gadget>('gadgets.json').map((g) => ({
      contentId: g.id,
      name: g.name,
      img: g.img,
      body: {
        kind: 'Item',
        type: 'condition',
        system: {
          description: g.description,
          severity: g.severity,
          modifiers: g.modifiers ?? [],
        },
      },
      provenance: { tier: 'local', source: 'test/fixtures/content/local/gadgets.json', sourceId: g.id },
    })),
};

const quips: PackDefinition = {
  pack: 'quips',
  compendium: 'fixture_macros_1e',
  documentType: 'Macro',
  load: (): ContentRecord[] =>
    records<Quip>('quips.json').map((q) => ({
      contentId: q.id,
      name: q.name,
      img: q.img,
      body: { kind: 'Macro', type: 'script', scope: 'global', command: q.command },
      provenance: { tier: 'local', source: 'test/fixtures/content/local/quips.json', sourceId: q.id },
    })),
};

const mishaps: PackDefinition = {
  pack: 'mishaps',
  compendium: 'fixture_tables_1e',
  documentType: 'RollTable',
  load: (): ContentRecord[] =>
    records<Mishap>('mishaps.json').map((m) => ({
      contentId: m.id,
      name: m.name,
      img: m.img,
      body: {
        kind: 'RollTable',
        formula: m.formula,
        description: m.description,
        results: m.results.map(
          (r): TableResult => ({ contentId: r.id, range: r.range, description: r.description }),
        ),
      },
      provenance: { tier: 'local', source: 'test/fixtures/content/local/mishaps.json', sourceId: m.id },
    })),
};

export const FIXTURE_PACKS: PackDefinition[] = [gadgets, quips, mishaps];

/** The ids the fixture's "pre-pipeline packs" held, standing in for packs/_source. */
export const FIXTURE_IDS_BEFORE = new Set([
  'FiXaaaaaaaaaaa01',
  'FiXaaaaaaaaaaa02',
  'FiXaaaaaaaaaaa03',
  'FiXbbbbbbbbbbb01',
  'FiXbbbbbbbbbbb02',
  'FiXccccccccccc01',
  'FiXddddddddddd01',
  'FiXddddddddddd02',
  'FiXddddddddddd03',
]);
