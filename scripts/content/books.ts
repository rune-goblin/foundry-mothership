import type { Book } from './book.ts';
import { PSG } from './books/psg/index.ts';

/**
 * The build's whole notion of where content comes from. A second book is a directory under
 * `content/books/`, a module beside `books/psg/`, and one entry here — the emitter, the DataModel
 * guard and the manifest are all book-agnostic.
 */
export const BOOKS: Book[] = [PSG];
