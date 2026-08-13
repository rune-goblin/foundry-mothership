/**
 * Giving an actor an item, and adding to the one it already carries — the write behind
 * `@Apply[bleeding 2]` and behind every `+N <Condition>` macro a world has imported.
 *
 * Legacy's `modifyItem` resolved the document, branched five ways on its type, and wrote twice:
 * a `createEmbeddedDocuments` followed by an unawaited `update` that set the count on the
 * document it had just created (audit F10). Here the count is part of what gets created, so one
 * awaited write says everything, and what happened comes back as a record for the chat layer to
 * narrate. Nothing in this module reads `game` or renders.
 *
 * `{keepId: true}` on the create call is load-bearing: without it Foundry mints a fresh id for
 * every embedded document, and a Condition's whole identity story (`conditions.ts`'s `isCondition`)
 * depends on the compendium id surviving the grant the way legacy's nine `keepId` call sites kept
 * it alive.
 */

import { CONDITION_IDS, isCondition } from '../conditions.ts';

export interface HeldItem {
  readonly id?: string | null;
  readonly name: string;
  readonly type: string;
  readonly system: unknown;
  update(data: Record<string, unknown>): Promise<unknown>;
}

/** The document being given: a compendium item, or a world one. */
export interface GrantDocument {
  readonly id?: string | null;
  readonly name: string;
  readonly img: string;
  readonly type: string;
  readonly system: unknown;
  toObject(): Record<string, unknown>;
}

export interface GrantTarget {
  readonly items: Iterable<HeldItem>;
  createEmbeddedDocuments(
    type: string,
    data: readonly object[],
    options?: { readonly keepId?: boolean },
  ): Promise<unknown>;
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

/** The slug a Condition's own canonical name identifies — granting one never carries its slug
 * this far, so this is the reverse of the join `conditions.ts`'s map states forward. */
function conditionSlugOf(name: string): string | null {
  for (const [slug, identity] of Object.entries(CONDITION_IDS)) {
    if (identity.name === name) return slug;
  }
  return null;
}

/**
 * Held by name, the way legacy identified "the actor already has this one" — except a Condition,
 * which is held by the identity `isCondition` gives every other reader of one, so a rename or a
 * translation cannot make this module and `checks/actions.ts` disagree about who has what.
 */
export function heldItem(actor: GrantTarget, document: Pick<GrantDocument, 'name' | 'type'>): HeldItem | null {
  const slug = document.type === 'condition' ? conditionSlugOf(document.name) : null;
  if (slug !== null) {
    for (const item of actor.items) if (isCondition(item, slug)) return item;
    return null;
  }
  const wanted = document.name.trim().toLowerCase();
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
  const held = heldItem(actor, document);
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
  // A second copy of a held item must mint its own id — re-sending the held _id would collide.
  await actor.createEmbeddedDocuments('Item', [data], { keepId: held === null });

  return {
    ...identity,
    change: { created: held === null, counted, from: 0, to: counted === null ? 0 : count },
  };
}
