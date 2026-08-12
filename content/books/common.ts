// Value types every book's catalogs share. A book's own datasets live under its directory and
// name it; nothing here is PSG-specific.

export type Modifier = 'advantage' | 'disadvantage';

export type WoundType = 'blunt-force' | 'bleeding' | 'gunshot' | 'fire-explosives' | 'gore-massive';

/** Inclusive `[low, high]`, in the die's own numbering — the wound tables start at 0. */
export type RollRange = readonly [number, number];

export interface Source {
  book: string;
  system: string;
  version: string;
  page: number;
  /** `page.column`, where the book's layout makes the distinction worth keeping. */
  section?: string;
}

export interface Cost {
  raw: string;
  value: number | null;
  /** True where the price is per unit rather than for the listed quantity. */
  each?: boolean;
}

export interface Duration {
  raw: string;
  minutes: number | null;
}
