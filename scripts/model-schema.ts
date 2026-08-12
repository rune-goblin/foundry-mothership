// The model modules read foundry.data.fields at module scope. Rather than import Foundry, stub
// each field class to record the default it would produce, then walk the real schema. Callers
// therefore check the shipped schema itself, not a restatement of it.
export type Stub = {
  initial?: unknown;
  schema?: Record<string, Stub>;
  element?: Stub;
  choices?: readonly string[];
  blank?: boolean;
};

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
        // `choices` is kept so the content build can check emitted values against the enum, not
        // just the key against the schema -- an off-list string is discarded on load just as
        // silently as an undeclared key. `blank` rides along because Foundry lets "" through
        // ahead of the choices check, but only where the field asks for it.
        StringField: class extends Recorded {
          choices?: readonly string[];
          blank: boolean;
          constructor(o?: { initial?: string; choices?: readonly string[]; blank?: boolean }) {
            super(o?.initial ?? '');
            this.choices = o?.choices;
            this.blank = o?.blank ?? !o?.choices;
          }
        },
        BooleanField: class extends Recorded { constructor(o?: { initial?: boolean }) { super(o?.initial ?? false); } },
        HTMLField: class extends Recorded { constructor(o?: { initial?: string }) { super(o?.initial ?? ''); } },
        FilePathField: class extends Recorded { constructor(o?: { initial?: string }) { super(o?.initial ?? ''); } },
        // The element field is kept so undeclaredKeys can reach the shape inside a list --
        // class.selected_adjustment.choose_skill_or is an array of arrays of SchemaFields.
        ArrayField: class extends Recorded {
          element: Stub;
          constructor(element: Stub) { super([]); this.element = element; }
        },
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
    if (!field) out.push(`${prefix}${key}`);
    else out.push(...undeclaredIn(child, field, `${prefix}${key}`));
  }
  return out;
}

function undeclaredIn(value: unknown, field: Stub, path: string): string[] {
  if (field.schema && isPlainObject(value)) return undeclaredKeys(value, field.schema, `${path}.`);
  if (field.element && Array.isArray(value)) {
    return value.flatMap((entry, index) => undeclaredIn(entry, field.element!, `${path}[${index}]`));
  }
  return [];
}

/**
 * Dotted paths whose value is not one of the enumerated choices its field declares. Foundry
 * validates a StringField's choices on load and falls back to the initial, so an off-list value
 * is the same silent loss as an undeclared key. Blank passes only where the field declares it --
 * setting `choices` turns `blank` off, which is what makes "" an off-list value like any other.
 */
export function invalidChoices(
  value: Record<string, unknown>,
  schema: Record<string, Stub>,
  prefix = '',
): string[] {
  const out: string[] = [];
  for (const [key, child] of Object.entries(value)) {
    const field = schema[key];
    if (!field) continue;
    if (field.schema && isPlainObject(child)) {
      out.push(...invalidChoices(child, field.schema, `${prefix}${key}.`));
    } else if (
      field.choices &&
      !(child === '' && field.blank) &&
      !field.choices.includes(child as string)
    ) {
      out.push(`${prefix}${key} = ${JSON.stringify(child)}`);
    }
  }
  return out;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
