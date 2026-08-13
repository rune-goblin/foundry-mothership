/**
 * Finding the document a setting, a macro or a piece of content names. `fromIdUuid` scanned every
 * compendium on every call and returned `null` on a miss, which the roll path then dereferenced
 * (audit RC8, F18). Here a UUID resolves as a UUID, a bare id is one keyed collection lookup, the
 * compendium scan is the last resort it was always meant to be, and a miss is a value the caller
 * has to read rather than a null that flows on.
 */

import { format } from './i18n.ts';

export type CollectionName =
  | 'Actor'
  | 'Item'
  | 'Macro'
  | 'RollTable'
  | 'JournalEntry'
  | 'Scene'
  | 'Playlist'
  | 'Cards';

/** Where the world keeps each kind of document — the map that makes a bare id an O(1) get. */
const WORLD_COLLECTIONS: Readonly<Record<CollectionName, string>> = {
  Actor: 'actors',
  Item: 'items',
  Macro: 'macros',
  RollTable: 'tables',
  JournalEntry: 'journal',
  Scene: 'scenes',
  Playlist: 'playlists',
  Cards: 'cards',
};

interface WorldCollection {
  get(id: string): unknown;
}

interface CompendiumPack {
  readonly metadata: { readonly id: string; readonly type: string };
  readonly index: { get(id: string): unknown };
  getDocument(id: string): Promise<unknown>;
}

declare const game:
  | ({ readonly packs?: Iterable<CompendiumPack> } & Record<string, unknown>)
  | undefined;

declare const foundry:
  | { readonly utils: { fromUuid(uuid: string): Promise<unknown> } }
  | undefined;

declare const ui: { readonly notifications?: { error(message: string): unknown } } | undefined;

export interface LookupRequest {
  readonly ref: string;
  readonly type: CollectionName;
}

export type Found<T> = { readonly found: true; readonly document: T };
export type Missing = { readonly found: false; readonly request: LookupRequest };
export type LookupResult<T> = Found<T> | Missing;

/** A UUID always names its collection first, so the dot is what tells the two forms apart. */
function isUuid(ref: string): boolean {
  return ref.includes('.');
}

function worldGet(ref: string, type: CollectionName): unknown {
  if (typeof game === 'undefined' || game === undefined) return null;
  const collection = game[WORLD_COLLECTIONS[type]] as WorldCollection | undefined;
  return collection?.get(ref) ?? null;
}

/** The legacy path: content that stored a bare id rather than a UUID still has to be found. */
async function compendiumGet(ref: string, type: CollectionName): Promise<unknown> {
  if (typeof game === 'undefined' || game?.packs === undefined) return null;
  for (const pack of game.packs) {
    if (pack.metadata.type !== type) continue;
    if (pack.index.get(ref) === undefined) continue;
    const document = await pack.getDocument(ref);
    if (document !== null && document !== undefined) return document;
  }
  return null;
}

/**
 * Whether the document found is the kind that was asked for. The keyed and compendium paths pick
 * their collection by type, so they cannot answer with anything else; a UUID names its own
 * collection, and `Actor.xxx` resolved a perfectly good Actor for a caller wanting a RollTable.
 * A document always names itself — a value that does not is a caller's own stub, not a document.
 */
function isType(document: unknown, type: CollectionName): boolean {
  const named = (document as { documentName?: unknown }).documentName;
  return typeof named !== 'string' || named === type;
}

export async function lookup<T>(ref: string, type: CollectionName): Promise<LookupResult<T>> {
  const request: LookupRequest = { ref: String(ref ?? '').trim(), type };
  if (request.ref === '') return { found: false, request };

  const document = isUuid(request.ref)
    ? await (typeof foundry === 'undefined' ? null : (foundry?.utils.fromUuid(request.ref) ?? null))
    : (worldGet(request.ref, type) ?? (await compendiumGet(request.ref, type)));

  return document === null || document === undefined || !isType(document, type)
    ? { found: false, request }
    : { found: true, document: document as T };
}

/** What went missing, in words — the message a caller shows instead of crashing on a null. */
export function describeMiss(request: LookupRequest): string {
  return format('Mosh.Errors.DocumentNotFound', { type: request.type, id: request.ref });
}

export function notifyMiss(request: LookupRequest): void {
  if (typeof ui === 'undefined') return;
  ui?.notifications?.error(describeMiss(request));
}
