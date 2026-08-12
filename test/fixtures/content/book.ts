import { join } from 'node:path';
import type { Book } from '../../../scripts/content/book.ts';
import type { ContentRecord, PackDefinition, TableResult } from '../../../scripts/content/record.ts';
import { GADGETS } from './books/fixture/gadgets.ts';
import { MISHAPS } from './books/fixture/mishaps.ts';
import { QUIPS } from './books/fixture/quips.ts';

export const FIXTURE_ROOT = join(import.meta.dirname, '.');
const SOURCE = 'test/fixtures/content/books/fixture';

// `modifiers` is deliberately not mapped into `system`: MoshCondition declares no such field, so
// emitting it is the exact defect the DataModel guard exists to catch. S8 adds the field; until
// then test/content-pipeline.test.ts uses it as the negative case.
const gadgets: PackDefinition = {
  pack: 'gadgets',
  compendium: 'fixture_gadgets_1e',
  documentType: 'Item',
  load: (): ContentRecord[] =>
    GADGETS.map((g) => ({
      contentId: g.id,
      name: g.name,
      img: g.img,
      body: {
        kind: 'Item',
        type: 'condition',
        system: {
          description: g.description,
          severity: g.severity,
          treatment: g.treatment,
        },
      },
      provenance: { source: `${SOURCE}/gadgets.ts`, sourceId: g.id },
    })),
};

const quips: PackDefinition = {
  pack: 'quips',
  compendium: 'fixture_macros_1e',
  documentType: 'Macro',
  load: (): ContentRecord[] =>
    QUIPS.map((q) => ({
      contentId: q.id,
      name: q.name,
      img: q.img,
      body: { kind: 'Macro', type: 'script', scope: 'global', command: q.command },
      provenance: { source: `${SOURCE}/quips.ts`, sourceId: q.id },
    })),
};

const mishaps: PackDefinition = {
  pack: 'mishaps',
  compendium: 'fixture_tables_1e',
  documentType: 'RollTable',
  load: (): ContentRecord[] =>
    MISHAPS.map((m) => ({
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
      provenance: { source: `${SOURCE}/mishaps.ts`, sourceId: m.id },
    })),
};

export const FIXTURE_BOOK: Book = {
  id: 'fixture',
  title: 'Fixture book',
  dir: SOURCE,
  packs: [gadgets, quips, mishaps],
};

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
