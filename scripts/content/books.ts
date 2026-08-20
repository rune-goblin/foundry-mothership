import type { Book } from './book.ts';
import { PSG } from './books/psg/index.ts';

/** A second book needs a directory under `content/books/`, a module beside `books/psg/`, and one entry here. */
export const BOOKS: Book[] = [PSG];
