import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { PackDefinition } from './record.ts';

export interface Book {
  /** Directory name under `content/books/`, and the stamp on every document it emits. */
  id: string;
  title: string;
  /** Repo-relative source directory: the typed catalogs plus `BOOK.md`. */
  dir: string;
  packs: PackDefinition[];
}

export function bookDir(root: string, book: Book): string {
  return join(root, book.dir);
}

/**
 * A book's records reach the build through imports, so a wrong `dir` can no longer empty it — but
 * `dir` is what the manifest cites as the provenance of every document, and BOOK.md is where the
 * printing and the licence are recorded. A book missing either is not a source anyone can trace.
 */
export function checkBookDir(root: string, book: Book): string[] {
  const dir = bookDir(root, book);
  if (!existsSync(dir)) return [`${book.dir}: no such directory`];
  if (!existsSync(join(dir, 'BOOK.md'))) return [`${book.dir}: no BOOK.md`];
  return [];
}
