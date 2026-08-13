import type { EvaluatedRoll } from '../rolls/resolve.ts';
import { WOUND_ROLLOVER } from '../rules.ts';
import {
  parseFieldAddress,
  resolveField,
  updateData,
  type Bounds,
  type FieldAddress,
  type FieldChange,
  type FieldRef,
} from './address.ts';

export type Bound = 'floor' | 'ceiling';

export interface ChangePlan {
  readonly from: number;
  readonly to: number;
  /** How far the field actually moved. */
  readonly applied: number;
  /** What the bounds refused, signed like the change. */
  readonly overflow: number;
  /** Which bound the result sits on, so the card can tell hitting one from being pushed past it. */
  readonly bound: Bound | null;
}

/** Clamp a change to the pod's own bounds, reporting what would not fit. */
export function planChange(from: number, amount: number, bounds: Bounds): ChangePlan {
  const wanted = from + amount;
  const floored = bounds.min !== null && wanted < bounds.min ? bounds.min : wanted;
  const to = bounds.max !== null && floored > bounds.max ? bounds.max : floored;
  const applied = to - from;

  return {
    from,
    to,
    applied,
    overflow: amount - applied,
    bound:
      bounds.min !== null && to === bounds.min
        ? 'floor'
        : bounds.max !== null && to === bounds.max
          ? 'ceiling'
          : null,
  };
}

export interface WoundChange {
  readonly from: number;
  readonly to: number;
}

export interface HealthPlan extends ChangePlan {
  /**
   * The wound track before and after. `applied` stays the health delta, so it does not account
   * for the damage the wounds absorbed — `amount` and this pair together do.
   */
  readonly wounds: WoundChange | null;
  /** Damage arriving with no Wound left to spend; `overflow` says how much went unabsorbed. */
  readonly dead: boolean;
}

/** A pod as the arithmetic reads it: a number and whatever bounds it declares. */
export interface Tracked {
  readonly value: number;
  readonly bounds: Bounds;
}

/**
 * PSG 28 — damage that empties the Health bar costs a Wound, and the surplus carries into the
 * refilled bar; a hit worth more than a bar keeps going until the Wounds run out. Taking the
 * last Wound is survivable, the one past it is not.
 */
export function planHealthChange(health: Tracked, wounds: Tracked, amount: number): HealthPlan {
  const plan = planChange(health.value, amount, health.bounds);
  const floor = health.bounds.min;
  const full = health.bounds.max;
  const cap = wounds.bounds.max;

  if (amount >= 0 || floor === null || full === null || cap === null || plan.to !== floor) {
    return { ...plan, wounds: null, dead: false };
  }

  let remaining = -plan.overflow;
  let taken = 0;
  let value = floor;
  let dead = false;

  for (;;) {
    if (wounds.value + taken >= cap) {
      dead = true;
      break;
    }
    taken += WOUND_ROLLOVER;
    const refilled = full - remaining;
    if (refilled > floor) {
      value = refilled;
      remaining = 0;
      break;
    }
    remaining = floor - refilled;
  }

  return {
    ...plan,
    to: value,
    applied: value - plan.from,
    overflow: dead ? -remaining : 0,
    bound: value === floor ? 'floor' : value === full ? 'ceiling' : null,
    wounds: taken === 0 ? null : { from: wounds.value, to: wounds.value + taken },
    dead,
  };
}

/** What a mutation changes by, as a caller states it: a flat number, or dice to roll for it. */
export type Amount =
  | { readonly kind: 'amount'; readonly amount: number }
  | { readonly kind: 'roll'; readonly dice: string };

/** The same change once the dice have been rolled — what this module applies. */
export type Change =
  | { readonly kind: 'amount'; readonly amount: number }
  | { readonly kind: 'roll'; readonly roll: EvaluatedRoll };

/**
 * What the change is worth. A roll contributes Foundry's own arithmetic — `2d10+1` sums, `-1d10`
 * is negative — not the kept die an `Outcome` reports, which is a rule about checks, not damage.
 */
export function changeAmount(change: Change): number {
  return change.kind === 'amount' ? change.amount : Number(change.roll.total) || 0;
}

/**
 * The document surface a mutation needs. It reads `toObject()` rather than `system` because
 * derivation rewrites `system` in place — a swarm creature's Combat is multiplied there — and
 * adding to a derived number would persist the derivation.
 */
export interface MutableDocument {
  toObject(): { readonly system: unknown };
  update(data: Record<string, number>): Promise<unknown>;
}

export interface MutatedField {
  readonly address: FieldAddress;
  readonly label: string | null;
  readonly from: number;
  readonly to: number;
}

/** What the mutation did, for the chat layer to narrate. No strings of its own, no rendering. */
export interface MutationResult {
  readonly amount: number;
  readonly roll: EvaluatedRoll | null;
  readonly field: MutatedField;
  readonly wounds: MutatedField | null;
  readonly overflow: number;
  readonly bound: Bound | null;
  readonly dead: boolean;
}

const HEALTH = 'system.health.value';
/** The wound track is stored as `hits` and labelled Wounds — the schema's name, not the book's. */
const WOUNDS = 'system.hits.value';

function mutated(field: FieldRef, change: WoundChange): MutatedField {
  return { address: field.address, label: field.label, from: change.from, to: change.to };
}

/**
 * The one mutation engine: resolve the amount, clamp it, roll health into wounds, and write the
 * result as a single awaited update (audit F7, F10). It never reads `game`, renders nothing, and
 * posts nothing — the returned record is what the chat layer narrates.
 */
export async function mutate(
  doc: MutableDocument,
  address: string,
  change: Change,
): Promise<MutationResult> {
  const system = doc.toObject().system;
  const field = resolveField(system, parseFieldAddress(address));
  const amount = changeAmount(change);

  const wounds = field.address.path === HEALTH ? resolveField(system, parseFieldAddress(WOUNDS)) : null;
  const plan: HealthPlan =
    wounds === null
      ? { ...planChange(field.value, amount, field.bounds), wounds: null, dead: false }
      : planHealthChange(field, wounds, amount);

  const changes: FieldChange[] = [{ path: field.address.path, from: plan.from, to: plan.to }];
  if (wounds !== null && plan.wounds !== null) {
    changes.push({ path: wounds.address.path, from: plan.wounds.from, to: plan.wounds.to });
  }
  await doc.update(updateData(changes));

  return {
    amount,
    roll: change.kind === 'roll' ? change.roll : null,
    field: mutated(field, plan),
    wounds: wounds === null || plan.wounds === null ? null : mutated(wounds, plan.wounds),
    overflow: plan.overflow,
    bound: plan.bound,
    dead: plan.dead,
  };
}
