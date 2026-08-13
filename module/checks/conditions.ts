/**
 * What an actor's conditions have to say about one named roll (§34). Only the roll a condition
 * names counts — Nightmares reaches a Rest Save and nothing else, which is how the book states
 * it — and opposed modifiers cancel to a normal roll. The answer preselects a dialog button
 * rather than forcing the roll, so the table's call always wins.
 */

import type { CheckScope } from '../chat/enrichers.ts';
import { format } from '../i18n.ts';
import type { Advantage } from '../rolls/spec.ts';

export type ConditionAdvantage = Exclude<Advantage, 'none'>;

export interface ConditionItem {
  readonly type?: string;
  readonly name?: string;
  readonly system?: unknown;
}

export interface ConditionModifier {
  readonly advantage: ConditionAdvantage;
  readonly names: readonly string[];
}

interface ModifierEntry {
  readonly modifier?: string;
  readonly scope?: string;
}

/** The mini-language's own spelling, which is what the note shows the player. */
const SIGNS: Readonly<Record<ConditionAdvantage, string>> = {
  advantage: '[+]',
  disadvantage: '[-]',
};

function entries(condition: ConditionItem): readonly ModifierEntry[] {
  const system = (condition.system ?? {}) as { modifiers?: readonly ModifierEntry[] };
  return system.modifiers ?? [];
}

export function conditionModifier(
  items: Iterable<ConditionItem>,
  scope: CheckScope | null,
): ConditionModifier | null {
  if (scope === null) return null;

  const named: Record<ConditionAdvantage, string[]> = { advantage: [], disadvantage: [] };
  for (const item of items) {
    if (item.type !== 'condition') continue;
    for (const entry of entries(item)) {
      if (entry.scope !== scope) continue;
      if (entry.modifier === 'advantage' || entry.modifier === 'disadvantage') {
        named[entry.modifier].push(item.name ?? '');
      }
    }
  }

  if (named.advantage.length > 0 && named.disadvantage.length > 0) return null;
  if (named.disadvantage.length > 0) return { advantage: 'disadvantage', names: named.disadvantage };
  if (named.advantage.length > 0) return { advantage: 'advantage', names: named.advantage };
  return null;
}

/** The line a roll dialog shows to name what is modifying it, or '' when nothing is. */
export function conditionNote(modifier: ConditionModifier | null): string {
  if (modifier === null) return '';
  return format('Mosh.ConditionModifier', {
    conditions: modifier.names.join(', '),
    sign: SIGNS[modifier.advantage],
  });
}

/** Which button the dialog opens on, and null when the player is left to choose freely. */
export function conditionPreselect(modifier: ConditionModifier | null): Advantage | null {
  return modifier === null ? null : modifier.advantage;
}
