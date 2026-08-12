import type { Source } from '../common.ts';

export type { Source };

const BOOK = { book: "Player's Survival Guide", system: 'mothership-1e', version: '1.2' } as const;

/** One printing, so only the page and section vary across the 136 records that cite it. */
export function psg(page: number, section?: string): Source {
  return section === undefined ? { ...BOOK, page } : { ...BOOK, page, section };
}
