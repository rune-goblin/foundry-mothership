import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PackDefinition } from './record.ts';

export interface Book {
  /** Directory name under `content/books/`, and the stamp on every document it emits. */
  id: string;
  title: string;
  /** Repo-relative source directory: `*.json` datasets plus `schema/` and `BOOK.md`. */
  dir: string;
  packs: PackDefinition[];
}

export function bookDir(root: string, book: Book): string {
  return join(root, book.dir);
}

export function dataset<T>(root: string, book: Book, name: string): T {
  return JSON.parse(readFileSync(join(bookDir(root, book), `${name}.json`), 'utf8')) as T;
}
