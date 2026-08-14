import { tableSettings } from '../../module/tables/tables.ts';
import type { Emitted } from './emit.ts';
import { allIds, type Registry } from './ids.ts';

// Deliberately not anchored to `@UUID[…]`: a class's `skills_granted` is a bare compendium UUID in
// an array, and that join breaks just as silently as a bad link in prose.
const UUID = /Compendium\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)\.(Item|Macro|RollTable|JournalEntry)\.([A-Za-z0-9]+)/g;

export interface IntegrityInput {
  systemId: string;
  emitted: Emitted[];
  compendia: Set<string>;
}

/**
 * Every `@UUID` in emitted content must resolve to a document the same build emitted. A broken
 * link is invisible until a player clicks it, and this build is the only place it is cheap to
 * catch.
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

/**
 * Every id the registry has handed out is emitted again, or retired with a reason. Dropping one
 * silently means the next build mints a fresh id for the same document, and every world built on
 * an earlier release loses track of it.
 */
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

const FORBIDDEN_SETTINGS_GET = /\bgame\.settings\.get\s*\(/;
const FORBIDDEN_INIT_CALL = /\bmothershiprpg\.init[A-Z]\w*\s*\(/;
const FORBIDDEN_BARE_ID = /(['"`])[A-Za-z0-9]{16}\1/;

/**
 * Macros are user interface now, not the system: every
 * emitted command routes through `game.mothershiprpg`'s new entry points, which resolve targeting,
 * tables and conditions themselves. This is the structural fix for two shipped bugs a content
 * change could otherwise reintroduce — a `game.settings.get` namespace typo no tier caught until a
 * player was dying (audit C1), and a wound-table id embedded past every reference check's reach
 * (audit C2) — plus the retired `init*` verbs those bugs lived in.
 */
export function checkMacroCommands(emitted: Emitted[]): string[] {
  const errors: string[] = [];
  for (const doc of emitted) {
    const command = doc.document.command;
    if (typeof command !== 'string') continue;
    const where = `${doc.compendium}/${doc.contentId}`;
    if (FORBIDDEN_SETTINGS_GET.test(command)) {
      errors.push(`${where}: macro command reads game.settings.get directly — call game.mothershiprpg instead`);
    }
    if (FORBIDDEN_INIT_CALL.test(command)) {
      errors.push(`${where}: macro command calls a retired init* verb`);
    }
    if (FORBIDDEN_BARE_ID.test(command)) {
      errors.push(`${where}: macro command embeds a bare document id`);
    }
  }
  return errors;
}

/**
 * The rolltable settings default to bare `_id`s; each must still name a registered table. The
 * defaults are read from the runtime's own table definitions rather than scraped out of the
 * registration source, which is what the swap deleted — `tables/tables.ts` is where a table's
 * identity lives now (audit F13, RC13).
 */
export function checkSettingsDefaults(registry: Registry): string[] {
  const known = allIds(registry);
  const errors: string[] = [];
  for (const table of tableSettings()) {
    if (!known.has(table.default)) {
      errors.push(`setting ${table.setting} defaults to ${table.default}, which no pack provides`);
    }
  }
  if (errors.length === 0 && tableSettings().length === 0) {
    errors.push('tables/tables.ts declares no table settings — has the shape changed?');
  }
  return errors;
}
