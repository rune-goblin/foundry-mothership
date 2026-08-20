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
 * `dir` is the manifest's provenance for every document, and BOOK.md records the printing and
 * licence — a book missing either can't be traced.
 */
export function checkBookDir(root: string, book: Book): string[] {
  const dir = bookDir(root, book);
  if (!existsSync(dir)) return [`${book.dir}: no such directory`];
  if (!existsSync(join(dir, 'BOOK.md'))) return [`${book.dir}: no BOOK.md`];
  return [];
}
