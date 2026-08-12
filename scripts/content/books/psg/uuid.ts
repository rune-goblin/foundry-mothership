import type { IdLookup } from '../../record.ts';

/** Matches `system.json`'s id; the reference check fails the build if the two ever diverge. */
const SYSTEM = 'mothershiprpg';

export const PACKS = {
  skills: { pack: 'skills', compendium: 'skills_1e', type: 'Item' },
  classes: { pack: 'classes', compendium: 'classes_1e', type: 'Item' },
  weapons: { pack: 'weapons', compendium: 'weapons_1e', type: 'Item' },
  armor: { pack: 'armor', compendium: 'armor_1e', type: 'Item' },
  equipment: { pack: 'equipment', compendium: 'equipment_1e', type: 'Item' },
  conditions: { pack: 'conditions', compendium: 'conditions_1e', type: 'Item' },
  rolltables: { pack: 'rolltables', compendium: 'rolltables_1e', type: 'RollTable' },
  triggered: { pack: 'triggered', compendium: 'macros_triggered_1e', type: 'Macro' },
  hotbar: { pack: 'hotbar', compendium: 'macros_hotbar_1e', type: 'Macro' },
} as const;

export type PackKey = keyof typeof PACKS;

export function uuid(ids: IdLookup, key: PackKey, contentId: string): string {
  const { pack, compendium, type } = PACKS[key];
  return `Compendium.${SYSTEM}.${compendium}.${type}.${ids.documentId(pack, contentId)}`;
}

export function link(ids: IdLookup, key: PackKey, contentId: string, label: string): string {
  return `@UUID[${uuid(ids, key, contentId)}]{${label}}`;
}

/** `<p>…</p>`, with the paragraphs the sheets expect and no empty one when there is nothing to say. */
export function html(...parts: (string | null | undefined | false)[]): string {
  const body = parts.filter((p): p is string => Boolean(p)).join('<br><br>');
  return body ? `<p>${body}</p>` : '';
}
