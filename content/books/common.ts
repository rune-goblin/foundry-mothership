export type Modifier = 'advantage' | 'disadvantage';

/** Spelled as `rollCheck` spells them, so nothing translates between catalog and runtime. */
export type RollScope =
  | 'strength'
  | 'speed'
  | 'intellect'
  | 'combat'
  | 'sanity'
  | 'fear'
  | 'body'
  | 'restSave'
  | 'panicCheck';

export interface ScopedModifier {
  modifier: Modifier;
  scope: RollScope;
}

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
