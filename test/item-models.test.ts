import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// item-models.js reads foundry.data.fields at module scope. Rather than import Foundry, we
// stub each field class to record the default it would produce, then walk the real schema.
// That means the assertions below check the shipped schema itself, not a copy of it.
type Stub = { initial?: unknown; schema?: Record<string, Stub> };

class Recorded {
  initial: unknown;
  constructor(initial: unknown) { this.initial = initial; }
}

(globalThis as Record<string, unknown>).foundry = {
  abstract: { TypeDataModel: class {} },
  data: {
    fields: {
      NumberField: class extends Recorded { constructor(o: { initial: number }) { super(o.initial); } },
      StringField: class extends Recorded { constructor(o?: { initial?: string }) { super(o?.initial ?? ''); } },
      BooleanField: class extends Recorded { constructor(o?: { initial?: boolean }) { super(o?.initial ?? false); } },
      HTMLField: class extends Recorded { constructor(o?: { initial?: string }) { super(o?.initial ?? ''); } },
      ArrayField: class extends Recorded { constructor() { super([]); } },
      ObjectField: class extends Recorded {
        constructor(o?: { initial?: unknown }) {
          super(typeof o?.initial === 'function' ? (o.initial as () => unknown)() : (o?.initial ?? {}));
        }
      },
      SchemaField: class { schema: Record<string, Stub>; constructor(schema: Record<string, Stub>) { this.schema = schema; } },
    },
  },
};

const { ITEM_MODELS } = (await import('../module/data/item-models.js')) as {
  ITEM_MODELS: Record<string, { defineSchema: () => Record<string, Stub> }>;
};

function defaultsOf(schema: Record<string, Stub>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(schema)) {
    out[key] = field.schema ? defaultsOf(field.schema) : field.initial;
  }
  return out;
}

const template = JSON.parse(
  readFileSync(fileURLToPath(new URL('../template.json', import.meta.url)), 'utf8'),
) as { Item: Record<string, any> };

// template.json composes a type from the named templates it lists plus its own keys.
function templateDefaults(type: string): Record<string, unknown> {
  const body = template.Item[type];
  const merged: Record<string, unknown> = {};
  for (const name of body.templates ?? []) Object.assign(merged, template.Item.templates[name]);
  for (const [k, v] of Object.entries(body)) if (k !== 'templates') merged[k] = v;
  return merged;
}

describe('item DataModels reproduce template.json exactly', () => {
  for (const type of Object.keys(ITEM_MODELS)) {
    it(`${type} defaults match`, () => {
      const model = defaultsOf(ITEM_MODELS[type].defineSchema());
      expect(model).toEqual(templateDefaults(type));
    });
  }

  it('covers every Item type the manifest declares', () => {
    const manifest = JSON.parse(
      readFileSync(fileURLToPath(new URL('../system.json', import.meta.url)), 'utf8'),
    ) as { documentTypes: { Item: Record<string, unknown> } };
    expect(Object.keys(ITEM_MODELS).sort()).toEqual(Object.keys(manifest.documentTypes.Item).sort());
  });

  it('covers every Item type template.json declares', () => {
    expect(Object.keys(ITEM_MODELS).sort()).toEqual([...template.Item.types].sort());
  });
});
