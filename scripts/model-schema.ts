// The model modules read foundry.data.fields at module scope. Rather than import Foundry, stub
// each field class to record the default it would produce, then walk the real schema. Callers
// therefore check the shipped schema itself, not a restatement of it.
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

export function leaves(schema: Record<string, Stub>, prefix = ''): string[] {
  return Object.entries(schema).flatMap(([key, field]) =>
    field.schema ? leaves(field.schema, `${prefix}${key}.`) : [`${prefix}${key}`],
  );
}

/**
 * Dotted paths present in `value` that the schema does not declare. A SchemaField silently drops
 * such a key on load, so an emitted document carrying one ships data that vanishes.
 *
 * The check is one-directional on purpose: a record legitimately sets a subset of the schema.
 */
export function undeclaredKeys(
  value: Record<string, unknown>,
  schema: Record<string, Stub>,
  prefix = '',
): string[] {
  const out: string[] = [];
  for (const [key, child] of Object.entries(value)) {
    const field = schema[key];
    if (!field) {
      out.push(`${prefix}${key}`);
    } else if (field.schema && isPlainObject(child)) {
      out.push(...undeclaredKeys(child, field.schema, `${prefix}${key}.`));
    }
  }
  return out;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
