// Every `name="system.x"` an item sheet binds must exist in that type's schema. A SchemaField
// cleans off keys it does not declare, so a binding to a missing field is not an error -- the
// edit is accepted and silently discarded. That is how the DataModel migration stopped armour
// from equipping: `equipped` was bound by the sheet, read by _deriveCharacter, and in no schema.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { globSync } from 'node:fs';
import { installFoundryFieldStubs, defaultsOf, type Stub } from './field-stubs.ts';

installFoundryFieldStubs();

const { ITEM_MODELS } = (await import('../module/data/item-models.js')) as {
  ITEM_MODELS: Record<string, { defineSchema: () => Record<string, Stub> }>;
};

const root = new URL('../', import.meta.url);

// Components are PascalCase and a type may have more than one (Armor + ArmorExtra), so match on
// the lowercased basename rather than globbing by exact name -- and keep the Handlebars path so
// the types still on AppV1 stay covered until they convert.
const components = globSync('module/ui/item/types/*.svelte', { cwd: fileURLToPath(root) });

const sourcesFor = (type: string): string[] =>
  [
    `templates/item/item-${type}-sheet.html`,
    ...components.filter((p) => p.split('/').pop()!.toLowerCase().startsWith(type)),
  ].filter((p) => existsSync(fileURLToPath(new URL(p, root))));

const boundPaths = (source: string): string[] => {
  const live = source.replace(/<!--[\s\S]*?-->/g, '');
  return [...live.matchAll(/name="system\.([A-Za-z0-9_.]+)"/g)].map((m) => m[1]);
};

const resolves = (defaults: Record<string, unknown>, path: string): boolean => {
  let cursor: unknown = defaults;
  for (const key of path.split('.')) {
    if (typeof cursor !== 'object' || cursor === null || !(key in cursor)) return false;
    cursor = (cursor as Record<string, unknown>)[key];
  }
  return true;
};

describe('item sheets bind only fields the schema declares', () => {
  for (const type of Object.keys(ITEM_MODELS)) {
    it(`${type}`, () => {
      const defaults = defaultsOf(ITEM_MODELS[type].defineSchema());
      const sources = sourcesFor(type);
      expect(sources.length, `no sheet source found for ${type}`).toBeGreaterThan(0);

      const unbacked = sources.flatMap((path) =>
        boundPaths(readFileSync(fileURLToPath(new URL(path, root)), 'utf8'))
          .filter((p) => !resolves(defaults, p))
          .map((p) => `${path}: system.${p}`),
      );
      expect(unbacked).toEqual([]);
    });
  }
});
