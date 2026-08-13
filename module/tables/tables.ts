/**
 * The seven tables the system rolls on, as data. Legacy dispatched on the table's *display name*
 * — `tableName.slice(-5) === 'Wound'`, `tableName === 'Panic Check'` — so renaming a table, or
 * translating one, silently changed the game (audit F13). Here identity is a `TableKey`: the
 * settings key a GM can repoint, the id the content pipeline minted, the die the book gives it,
 * and whether it costs a Wound. Nothing downstream reads a name.
 *
 * The ids are the ones `content/ids.json` holds — `test/tables.test.ts` re-derives every one of
 * them from that registry, so a re-minted id fails CI instead of breaking panic rolls in every
 * world running on the defaults (audit RC13). They are written out here rather than imported
 * because the runtime does not import the content pipeline's artifacts, and because the registry
 * is 38 KB of bookkeeping no player needs shipped.
 */

import { lookup, type LookupResult } from '../lookup.ts';
import { parseRollSpec, themed, toFormula } from '../rolls/parse.ts';
import { resolveOutcome, type EvaluatedRoll, type Outcome } from '../rolls/resolve.ts';
import { CHECK_SEMANTICS, type Advantage, type CheckKind, type RollSpec } from '../rolls/spec.ts';
import { ANDROID_PANIC_RESULT, DEATH_DIE, PANIC_DIE, WOUND_DIE } from '../rules.ts';

export type TableKey =
  | 'panic'
  | 'death'
  | 'bleeding'
  | 'blunt-force'
  | 'fire-explosives'
  | 'gore-massive'
  | 'gunshot';

export interface TableDefinition {
  readonly key: TableKey;
  /** The world setting naming the document, so a GM can point the system at their own table. */
  readonly setting: string;
  /** The record in `content/ids.json`, and the id that registry minted for it. */
  readonly contentId: string;
  readonly id: string;
  /** What the system rolls — not the table's own `formula`, which is the printed row number. */
  readonly die: string;
  /** PSG 29.1 — rolling on a Wound table is what taking a Wound means. */
  readonly wound: boolean;
}

const define = (
  key: TableKey,
  setting: string,
  contentId: string,
  id: string,
  die: string,
  wound: boolean,
): TableDefinition => ({ key, setting, contentId, id, die, wound });

export const TABLES: Readonly<Record<TableKey, TableDefinition>> = {
  panic: define('panic', 'table1ePanicStressNormal', 'panic-check-stress-normal', 'ypcoikqHLhnc9tNs', PANIC_DIE, false),
  death: define('death', 'table1eDeath', 'death-save', 'W36WFIpCfMknKgHy', DEATH_DIE, false),
  bleeding: define('bleeding', 'table1eWoundBleeding', 'bleeding-wound', 'ata3fRz3uoPfNCLh', WOUND_DIE, true),
  'blunt-force': define('blunt-force', 'table1eWoundBluntForce', 'blunt-force-wound', '31YibfjueXuZdNLb', WOUND_DIE, true),
  'fire-explosives': define('fire-explosives', 'table1eWoundFireExplosives', 'fire-explosives-wound', 'lqiaWwh5cGcJhvnu', WOUND_DIE, true),
  'gore-massive': define('gore-massive', 'table1eWoundGoreMassive', 'gore-massive-wound', 'uVfC1CqYdojaJ7yR', WOUND_DIE, true),
  gunshot: define('gunshot', 'table1eWoundGunshot', 'gunshot-wound', 'XjDU2xFOWEasaZK0', WOUND_DIE, true),
};

export const TABLE_KEYS: readonly TableKey[] = Object.keys(TABLES) as TableKey[];

export const WOUND_TABLE_KEYS: readonly TableKey[] = TABLE_KEYS.filter((key) => TABLES[key].wound);

export function isTableKey(value: string): value is TableKey {
  return Object.hasOwn(TABLES, value);
}

/** The seven hidden settings, defaults included — the shape `settings.ts` registers from. */
export function tableSettings(): readonly { key: TableKey; setting: string; default: string }[] {
  return TABLE_KEYS.map((key) => ({ key, setting: TABLES[key].setting, default: TABLES[key].id }));
}

declare const game:
  | { readonly settings?: { get(namespace: string, key: string): unknown } }
  | undefined;

const NAMESPACE = 'mothershiprpg';

/** Which document a key names right now: the GM's choice if there is one, the shipped table if not. */
export function tableId(key: TableKey): string {
  const stored =
    typeof game === 'undefined' ? null : (game?.settings?.get(NAMESPACE, TABLES[key].setting) ?? null);
  return typeof stored === 'string' && stored.trim() !== '' ? stored.trim() : TABLES[key].id;
}

/** The part of a `RollTable` this reads. Nothing here writes to it or draws through Foundry. */
export interface TableDocument {
  readonly name: string;
  readonly img: string;
  readonly formula: string;
  getResultsForRoll(value: number): readonly TableResultDocument[];
}

interface TableResultDocument {
  readonly _id?: string | null;
  readonly type?: string | number;
  readonly img?: string;
  readonly description?: string;
  readonly documentUuid?: string | null;
  readonly range?: readonly number[];
}

export function resolveTable(key: TableKey): Promise<LookupResult<TableDocument>> {
  return lookup<TableDocument>(tableId(key), 'RollTable');
}

/** A Panic Check is judged against Stress; every other table is a lookup, so it judges nothing. */
export function tableCheckKind(key: TableKey | null): CheckKind {
  return key === 'panic' ? 'panic' : 'table';
}

/** The roll a key asks for, aimed the way that table is read — the caller only picks the odds. */
export function tableSpec(key: TableKey, advantage: Advantage = 'none'): RollSpec {
  const semantics = CHECK_SEMANTICS[tableCheckKind(key)];
  return { ...parseRollSpec(TABLES[key].die, semantics.aim), advantage };
}

export type RowType = 'text' | 'document' | 'unknown';

export interface TableRow {
  readonly _id: string | null;
  readonly type: RowType;
  readonly img: string;
  readonly description: string;
  readonly documentUuid: string | null;
  readonly range: readonly [number, number] | null;
}

/** The evaluated Foundry `Roll`: what `rolls/` reads of it, plus the one method chat posts with. */
export interface RollDocument extends EvaluatedRoll {
  toMessage(data: object, options?: object): Promise<unknown>;
}

export interface TableDraw {
  readonly key: TableKey | null;
  readonly name: string;
  readonly img: string;
  readonly outcome: Outcome;
  readonly rows: readonly TableRow[];
  /** The type of the first row, which is what the card branches on. */
  readonly rowType: RowType;
  readonly wound: boolean;
  /** The evaluated roll, for the chat layer to post so the dice animate. */
  readonly roll: RollDocument;
}

export interface RollOnTableOptions {
  readonly key: TableKey | null;
  readonly spec: RollSpec;
  /** What the roll is judged against — a Panic Check's Stress. A lookup table has none. */
  readonly target?: number | null;
  readonly robotic?: boolean;
  /** A Dice So Nice colorset for the dice this table is rolled with; the card shows the plain spec. */
  readonly colorset?: string;
}

declare const Roll: new (formula: string) => { evaluate(): Promise<RollDocument> };

/**
 * PSG 21.1 — result 19 names both outcomes in one row, and only one of them happened. The content
 * pipeline wraps each half in a `data-mosh-voice` span (`scripts/content/books/psg/tables.ts`); a
 * translated row carries the same markers, so this selects by structure rather than by matching
 * the current locale's English against baked-in text (audit-adjacent — the old version only ever
 * matched a world running in English).
 */
const VOICE = /<span data-mosh-voice="(human|android)">(.*?)<\/span>/g;

export function androidSubstitution(description: string, robotic: boolean, roll: number): string {
  if (roll !== ANDROID_PANIC_RESULT) return description;
  const wanted = robotic ? 'android' : 'human';
  return description.replace(VOICE, (_match, voice: string, text: string) => (voice === wanted ? text : ''));
}

function rowType(type: string | number | undefined): RowType {
  if (type === 0 || type === 'text') return 'text';
  if (type === 1 || type === 'document') return 'document';
  return 'unknown';
}

function range(value: readonly number[] | undefined): readonly [number, number] | null {
  return value === undefined || value.length < 2 ? null : [value[0], value[1]];
}

/**
 * Roll the table and read the row it lands on. The evaluation goes through `rolls/`, so a table
 * roll is judged by the same code every other roll is; the result is a record, and applying what
 * the row says — a Wound, a Condition — belongs to the caller.
 */
export async function rollOnTable(
  table: TableDocument,
  options: RollOnTableOptions,
): Promise<TableDraw> {
  const kind = tableCheckKind(options.key);
  const semantics = CHECK_SEMANTICS[kind];
  const roll = await new Roll(themed(toFormula(options.spec), options.colorset ?? '')).evaluate();

  const outcome = resolveOutcome(roll, {
    spec: options.spec,
    kind,
    target: options.target ?? null,
    comparison: semantics.comparison,
    crits: semantics.crits,
    zeroBased: semantics.zeroBased,
    autoFail: semantics.autoFail,
  });

  const robotic = options.robotic === true;
  const rows: TableRow[] = table.getResultsForRoll(outcome.total).map((result) => ({
    _id: result._id ?? null,
    type: rowType(result.type),
    img: result.img ?? '',
    description:
      options.key === 'panic'
        ? androidSubstitution(result.description ?? '', robotic, outcome.total)
        : (result.description ?? ''),
    documentUuid: result.documentUuid ?? null,
    range: range(result.range),
  }));

  return {
    key: options.key,
    name: table.name,
    img: table.img,
    outcome,
    rows,
    rowType: rows[0]?.type ?? 'unknown',
    wound: options.key === null ? false : TABLES[options.key].wound,
    roll,
  };
}

/** The class whose members are machines. The flag on the class item is the real answer. */
const ANDROID_CLASS = 'android';

interface ActorLike {
  readonly type?: string;
  readonly system?: unknown;
  readonly items?: Iterable<{ readonly type?: string; readonly system?: unknown }>;
}

/**
 * Whether this actor reads its Panic result as a machine. Creatures have no class at all, which
 * is what made a creature rolling a 19 throw (audit F22): the answer for them is no, not a
 * missing field. A character answers with its class item's `robotic` flag; a character whose
 * class was applied as data rather than as an item falls back to the stored class name, which is
 * the only thing such a sheet knows. R4 should embed the class item so that fallback can go.
 */
export function isRobotic(actor: unknown): boolean {
  const doc = (typeof actor === 'object' && actor !== null ? actor : {}) as ActorLike;
  if (doc.type !== 'character') return false;

  for (const item of doc.items ?? []) {
    if (item.type !== 'class') continue;
    return (item.system as { robotic?: unknown } | undefined)?.robotic === true;
  }

  const stored = (doc.system as { class?: { value?: unknown } } | undefined)?.class?.value;
  return typeof stored === 'string' && stored.trim().toLowerCase() === ANDROID_CLASS;
}
