import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { slug } from './slug.ts';

export interface SourceDocument {
  contentId: string;
  id: string;
  name: string;
  results: Record<string, string>;
}

export interface SourcePack {
  pack: string;
  documents: SourceDocument[];
}

// The five inherited compendia, source directory → compendium id. The ids cannot be renamed:
// they are baked into every @UUID in the shipped content and into existing worlds.
export const INHERITED_PACKS: ReadonlyArray<{ pack: string; compendium: string; documentType: string }> = [
  { pack: 'conditions', compendium: 'conditions_1e', documentType: 'Item' },
  { pack: 'hotbar', compendium: 'macros_hotbar_1e', documentType: 'Macro' },
  { pack: 'triggered', compendium: 'macros_triggered_1e', documentType: 'Macro' },
  { pack: 'rolltables', compendium: 'rolltables_1e', documentType: 'RollTable' },
];

interface RawDocument {
  _id: string;
  name: string;
  results?: { _id: string }[];
}

// Content ids are minted from today's names once, at seed time, and frozen in the registry
// thereafter — a later rename changes the name in the content source, never the key. Results
// carry no usable name (all but a handful are ""), so they are keyed by their seed ordinal.
export function readPackSource(root: string, pack: string): SourcePack {
  const dir = join(root, 'packs/_source', pack);
  const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  const documents: SourceDocument[] = [];
  const seen = new Map<string, string>();

  for (const file of files) {
    const doc = JSON.parse(readFileSync(join(dir, file), 'utf8')) as RawDocument;
    const contentId = slug(doc.name);
    const clash = seen.get(contentId);
    if (clash) {
      throw new Error(`${pack}: "${doc.name}" and "${clash}" both slug to "${contentId}"`);
    }
    seen.set(contentId, doc.name);

    const results: Record<string, string> = {};
    (doc.results ?? []).forEach((r, i) => {
      results[`r${String(i + 1).padStart(2, '0')}`] = r._id;
    });
    documents.push({ contentId, id: doc._id, name: doc.name, results });
  }

  documents.sort((a, b) => (a.contentId < b.contentId ? -1 : 1));
  return { pack, documents };
}

export function readAllPackSources(root: string): SourcePack[] {
  return INHERITED_PACKS.map(({ pack }) => readPackSource(root, pack));
}
