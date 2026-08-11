// The model modules read foundry.data.fields at module scope. Rather than import Foundry,
// stub each field class to record the default it would produce, then walk the real schema.
// The assertions therefore check the shipped schema itself, not a restatement of it.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export type Stub = { initial?: unknown; schema?: Record<string, Stub> };

class Recorded {
  initial: unknown;
  constructor(initial: unknown) { this.initial = initial; }
}

export function installFoundryFieldStubs(): void {
  (globalThis as Record<string, unknown>).foundry = {
    abstract: { TypeDataModel: class {} },
    data: {
      fields: {
        NumberField: class extends Recorded { constructor(o: { initial: number }) { super(o.initial); } },
        StringField: class extends Recorded { constructor(o?: { initial?: string }) { super(o?.initial ?? ''); } },
        BooleanField: class extends Recorded { constructor(o?: { initial?: boolean }) { super(o?.initial ?? false); } },
        HTMLField: class extends Recorded { constructor(o?: { initial?: string }) { super(o?.initial ?? ''); } },
        FilePathField: class extends Recorded { constructor(o?: { initial?: string }) { super(o?.initial ?? ''); } },
        ArrayField: class extends Recorded { constructor() { super([]); } },
        ObjectField: class extends Recorded {
          constructor(o?: { initial?: unknown }) {
            super(typeof o?.initial === 'function' ? (o.initial as () => unknown)() : (o?.initial ?? {}));
          }
        },
        SchemaField: class {
          schema: Record<string, Stub>;
          constructor(schema: Record<string, Stub>) { this.schema = schema; }
        },
      },
    },
  };
}

export function defaultsOf(schema: Record<string, Stub>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(schema)) {
    out[key] = field.schema ? defaultsOf(field.schema) : field.initial;
  }
  return out;
}

export const template = JSON.parse(
  readFileSync(fileURLToPath(new URL('../template.json', import.meta.url)), 'utf8'),
) as { Actor: Record<string, any>; Item: Record<string, any> };

export const manifest = JSON.parse(
  readFileSync(fileURLToPath(new URL('../system.json', import.meta.url)), 'utf8'),
) as { documentTypes: { Actor: Record<string, unknown>; Item: Record<string, unknown> } };

// template.json composes a type from the named templates it lists plus its own keys.
export function templateDefaults(kind: 'Actor' | 'Item', type: string): Record<string, unknown> {
  const body = template[kind][type];
  const merged: Record<string, unknown> = {};
  for (const name of body.templates ?? []) Object.assign(merged, template[kind].templates[name]);
  for (const [k, v] of Object.entries(body)) if (k !== 'templates') merged[k] = v;
  return merged;
}
