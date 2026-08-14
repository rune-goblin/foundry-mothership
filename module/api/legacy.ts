/**
 * The shim. The 104 shipped macros are generated from `content/books/psg/macros.ts` — we own both
 * sides of those and they regenerate onto the new API — so the only compatibility surface that
 * matters is **copies users have already imported into worlds and hotbars**. Those call these
 * seven functions with these exact positional signatures, and dotted field addresses as strings.
 *
 * This module is the one place old shapes survive: each maps onto the new API through
 * `forTargetActors`, each logs one deprecation, and `test/api-legacy.test.ts` pins every name and
 * arity so the shim cannot drift away from what a world already holds. It stays for one release
 * cycle past the swap; removing it is a later, deliberate decision.
 */

import { deprecated } from '../debug.ts';
import { legacyAmount, type WeaponOptions } from '../documents/actor.ts';
import { noCharacter } from '../dialogs/prompts.ts';
import { format } from '../i18n.ts';
import { notifyMiss } from '../lookup.ts';
import { parseRollSpec } from '../rolls/parse.ts';
import type { Advantage, StatKey } from '../rolls/spec.ts';
import { TABLE_KEYS, TABLES, tableId as configuredTableId, type TableKey } from '../tables/tables.ts';
import {
  applyCondition,
  forTargetActors,
  itemNamed,
  macroTarget,
  promptCheck,
  rollItem,
} from './api.ts';

/** The stats a legacy macro could name, plus the two roll kinds it named the same way. */
const STAT_KEYS: readonly StatKey[] = [
  'strength',
  'speed',
  'intellect',
  'combat',
  'sanity',
  'fear',
  'body',
  'instinct',
  'loyalty',
];

const REST_SAVE = 'restSave';
const DAMAGE = 'damage';
/** Legacy's one table sentinel: the id argument that meant "not an id" (audit F2). */
const PANIC = 'panicCheck';

/** A roll string states the modifier; no roll string at all means the dialog still has to ask. */
function advantageOf(rollString: string | null | undefined): Advantage | null {
  return rollString === null || rollString === undefined || String(rollString).trim() === ''
    ? null
    : parseRollSpec(String(rollString), 'low').advantage;
}

/**
 * Which of the seven tables a document id names — the GM's current choice first, the shipped
 * default second. A macro naming anything else gets the missing-document notice rather than a
 * roll on a table this system has no rules for.
 */
export function tableKeyOf(ref: string): TableKey | null {
  const wanted = String(ref ?? '').trim();
  if (wanted === '') return null;
  for (const key of TABLE_KEYS) {
    if (configuredTableId(key) === wanted || TABLES[key].id === wanted) return key;
  }
  return null;
}

declare const ui: { readonly notifications?: { warn(message: string): unknown } } | undefined;

/** An argument this system has no reading for. Said once, and nothing is rolled instead. */
function unknownArgument(argument: string): void {
  if (typeof ui === 'undefined') return;
  ui?.notifications?.warn(format('Mothership.Errors.UnknownArgument', { argument }));
}

function idOf(value: unknown): string | null {
  const fields = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
  const id = fields._id ?? fields.id;
  return typeof id === 'string' && id !== '' ? id : null;
}

export function rollItemMacro(itemName: string): Promise<unknown> {
  deprecated('game.mothershiprpg.rollItemMacro', 'game.mothershiprpg.rollItem');
  return rollItem(itemName);
}

/** Legacy's version called a method that was defined nowhere, so it threw (audit RC5). */
export function rollStatMacro(): Promise<unknown> {
  deprecated('game.mothershiprpg.rollStatMacro', 'game.mothershiprpg.promptCheck');
  return promptCheck();
}

export async function initRollTable(
  tableId: string,
  rollString: string | null,
  aimFor: string | null,
  zeroBased: boolean | null,
  checkCrit: boolean | null,
  rollAgainst: string | null,
  comparison: string | null,
): Promise<void> {
  deprecated('game.mothershiprpg.initRollTable', 'game.mothershiprpg.rollTable');
  const advantage = advantageOf(rollString);

  if (String(tableId) === PANIC) {
    await forTargetActors((actor) => actor.rollPanic({ advantage }));
    return;
  }

  const key = tableKeyOf(tableId);
  if (key === null) {
    notifyMiss({ ref: String(tableId ?? ''), type: 'RollTable' });
    return;
  }
  await forTargetActors((actor) => actor.rollTable(key, { advantage }));
}

/**
 * Legacy read `attribute` three ways — a stat key, and two words that were not stats at all —
 * and the shape of the call is what decided which (audit F14). That reading happens once, here,
 * before any actor is touched: an argument this system cannot honour is one message, not one per
 * selected token.
 */
export async function initRollCheck(
  rollString: string | null,
  aimFor: string | null,
  attribute: string | null,
  skill: string | null,
  skillValue: number | null,
  weapon: unknown,
): Promise<void> {
  deprecated('game.mothershiprpg.initRollCheck', 'game.mothershiprpg.rollStat');
  const advantage = advantageOf(rollString);
  const damage = attribute === DAMAGE;

  if (damage || (weapon !== null && weapon !== undefined)) {
    const itemId = idOf(weapon);
    if (itemId === null) return unknownArgument('weapon');
    const options: WeaponOptions = damage ? { roll: 'damage', advantage } : { advantage };
    await forTargetActors((actor) => actor.rollWeapon(itemId, options));
    return;
  }

  if (attribute === REST_SAVE) {
    await forTargetActors((actor) => actor.rollRestSave({ advantage }));
    return;
  }

  if (attribute !== null && attribute !== undefined && attribute !== '') {
    if (!STAT_KEYS.includes(attribute as StatKey)) return unknownArgument(attribute);
    await forTargetActors((actor) => actor.rollStat(attribute as StatKey, { advantage }));
    return;
  }

  // A skill was named by *name*, which is all a macro ever had to name it with.
  if (skill !== null && skill !== undefined && skill !== '') {
    await forTargetActors(async (actor) => {
      const item = itemNamed(actor, skill);
      if (item === null || item.id === null) {
        notifyMiss({ ref: skill, type: 'Item' });
        return null;
      }
      return await actor.rollSkill(item.id, { advantage });
    });
    return;
  }

  await forTargetActors((actor) => actor.promptCheck({ advantage }));
}

export async function initModifyActor(
  fieldAddress: string,
  modValue: number | null,
  modRollString: string | null,
  outputChatMsg: boolean,
): Promise<void> {
  deprecated('game.mothershiprpg.initModifyActor', 'game.mothershiprpg.modify');
  const amount = legacyAmount(modValue, modRollString);

  await forTargetActors((actor) =>
    actor.modify(fieldAddress, amount, { message: outputChatMsg !== false }),
  );
}

export async function initModifyItem(itemId: string, addAmount: number): Promise<void> {
  deprecated('game.mothershiprpg.initModifyItem', 'game.mothershiprpg.applyCondition');
  const count = Number(addAmount);
  await applyCondition(itemId, Number.isFinite(count) ? count : 1);
}

export async function noCharSelected(): Promise<void> {
  deprecated('game.mothershiprpg.noCharSelected', 'game.mothershiprpg.forTargetActors');
  await noCharacter(macroTarget());
}

export const LEGACY_API = {
  rollItemMacro,
  rollStatMacro,
  initRollTable,
  initRollCheck,
  initModifyActor,
  initModifyItem,
  noCharSelected,
} as const;
