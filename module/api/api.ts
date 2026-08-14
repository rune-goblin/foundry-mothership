/**
 * `game.mothershiprpg` — what a macro, a hotbar button or another module may call. Legacy spread
 * this across the entry module, which was also the boot script, a dialog, a document resolver and
 * a number formatter (audit RC7); here the API is a module of its own that imports downward and
 * registers nothing. `init.ts` is what puts it on `game`.
 *
 * Every verb answers *what* to do; **who to** is one question, answered once. Legacy repeated the
 * same twenty-line read-setting/branch/warn/loop block at five call sites and the shipped content
 * restated it thirteen times more (audit RC6, F24) — so a change to targeting meant a runtime
 * edit in five places plus a content regeneration. `forTargetActors` is that block, stated once
 * and exported, so future content calls the abstraction rather than copying it.
 */

import { registerChatAction } from '../chat/actions.ts';
import { registerCheckActions } from '../checks/actions.ts';
import { type CheckOptions, type CheckOutcome } from '../checks/checks.ts';
import { type TableOptions, type TableResult } from '../checks/tables.ts';
import { SYSTEM_ID } from '../chat/cards.ts';
import { CONDITION_IDS } from '../conditions.ts';
import { debug } from '../debug.ts';
import {
  chooseSave,
  chooseStress,
  chooseWound,
  noCharacter,
  type StressDirection,
} from '../dialogs/prompts.ts';
import { format } from '../i18n.ts';
import { lookup, notifyMiss } from '../lookup.ts';
import { addressOf } from '../mutation/fields.ts';
import type { GrantDocument, GrantResult } from '../mutation/items.ts';
import type { Amount, MutationResult } from '../mutation/mutate.ts';
import type { StatKey } from '../rolls/spec.ts';
import type { TableKey } from '../tables/tables.ts';
import { MothershipActor, type WeaponOptions } from '../documents/actor.ts';
import { MothershipItem } from '../documents/item.ts';

declare const game:
  | {
      readonly settings?: { get(namespace: string, key: string): unknown };
      readonly user?: { readonly character?: unknown };
    }
  | undefined;

declare const canvas:
  | { readonly tokens?: { readonly controlled?: readonly { readonly actor?: unknown }[] } }
  | undefined;

declare const ui: { readonly notifications?: { warn(message: string): unknown } } | undefined;

/** Whose sheet a macro acts on: the user's assigned character, or whatever tokens are selected. */
export type MacroTarget = 'character' | 'token';

export const MACRO_TARGET_KEY = 'macroTarget';
export const MACRO_TARGET_CHOICES: readonly MacroTarget[] = ['character', 'token'];
export const MACRO_TARGET_DEFAULT: MacroTarget = 'character';

export function macroTarget(): MacroTarget {
  const stored = typeof game === 'undefined' ? undefined : game?.settings?.get(SYSTEM_ID, MACRO_TARGET_KEY);
  return MACRO_TARGET_CHOICES.includes(stored as MacroTarget)
    ? (stored as MacroTarget)
    : MACRO_TARGET_DEFAULT;
}

function assignedCharacter(): MothershipActor[] {
  const character = typeof game === 'undefined' ? null : (game?.user?.character ?? null);
  return character === null ? [] : [character as MothershipActor];
}

function controlledActors(): MothershipActor[] {
  const controlled = typeof canvas === 'undefined' ? [] : (canvas?.tokens?.controlled ?? []);
  return controlled
    .map((token) => token.actor)
    .filter((actor): actor is MothershipActor => actor !== null && actor !== undefined);
}

/**
 * The actors this call is aimed at. Nothing selected is not an error — it is a window telling the
 * player which setting decides that and how to satisfy it (divergence R3-3).
 */
export async function targetActors(): Promise<readonly MothershipActor[]> {
  const target = macroTarget();
  const actors = target === 'token' ? controlledActors() : assignedCharacter();

  if (actors.length === 0) {
    await noCharacter(target);
    return [];
  }
  return actors;
}

/**
 * Run one call against every targeted actor, in order, each awaited before the next. Legacy fired
 * them off unawaited inside a `forEach`, so a failure surfaced only as an unhandled rejection
 * (audit RC12).
 */
export async function forTargetActors<T>(
  fn: (actor: MothershipActor) => Promise<T> | T,
): Promise<T[]> {
  const results: T[] = [];
  for (const actor of await targetActors()) results.push(await fn(actor));
  return results;
}

/* -------------------------------------------- */
/*  The verbs                                   */
/* -------------------------------------------- */

export async function rollStat(stat: StatKey, options: CheckOptions = {}): Promise<(CheckOutcome | null)[]> {
  return await forTargetActors((actor) => actor.rollStat(stat, options));
}

/** The stat picker. Legacy published this as `rollStatMacro` and it threw (audit RC5). */
export async function promptCheck(options: CheckOptions = {}): Promise<(CheckOutcome | null)[]> {
  return await forTargetActors((actor) => actor.promptCheck(options));
}

export async function rollSkill(skillId: string, options: CheckOptions = {}): Promise<(CheckOutcome | null)[]> {
  return await forTargetActors((actor) => actor.rollSkill(skillId, options));
}

export async function rollWeapon(itemId: string, options: WeaponOptions = {}): Promise<(CheckOutcome | null)[]> {
  return await forTargetActors((actor) => actor.rollWeapon(itemId, options));
}

export async function rollPanic(options: CheckOptions = {}): Promise<(CheckOutcome | null)[]> {
  return await forTargetActors((actor) => actor.rollPanic(options));
}

export async function rollRestSave(options: CheckOptions = {}): Promise<(CheckOutcome | null)[]> {
  return await forTargetActors((actor) => actor.rollRestSave(options));
}

export async function rollTable(key: TableKey, options: TableOptions = {}): Promise<(TableResult | null)[]> {
  return await forTargetActors((actor) => actor.rollTable(key, options));
}

export async function modify(address: string, amount: Amount): Promise<MutationResult[]> {
  return await forTargetActors((actor) => actor.modify(address, amount));
}

/* -------------------------------------------- */
/*  The verbs that ask first                    */
/* -------------------------------------------- */

/**
 * The three hotbar entry points whose argument is the player's, not the caller's. Each is one
 * prompt from `dialogs/` followed by the verb above it — the 40-to-120-line dialogs those macros
 * used to carry are gone, and the procedure is stated here where a sheet or a module can call it.
 */
export async function promptStress(direction: StressDirection): Promise<MutationResult[]> {
  const amount = await chooseStress(direction);
  return amount === null ? [] : await modify(addressOf('stress'), amount);
}

export async function promptSave(): Promise<(CheckOutcome | null)[]> {
  const chosen = await chooseSave();
  return chosen === null ? [] : await rollStat(chosen.stat, { advantage: chosen.advantage });
}

export async function promptWound(): Promise<(TableResult | null)[]> {
  const chosen = await chooseWound();
  return chosen === null ? [] : await rollTable(chosen.key, { advantage: chosen.advantage });
}

/**
 * The item a hotbar macro names. Legacy cloned the item through `duplicate()` — which keeps `_id`
 * and drops the `id` accessor — and then asked for `item.id`, so every gear, armour, ability and
 * condition macro threw instead of posting its card (audit RC3). The document is passed whole,
 * and the warning comes before the dereference, not after it (RC4).
 */
export async function rollItem(itemName: string): Promise<unknown[]> {
  return await forTargetActors(async (actor) => {
    const item = itemNamed(actor, itemName);
    if (item === null) {
      if (typeof ui !== 'undefined') {
        ui?.notifications?.warn(format('Mothership.Errors.NoItemNamed', { actor: actor.name, name: itemName }));
      }
      return null;
    }
    if (item.id === null) return null;

    if (item.type === 'weapon') return await actor.rollWeapon(item.id);
    if (item.type === 'skill') return await actor.rollSkill(item.id);
    return await actor.printDescription(item.id);
  });
}

export function itemNamed(actor: MothershipActor, name: string): MothershipItem | null {
  const wanted = String(name ?? '').trim().toLowerCase();
  for (const item of actor.items) {
    if (item.name.trim().toLowerCase() === wanted) return item;
  }
  return null;
}

/**
 * `@Apply[coward]`'s half of the identity the tables already have (audit C2, RC13) — `../conditions.ts`
 * is the one leaf both this module and `checks/actions.ts` read it from, rather than the two-file
 * cycle importing it from here created.
 */
export function conditionRef(condition: string): string {
  return CONDITION_IDS[condition]?.id ?? condition;
}

/** Give every targeted actor a condition — or another N of it, if they already have it. */
export async function applyCondition(condition: string, count = 1): Promise<GrantResult[]> {
  const ref = conditionRef(condition);
  const found = await lookup<GrantDocument>(ref, 'Item');
  if (!found.found) {
    notifyMiss(found.request);
    return [];
  }
  return await forTargetActors((actor) => actor.applyItem(found.document, count));
}

/* -------------------------------------------- */
/*  Registration                                */
/* -------------------------------------------- */

/**
 * Bind the four action verbs to the services, all aimed by the same resolver the macros use. One
 * targeting decision serves macros, sheets and the buttons enriched text renders.
 */
export function registerActions(): void {
  registerCheckActions(targetActors);
  registerChatAction('apply', async (action) => {
    debug('action', `apply ${action.condition} ×${action.count}`);
    await applyCondition(action.condition, action.count);
  });
}

export const NEW_API = {
  MothershipActor,
  MothershipItem,
  rollStat,
  promptCheck,
  rollSkill,
  rollWeapon,
  rollItem,
  rollPanic,
  rollRestSave,
  rollTable,
  modify,
  promptStress,
  promptSave,
  promptWound,
  applyCondition,
  forTargetActors,
  targetActors,
} as const;
