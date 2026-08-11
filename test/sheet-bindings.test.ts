// Every `name="system.x"` a sheet binds must exist in that type's schema. A SchemaField cleans
// off keys it does not declare, so a binding to a missing field is not an error -- the edit is
// accepted and silently discarded. That is how the DataModel migration stopped armour from
// equipping: `equipped` was bound by the sheet, read by _deriveCharacter, and in no schema.
//
// Only unprefixed names are checked. `armor.system.equipped` and friends on the actor sheets
// address an *embedded item*, not the actor, and are handled by click handlers rather than the
// form -- checking them against the actor schema would be wrong.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, globSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { installFoundryFieldStubs, defaultsOf, type Stub } from './field-stubs.ts';

installFoundryFieldStubs();

type Models = Record<string, { defineSchema: () => Record<string, Stub> }>;
const { ITEM_MODELS } = (await import('../module/data/item-models.js')) as { ITEM_MODELS: Models };
const { ACTOR_MODELS } = (await import('../module/data/actor-models.js')) as { ACTOR_MODELS: Models };

const root = new URL('../', import.meta.url);
const exists = (path: string) => existsSync(fileURLToPath(new URL(path, root)));

// Item components are PascalCase and a type may have more than one (Armor + ArmorExtra), so
// match on the lowercased basename rather than globbing by exact name.
const itemComponents = globSync('module/ui/item/types/*.svelte', { cwd: fileURLToPath(root) });

// Types whose sheet outgrew the shared item component live in their own folder, outside that
// glob. Listing them beats widening it to module/ui/**, where the shared primitives would match
// type names like "item" and cover nothing.
const OWN_COMPONENTS: Record<string, string[]> = {
  skill: ['module/ui/skill/SkillSheet.svelte'],
};

// The Handlebars paths stay listed so the types still on AppV1 keep their cover until they
// convert; a missing file is skipped, an empty list fails.
const SOURCES: Record<string, Record<string, string[]>> = {
  Item: Object.fromEntries(
    Object.keys(ITEM_MODELS).map((type) => [
      type,
      [
        `templates/item/item-${type}-sheet.html`,
        ...itemComponents.filter((p) => p.split('/').pop()!.toLowerCase().startsWith(type)),
        ...(OWN_COMPONENTS[type] ?? []),
      ],
    ]),
  ),
  Actor: {
    character: ['templates/actor/actor-sheet.html'],
    creature: ['templates/actor/creature-sheet.html'],
    // Both ship sheets are registered; SBT is the default, the other is still selectable.
    ship: ['templates/actor/ship-sheet.html', 'templates/actor/ship-sheet-sbt.html'],
  },
};

const boundPaths = (source: string): string[] => {
  const live = source.replace(/<!--[\s\S]*?-->/g, '');
  return [...live.matchAll(/(^|[\s"'])name="system\.([A-Za-z0-9_.-]+)"/g)].map((m) => m[2]);
};

const resolves = (defaults: Record<string, unknown>, path: string): boolean => {
  let cursor: unknown = defaults;
  for (const key of path.split('.')) {
    if (typeof cursor !== 'object' || cursor === null || !(key in cursor)) return false;
    cursor = (cursor as Record<string, unknown>)[key];
  }
  return true;
};

describe.each([
  ['Item', ITEM_MODELS],
  ['Actor', ACTOR_MODELS],
] as const)('%s sheets bind only fields the schema declares', (kind, models) => {
  for (const type of Object.keys(models)) {
    it(`${type}`, () => {
      const defaults = defaultsOf(models[type].defineSchema());
      const sources = SOURCES[kind][type].filter(exists);
      expect(sources.length, `no sheet source found for ${kind}.${type}`).toBeGreaterThan(0);

      const unbacked = sources.flatMap((path) =>
        boundPaths(readFileSync(fileURLToPath(new URL(path, root)), 'utf8'))
          .filter((p) => !resolves(defaults, p))
          .map((p) => `${path}: system.${p}`),
      );
      expect(unbacked).toEqual([]);
    });
  }
});
