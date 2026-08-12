import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Emitted } from './emit.ts';
import { allIds, type Registry } from './ids.ts';

const UUID = /@UUID\[Compendium\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)\.(Item|Macro|RollTable|JournalEntry)\.([A-Za-z0-9]+)\]/g;

export interface IntegrityInput {
  systemId: string;
  emitted: Emitted[];
  compendia: Set<string>;
}

/**
 * Every `@UUID` in emitted content must resolve to a document the same build emitted. 269 of them
 * live inside the shipped packs — rolltable results linking the stress and calm macros,
 * maintenance items linking their effect macros — and a broken one is invisible until a player
 * clicks it.
 */
export function checkReferences({ systemId, emitted, compendia }: IntegrityInput): string[] {
  const byCompendium = new Map<string, Set<string>>();
  for (const doc of emitted) {
    let ids = byCompendium.get(doc.compendium);
    if (!ids) byCompendium.set(doc.compendium, (ids = new Set()));
    ids.add(doc.id);
    for (const result of doc.results) ids.add(result.id);
  }

  const errors: string[] = [];
  for (const doc of emitted) {
    const text = JSON.stringify(doc.document);
    for (const [, pkg, compendium, , id] of text.matchAll(UUID)) {
      const where = `${doc.compendium}/${doc.contentId}`;
      if (pkg !== systemId) {
        errors.push(`${where}: @UUID targets package "${pkg}", not "${systemId}"`);
      } else if (!compendia.has(compendium!)) {
        errors.push(`${where}: @UUID targets unknown compendium "${compendium}"`);
      } else if (!byCompendium.get(compendium!)?.has(id!)) {
        errors.push(`${where}: @UUID target ${compendium}.${id} was not emitted`);
      }
    }
  }
  return errors;
}

/** Every id the pre-pipeline packs held is emitted, or retired with a reason. */
export function checkIdPreservation(before: Set<string>, emitted: Emitted[], registry: Registry): string[] {
  const now = new Set<string>();
  for (const doc of emitted) {
    now.add(doc.id);
    for (const result of doc.results) now.add(result.id);
  }
  const retired = new Map(registry.retired.map((r) => [r.id, r]));

  const errors: string[] = [];
  for (const id of [...before].sort()) {
    if (now.has(id)) continue;
    const record = retired.get(id);
    if (!record) errors.push(`${id} vanished — emit it, or retire it in content/ids.json with a reason`);
    else if (!record.reason.trim()) errors.push(`${id} is retired with no reason`);
  }
  return errors;
}

const TABLE_SETTING = /game\.settings\.register\('[^']+',\s*'(table1e[A-Za-z]+)',[^}]*?default:\s*"([A-Za-z0-9]+)"/g;

/** The 14 rolltable settings default to bare `_id`s; each must still name a registered table. */
export function checkSettingsDefaults(root: string, registry: Registry): string[] {
  const source = readFileSync(join(root, 'module/settings.js'), 'utf8');
  const known = allIds(registry);
  const errors: string[] = [];
  let found = 0;
  for (const [, key, id] of source.matchAll(TABLE_SETTING)) {
    found += 1;
    if (!known.has(id!)) errors.push(`setting ${key} defaults to ${id}, which no pack provides`);
  }
  if (found === 0) errors.push('module/settings.js declares no table1e* defaults — has the shape changed?');
  return errors;
}
