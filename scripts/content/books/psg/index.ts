import type { Book } from '../../book.ts';
import { DOCUMENT_PACKS } from './documents.ts';
import { ITEM_PACKS } from './items.ts';
import { ROLLTABLES } from './tables.ts';

export const PSG: Book = {
  id: 'psg',
  title: "Mothership 1e — Player's Survival Guide",
  dir: 'content/books/psg',
  packs: [...ITEM_PACKS, ROLLTABLES, ...DOCUMENT_PACKS],
};
