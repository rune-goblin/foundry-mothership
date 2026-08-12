import type { Book } from '../book.ts';

export const PSG: Book = {
  id: 'psg',
  title: "Mothership 1e — Player's Survival Guide",
  dir: 'content/books/psg',
  // S3 adds one PackDefinition per emitted compendium, reading the datasets through
  // `dataset(root, PSG, 'skills')`. Empty until then, so the build emits nothing.
  packs: [],
};
