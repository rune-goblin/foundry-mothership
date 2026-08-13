/**
 * Giving an actor an item, and adding to the one it already carries — the write behind
 * `@Apply[bleeding 2]` and behind every `+N <Condition>` macro a world has imported.
 *
 * Legacy's `modifyItem` resolved the document, branched five ways on its type, and wrote twice:
 * a `createEmbeddedDocuments` followed by an unawaited `update` that set the count on the
 * document it had just created (audit F10). Here the count is part of what gets created, so one
 * awaited write says everything, and what happened comes back as a record for the chat layer to
 * narrate. Nothing in this module reads `game` or renders.
 */

export interface HeldItem {
  readonly name: string;
  readonly type: string;
  readonly system: unknown;
  update(data: Record<string, unknown>): Promise<unknown>;
}

/** The document being given: a compendium item, or a world one. */
export interface GrantDocument {
  readonly name: string;
  readonly img: string;
  readonly type: string;
  readonly system: unknown;
  toObject(): Record<string, unknown>;
}

export interface GrantTarget {
  readonly items: Iterable<HeldItem>;
  createEmbeddedDocuments(type: string, data: readonly object[]): Promise<unknown>;
}

/** The field each type counts in. Anything else is counted by holding another one. */
const COUNTED: Readonly<Record<string, 'quantity' | 'severity'>> = {
  item: 'quantity',
  condition: 'severity',
};

export type CountedField = 'quantity' | 'severity';

export interface GrantChange {
  /** Whether the actor was given the item, or already had the one that changed. */
  readonly created: boolean;
  /** The field that counts it, or `null` for a type counted by holding another one. */
  readonly counted: CountedField | null;
  readonly from: number;
  readonly to: number;
}

export interface GrantResult {
  readonly name: string;
  readonly img: string;
  readonly type: string;
  readonly change: GrantChange;
}

function fields(value: unknown): Record<string, unknown> {
  return (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
}

function number(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Held by name, the way legacy identified "the actor already has this one". */
export function heldItem(actor: GrantTarget, name: string): HeldItem | null {
  const wanted = name.trim().toLowerCase();
  for (const item of actor.items) {
    if (item.name.trim().toLowerCase() === wanted) return item;
  }
  return null;
}

export async function grantItem(
  actor: GrantTarget,
  document: GrantDocument,
  count: number,
): Promise<GrantResult> {
  const held = heldItem(actor, document.name);
  const counted = COUNTED[document.type] ?? null;
  const identity = { name: document.name, img: document.img, type: document.type };

  if (held !== null && counted !== null) {
    const from = number(fields(held.system)[counted]);
    const to = from + count;
    await held.update({ [`system.${counted}`]: to });
    return { ...identity, change: { created: false, counted, from, to } };
  }

  const data = document.toObject();
  if (counted !== null) data.system = { ...fields(data.system), [counted]: count };
  await actor.createEmbeddedDocuments('Item', [data]);

  return {
    ...identity,
    change: { created: held === null, counted, from: 0, to: counted === null ? 0 : count },
  };
}
