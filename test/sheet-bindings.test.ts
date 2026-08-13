// Every `name="system.x"` a sheet binds must exist in that type's schema. A SchemaField cleans
// off keys it does not declare, so a binding to a missing field is not an error -- the edit is
// accepted and silently discarded. That is how the DataModel migration stopped armour from
// equipping: `equipped` was bound by the sheet, read by _deriveCharacter, and in no schema.
//
// Only unprefixed names are checked. `armor.system.equipped` and friends on the actor sheets
// address an *embedded item*, not the actor, and are handled by click handlers rather than the
// form -- checking them against the actor schema would be wrong.
//
// A Svelte sheet passes the name down as a prop (`rightName="system.health.max"`), builds some
// of them from a key (`name="system.stats.{stat.key}.value"`), and drives repeated fields off a
// table of paths (`{ name: 'system.credits.value', … }`). So any attribute *or property* whose
// literal value is a `system.` path counts, and an interpolated segment stands for any key at
// that level.
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
  class: ['module/ui/class/ClassSheet.svelte'],
};

// templates/ holds no sheet at all now -- the character sheet was the last one -- but the item
// path stays listed so a type that regrows a Handlebars sheet is covered. A missing file is
// skipped, an empty list fails.
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
    character: [
      'module/ui/actor/CharacterSheet.svelte',
      'module/ui/parts/sections/HealthBlock.svelte',
    ],
    creature: [
      'module/ui/creature/CreatureSheet.svelte',
      'module/ui/creature/CreatureSettings.svelte',
      'module/ui/parts/sections/HealthBlock.svelte',
    ],
  },
};

const BOUND =
  /(^|[\s{])[A-Za-z][A-Za-z0-9_-]*\s*[:=]\s*(?:"(system\.[^"]*)"|'(system\.[^']*)'|\{`(system\.[^`]*)`\})/g;

const boundPaths = (source: string): string[] => {
  const live = source.replace(/<!--[\s\S]*?-->/g, '');
  return [...live.matchAll(BOUND)]
    .map((match) => (match[2] ?? match[3] ?? match[4]).slice('system.'.length))
    .map((path) => path.replace(/\$?\{[^}]*\}/g, '*'));
};

const resolves = (node: unknown, path: string[]): boolean => {
  if (!path.length) return true;
  if (typeof node !== 'object' || node === null) return false;
  const record = node as Record<string, unknown>;
  const [key, ...rest] = path;
  if (key === '*') return Object.values(record).some((child) => resolves(child, rest));
  return key in record && resolves(record[key], rest);
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
          .filter((p) => !resolves(defaults, p.split('.')))
          .map((p) => `${path}: system.${p}`),
      );
      expect(unbacked).toEqual([]);
    });
  }
});
