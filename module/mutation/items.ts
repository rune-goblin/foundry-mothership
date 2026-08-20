import { CONDITION_IDS, isCondition } from '../conditions.ts';

export interface HeldItem {
  readonly id?: string | null;
  readonly name: string;
  readonly type: string;
  readonly system: unknown;
  update(data: Record<string, unknown>): Promise<unknown>;
}

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

// null (a type absent here) means counted by holding another one, not by a field.
const COUNTED: Readonly<Record<string, 'quantity' | 'severity'>> = {
  item: 'quantity',
  condition: 'severity',
};

export type CountedField = 'quantity' | 'severity';

export interface GrantChange {
  readonly created: boolean;
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

// Reverses the name -> slug join conditions.ts states forward, since a grant carries only the name.
function conditionSlugOf(name: string): string | null {
  for (const [slug, identity] of Object.entries(CONDITION_IDS)) {
    if (identity.name === name) return slug;
  }
  return null;
}

// Held by name, except a Condition, which is matched by isCondition's identity so a rename or
// translation can't make this module and checks/actions.ts disagree about who has what.
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
  // keepId only on a first grant: Condition identity (isCondition) depends on the compendium
  // id surviving, but a second copy must mint its own or collide with the held one.
  await actor.createEmbeddedDocuments('Item', [data], { keepId: held === null });

  return {
    ...identity,
    change: { created: held === null, counted, from: 0, to: counted === null ? 0 : count },
  };
}
