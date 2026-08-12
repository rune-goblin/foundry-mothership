import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { canonical, emit, type Emitted, type Stamp } from './emit.ts';
import { IdRegistry, type Registry } from './ids.ts';
import { checkReferences } from './integrity.ts';
import type { PackDefinition } from './record.ts';
import { fileSlug } from './slug.ts';
import { validateTier, type TierPaths } from './validate.ts';

export interface BuildOptions {
  root: string;
  packs: PackDefinition[];
  registryPath: string;
  outDir: string;
  manifestPath?: string;
  allocate?: boolean;
  tiers?: TierPaths[];
}

export interface BuildResult {
  emitted: Emitted[];
  registry: Registry;
  stamp: Stamp;
  files: Map<string, string>;
}

export function readStamp(root: string): Stamp {
  const manifest = JSON.parse(readFileSync(join(root, 'system.json'), 'utf8')) as {
    id: string;
    version: string;
  };
  return { systemId: manifest.id, systemVersion: manifest.version };
}

export function build(options: BuildOptions): BuildResult {
  const { root, packs, registryPath, outDir, allocate = false } = options;

  const validationErrors = (options.tiers ?? []).flatMap((tier) => validateTier(tier));
  if (validationErrors.length) throw new Error(`content failed validation:\n  ${validationErrors.join('\n  ')}`);

  const stamp = readStamp(root);
  const ids = IdRegistry.load(registryPath, allocate);

  const emitted: Emitted[] = [];
  for (const def of packs) {
    const records = [...def.load(root)].sort((a, b) => (a.contentId < b.contentId ? -1 : 1));
    const filenames = new Map<string, string>();
    for (const record of records) {
      const doc = emit(def, record, ids, stamp);
      const filename = `${fileSlug(record.name)}.json`;
      const clash = filenames.get(filename);
      if (clash) throw new Error(`${def.pack}: "${record.name}" and "${clash}" both slug to ${filename}`);
      filenames.set(filename, record.name);
      emitted.push({ ...doc, filename });
    }
  }

  const compendia = new Set(packs.map((p) => p.compendium));
  const refErrors = checkReferences({ systemId: stamp.systemId, emitted, compendia });
  if (refErrors.length) throw new Error(`referential integrity failed:\n  ${refErrors.join('\n  ')}`);

  const files = new Map<string, string>();
  for (const doc of emitted) files.set(join(doc.pack, doc.filename), canonical(doc.document));

  for (const def of packs) {
    const dir = join(outDir, def.pack);
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
  }
  for (const [rel, text] of files) writeFileSync(join(outDir, rel), text);

  if (options.manifestPath) writeManifest(options.manifestPath, emitted, stamp);
  if (allocate && ids.allocations) ids.save(registryPath);

  return { emitted, registry: ids.registry, stamp, files };
}

function writeManifest(path: string, emitted: Emitted[], stamp: Stamp): void {
  const documents = [...emitted]
    .sort((a, b) => (`${a.compendium}/${a.contentId}` < `${b.compendium}/${b.contentId}` ? -1 : 1))
    .map((doc) => ({
      id: doc.id,
      compendium: doc.compendium,
      contentId: doc.contentId,
      name: doc.name,
      file: join(doc.pack, doc.filename),
      provenance: doc.record.provenance,
      results: doc.results,
    }));
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, canonical({ ...stamp, documents }));
}
