/**
 * The actor as a roll reads it, and the small readings every flow in `checks/` shares. The
 * document itself stays Foundry's; this is the surface the services need, written down so a test
 * can supply one and a change to it is a compile error rather than a `undefined is not an object`
 * halfway through a roll.
 *
 * Checks read the **derived** `system`: armour, the swarm multiplier and the condition tally are
 * derivation's work, and they are exactly what a check must be judged against. Mutations read
 * `toObject().system` instead (divergence R1-4) — the two are deliberately different.
 */

import type { CardSource, Speaker, Voice } from '../chat/cards.ts';
import { voiceOf } from '../chat/cards.ts';
import type { ItemCard } from '../documents/item.ts';
import type { FireOutcome, ReloadOutcome } from '../inventory/ammo.ts';
import type { MutableDocument } from '../mutation/mutate.ts';
import { isSkillRank, rankBonus, skillRank, storedRank } from '../rules.ts';
import { isRobotic } from '../tables/tables.ts';

/** An embedded item, as `documents/item.ts` implements it. */
export interface CheckItem {
  readonly id: string | null;
  readonly name: string;
  readonly img: string;
  readonly type: string;
  readonly system: unknown;
  fire(): Promise<FireOutcome>;
  reload(): Promise<ReloadOutcome>;
  toChat(): ItemCard;
}

export interface ItemCollection extends Iterable<CheckItem> {
  get(id: string): CheckItem | undefined;
}

export interface CheckActor extends MutableDocument {
  readonly id: string | null;
  readonly name: string;
  readonly img: string;
  readonly type: string;
  readonly system: unknown;
  readonly items: ItemCollection;
  /** The token this actor was rolled from, when it was rolled from one. */
  readonly token?: { readonly id?: string | null } | null;
}

export const CHARACTER = 'character';

function fields(value: unknown): Record<string, unknown> {
  return (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
}

function number(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function cardSource(actor: CheckActor): CardSource {
  return { actorId: actor.id, actorImg: actor.img, tokenId: actor.token?.id ?? null };
}

export function speakerOf(actor: CheckActor): Speaker {
  return { actor: actor.id, token: actor.token?.id ?? null, alias: actor.name };
}

export function voiceOfActor(actor: CheckActor): Voice {
  return voiceOf(isRobotic(actor));
}

/** A stat as a check reads it: the number to beat, and the two names the card prints. */
export interface StatValue {
  readonly key: string;
  readonly value: number;
  readonly mod: number;
  readonly label: string;
  readonly rollLabel: string;
}

export function statOf(system: unknown, key: string): StatValue | null {
  const stats = fields(fields(system).stats);
  if (!Object.hasOwn(stats, key)) return null;

  const stat = fields(stats[key]);
  return {
    key,
    value: number(stat.value),
    mod: number(stat.mod),
    label: text(stat.label) || key,
    rollLabel: text(stat.rollLabel) || key,
  };
}

/** PSG 20 — the number a Panic Check is rolled against. */
export function stressOf(system: unknown): number {
  return number(fields(fields(fields(system).other).stress).value);
}

/**
 * PSG 22 — what a skill adds is decided by its rank. `system.bonus` holds the same number
 * denormalized (`item-models.js` initializes it from the rank and the new-skill dialog writes
 * both), so it is the fallback for a rank the book does not name, not a second opinion.
 */
export function skillBonus(system: unknown): number {
  const skill = fields(system);
  const rank = text(skill.rank);
  return isSkillRank(rank) ? rankBonus(rank) : number(skill.bonus);
}

/**
 * The word the book gives this skill's bonus, for the window that names the rank beside it. A rank
 * the book does not name has no word — the bonus stands on its own rather than inventing one.
 */
export function skillRankWord(system: unknown): string | null {
  const stored = text(fields(system).rank);
  return isSkillRank(stored) ? storedRank(skillRank(stored)) : null;
}

export function isCharacter(actor: CheckActor): boolean {
  return actor.type === CHARACTER;
}
