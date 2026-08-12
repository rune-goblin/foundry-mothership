export interface Provenance {
  tier: 'local' | 'derived';
  /** Repo-relative path of the file the record was read from. */
  source: string;
  /** The upstream record's own id, where it has one. */
  sourceId?: string;
  book?: string;
  page?: number;
}

export interface ItemBody {
  kind: 'Item';
  type: string;
  system: Record<string, unknown>;
}

export interface MacroBody {
  kind: 'Macro';
  type: 'script' | 'chat';
  scope: 'global' | 'actors' | 'actor';
  command: string;
}

export interface TableResult {
  contentId: string;
  description: string;
  range: [number, number];
  name?: string;
  img?: string;
  weight?: number;
}

export interface TableBody {
  kind: 'RollTable';
  formula: string;
  description?: string;
  replacement?: boolean;
  displayRoll?: boolean;
  results: TableResult[];
}

export type Body = ItemBody | MacroBody | TableBody;

/**
 * The one shape both tiers normalise to. The generator never learns which tier a record came
 * from — `provenance` is carried for the build manifest and is never emitted into a pack.
 */
export interface ContentRecord {
  contentId: string;
  name: string;
  img: string;
  body: Body;
  provenance: Provenance;
}

export interface PackDefinition {
  /** Registry key in `content/ids.json` and the directory name under `packs/_source/`. */
  pack: string;
  compendium: string;
  documentType: 'Item' | 'Macro' | 'RollTable';
  load(root: string): ContentRecord[];
}
