import type { IdRegistry } from './ids.ts';
import type { ContentRecord, PackDefinition } from './record.ts';

export interface Stamp {
  systemId: string;
  systemVersion: string;
}

export interface EmittedResult {
  contentId: string;
  id: string;
}

export interface Emitted {
  pack: string;
  book: string;
  compendium: string;
  contentId: string;
  id: string;
  name: string;
  filename: string;
  document: Record<string, unknown>;
  results: EmittedResult[];
  record: ContentRecord;
}

const KEY_PREFIX = { Item: '!items', Macro: '!macros', RollTable: '!tables' } as const;

/**
 * Exactly what `fvtt package pack` needs, and nothing else. Everything an export drags along —
 * `lastModifiedBy`, `folder`, `sort`, `exportSource`, `createdTime`, `modifiedTime`,
 * `coreVersion` — is absent by construction rather than stripped, because nothing generates it.
 * Provenance lives in `build/content-manifest.json`, never inside a shipped pack.
 */
export function emit(
  def: PackDefinition,
  record: ContentRecord,
  ids: IdRegistry,
  stamp: Stamp,
  book: string,
): Emitted {
  const id = ids.documentId(def.pack, record.contentId);
  const _stats = { systemId: stamp.systemId, systemVersion: stamp.systemVersion };
  const base = {
    _id: id,
    _key: `${KEY_PREFIX[def.documentType]}!${id}`,
    name: record.name,
    img: record.img,
    ownership: { default: 0 },
    _stats,
  };

  const body = record.body;
  if (body.kind !== def.documentType) {
    throw new Error(
      `${def.pack}/${record.contentId}: pack holds ${def.documentType} but the record is ${body.kind}`,
    );
  }

  let document: Record<string, unknown>;
  const results: EmittedResult[] = [];

  if (body.kind === 'Item') {
    document = { ...base, type: body.type, system: body.system };
  } else if (body.kind === 'Macro') {
    document = { ...base, type: body.type, scope: body.scope, command: body.command };
  } else {
    const seen = new Set<string>();
    const emittedResults = body.results.map((result) => {
      if (seen.has(result.contentId)) {
        throw new Error(`${def.pack}/${record.contentId}: duplicate result id "${result.contentId}"`);
      }
      seen.add(result.contentId);
      const rid = ids.resultId(def.pack, record.contentId, result.contentId);
      results.push({ contentId: result.contentId, id: rid });
      return {
        _id: rid,
        _key: `!tables.results!${id}.${rid}`,
        type: 'text',
        name: result.name ?? '',
        img: result.img ?? record.img,
        weight: result.weight ?? 1,
        range: result.range,
        description: result.description,
      };
    });
    document = {
      ...base,
      description: body.description ?? '',
      formula: body.formula,
      replacement: body.replacement ?? true,
      displayRoll: body.displayRoll ?? true,
      results: emittedResults,
    };
  }

  return {
    pack: def.pack,
    book,
    compendium: def.compendium,
    contentId: record.contentId,
    id,
    name: record.name,
    filename: '',
    document,
    results,
    record,
  };
}

/**
 * Object key order is not allowed to decide the bytes on disk, so it is sorted away. Arrays keep
 * their order — a RollTable's results are a sequence, not a set.
 */
export function canonical(value: unknown): string {
  return `${JSON.stringify(sortKeys(value), null, 2)}\n`;
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value === null || typeof value !== 'object') return value;
  const source = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(source).sort()) out[key] = sortKeys(source[key]);
  return out;
}
