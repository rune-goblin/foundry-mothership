import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { bookDir, type Book } from './book.ts';
import { canonical, emit, type Emitted, type Stamp } from './emit.ts';
import { IdRegistry, type Registry } from './ids.ts';
import { checkReferences } from './integrity.ts';
import { checkModelFields } from './model-guard.ts';
import type { Provenance } from './record.ts';
import { fileSlug } from './slug.ts';
import { validateDatasets } from './validate.ts';

export interface BuildOptions {
  root: string;
  books: Book[];
  registryPath: string;
  outDir: string;
  manifestPath?: string;
  allocate?: boolean;
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
  const { root, books, registryPath, outDir, allocate = false } = options;

  const validationErrors = books.flatMap((book) =>
    validateDatasets({ schema: join(bookDir(root, book), 'schema'), data: bookDir(root, book) }),
  );
  if (validationErrors.length) throw new Error(`content failed validation:\n  ${validationErrors.join('\n  ')}`);

  const stamp = readStamp(root);
  const ids = IdRegistry.load(registryPath, allocate);

  const emitted: Emitted[] = [];
  for (const book of books) {
    for (const def of book.packs) {
      const records = [...def.load(root)].sort((a, b) => (a.contentId < b.contentId ? -1 : 1));
      const filenames = new Map<string, string>();
      for (const record of records) {
        const doc = emit(def, record, ids, stamp, book.id);
        const filename = `${fileSlug(record.name)}.json`;
        const clash = filenames.get(filename);
        if (clash) throw new Error(`${def.pack}: "${record.name}" and "${clash}" both slug to ${filename}`);
        filenames.set(filename, record.name);
        emitted.push({ ...doc, filename });
      }
    }
  }

  const modelErrors = checkModelFields(emitted);
  if (modelErrors.length) throw new Error(`emitted content does not fit its DataModel:\n  ${modelErrors.join('\n  ')}`);

  const packs = books.flatMap((b) => b.packs);
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

  if (options.manifestPath) writeManifest(options.manifestPath, books, emitted, stamp);
  if (allocate && ids.allocations) ids.save(registryPath);

  return { emitted, registry: ids.registry, stamp, files };
}

function writeManifest(path: string, books: Book[], emitted: Emitted[], stamp: Stamp): void {
  const documents = [...emitted]
    .sort((a, b) => (`${a.compendium}/${a.contentId}` < `${b.compendium}/${b.contentId}` ? -1 : 1))
    .map((doc) => {
      const provenance: Provenance = { book: doc.book, ...doc.record.provenance };
      return {
        id: doc.id,
        compendium: doc.compendium,
        contentId: doc.contentId,
        name: doc.name,
        file: join(doc.pack, doc.filename),
        provenance,
        results: doc.results,
      };
    });
  const sources = books.map((book) => ({
    id: book.id,
    title: book.title,
    dir: book.dir,
    documents: emitted.filter((d) => d.book === book.id).length,
  }));
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, canonical({ ...stamp, books: sources, documents }));
}
