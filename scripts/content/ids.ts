import { readFileSync, writeFileSync } from 'node:fs';
import { randomInt } from 'node:crypto';
import { CONTENT_ID } from './slug.ts';

export interface RegistryEntry {
  id: string;
  results?: Record<string, string>;
}

export interface RegistryPack {
  compendium: string;
  documentType: string;
  documents: Record<string, RegistryEntry>;
}

export interface Retirement {
  pack: string;
  contentId: string;
  id: string;
  retired: string;
  reason: string;
}

export interface Registry {
  version: number;
  packs: Record<string, RegistryPack>;
  retired: Retirement[];
}

export const FOUNDRY_ID = /^[A-Za-z0-9]{16}$/;

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function randomId(): string {
  let out = '';
  for (let i = 0; i < 16; i += 1) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

export function emptyRegistry(): Registry {
  return { version: 1, packs: {}, retired: [] };
}

export function loadRegistry(path: string): Registry {
  return JSON.parse(readFileSync(path, 'utf8')) as Registry;
}

export function allIds(registry: Registry): Set<string> {
  const ids = new Set<string>();
  for (const pack of Object.values(registry.packs)) {
    for (const entry of Object.values(pack.documents)) {
      ids.add(entry.id);
      for (const rid of Object.values(entry.results ?? {})) ids.add(rid);
    }
  }
  for (const r of registry.retired) ids.add(r.id);
  return ids;
}

export class IdRegistry {
  readonly registry: Registry;
  readonly allocate: boolean;
  private readonly taken: Set<string>;
  private allocated = 0;

  constructor(registry: Registry, allocate = false) {
    this.registry = registry;
    this.allocate = allocate;
    this.taken = allIds(registry);
  }

  static load(path: string, allocate = false): IdRegistry {
    return new IdRegistry(loadRegistry(path), allocate);
  }

  get allocations(): number {
    return this.allocated;
  }

  /** Ids are never derived from the record — a rename must never move one. */
  private mint(): string {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const id = randomId();
      if (!this.taken.has(id)) {
        this.taken.add(id);
        this.allocated += 1;
        return id;
      }
    }
    throw new Error('could not mint a free document id in 100 attempts');
  }

  private pack(pack: string): RegistryPack {
    const entry = this.registry.packs[pack];
    if (!entry) throw new Error(`content/ids.json declares no pack "${pack}"`);
    return entry;
  }

  documentId(pack: string, contentId: string): string {
    if (!CONTENT_ID.test(contentId)) {
      throw new Error(`${pack}/${contentId}: content ids must match ${CONTENT_ID}`);
    }
    const documents = this.pack(pack).documents;
    const existing = documents[contentId];
    if (existing) return existing.id;
    if (!this.allocate) {
      throw new Error(
        `${pack}/${contentId} is not in content/ids.json. Re-run with --allocate and commit the registry.`,
      );
    }
    documents[contentId] = { id: this.mint() };
    return documents[contentId]!.id;
  }

  resultId(pack: string, contentId: string, resultId: string): string {
    if (!CONTENT_ID.test(resultId)) {
      throw new Error(`${pack}/${contentId}#${resultId}: result ids must match ${CONTENT_ID}`);
    }
    const documents = this.pack(pack).documents;
    const entry = documents[contentId];
    if (!entry) throw new Error(`${pack}/${contentId}: allocate the document before its results`);
    const results = (entry.results ??= {});
    const existing = results[resultId];
    if (existing) return existing;
    if (!this.allocate) {
      throw new Error(
        `${pack}/${contentId}#${resultId} is not in content/ids.json. Re-run with --allocate and commit the registry.`,
      );
    }
    results[resultId] = this.mint();
    return results[resultId]!;
  }

  retire(pack: string, contentId: string, reason: string, on: string): void {
    if (!reason.trim()) throw new Error(`retiring ${pack}/${contentId} needs a reason`);
    const documents = this.pack(pack).documents;
    const entry = documents[contentId];
    if (!entry) throw new Error(`${pack}/${contentId} is not registered, so it cannot be retired`);
    delete documents[contentId];
    this.registry.retired.push({ pack, contentId, id: entry.id, retired: on, reason });
    for (const [rid, id] of Object.entries(entry.results ?? {})) {
      this.registry.retired.push({
        pack,
        contentId: `${contentId}#${rid}`,
        id,
        retired: on,
        reason,
      });
    }
  }

  save(path: string): void {
    writeFileSync(path, serializeRegistry(this.registry));
  }
}

// Sorted and newline-terminated so the committed registry diffs by the entry that changed
// rather than by wherever the writer happened to put it.
export function serializeRegistry(registry: Registry): string {
  const packs: Record<string, RegistryPack> = {};
  for (const name of Object.keys(registry.packs).sort()) {
    const pack = registry.packs[name]!;
    const documents: Record<string, RegistryEntry> = {};
    for (const contentId of Object.keys(pack.documents).sort()) {
      const entry = pack.documents[contentId]!;
      const results = entry.results;
      documents[contentId] =
        results && Object.keys(results).length
          ? {
              id: entry.id,
              results: Object.fromEntries(Object.keys(results).sort().map((k) => [k, results[k]!])),
            }
          : { id: entry.id };
    }
    packs[name] = { compendium: pack.compendium, documentType: pack.documentType, documents };
  }
  const retired = [...registry.retired].sort((a, b) =>
    `${a.pack}/${a.contentId}` < `${b.pack}/${b.contentId}` ? -1 : 1,
  );
  return `${JSON.stringify({ version: registry.version, packs, retired }, null, 2)}\n`;
}
