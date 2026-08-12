export interface SourceRef {
  /** Repo-relative path of the dataset the record was read from. */
  source: string;
  /** The dataset record's own id, where it has one. */
  sourceId?: string;
  page?: number;
}

/** A `SourceRef` with the book stamped on by the pipeline, so a loader cannot get it wrong. */
export interface Provenance extends SourceRef {
  book: string;
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
  range: readonly [number, number];
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
 * The one shape every book normalises to. The emitter never learns which book a record came
 * from — `provenance` is carried for the build manifest and is never emitted into a pack.
 */
export interface ContentRecord {
  contentId: string;
  name: string;
  img: string;
  body: Body;
  provenance: SourceRef;
}

export interface PackDefinition {
  /** Registry key in `content/ids.json` and the directory name under `packs/_source/`. */
  pack: string;
  compendium: string;
  documentType: 'Item' | 'Macro' | 'RollTable';
  /** Reads the book's typed catalogs — imports, not the filesystem — and normalises them. */
  load(): ContentRecord[];
}
