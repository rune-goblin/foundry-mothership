import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import type { ErrorObject, ValidateFunction } from 'ajv';

export interface TierPaths {
  /** Directory of `*.schema.json`. */
  schema: string;
  /** Directory of `*.json` records; `schema/` beneath it is skipped. */
  data: string;
  /**
   * Ajv strict mode — a keyword typo in a schema would otherwise validate everything and prove
   * nothing, so it is on for schemas we author. Off for the vendored upstream schemas, which are
   * not ours to relint: its complaints (`strictTypes`, `strictRequired`) are about how a schema is
   * written, never about what it accepts, so data validation is unaffected either way.
   */
  strict?: boolean;
}

/**
 * One validator for both tiers. `content/schema` covers `content/local`, the vendored upstream
 * schemas cover `content/data`, and the generator downstream cannot tell which produced a record.
 */
export function validateTier({ schema, data, strict = true }: TierPaths): string[] {
  if (!existsSync(schema) || !existsSync(data)) return [];

  const ajv = new Ajv2020({ strict, allErrors: true, allowUnionTypes: true, validateSchema: true });
  const byFile = new Map<string, ValidateFunction>();

  const schemaFiles = readdirSync(schema).filter((f) => f.endsWith('.schema.json')).sort();
  for (const file of schemaFiles) {
    ajv.addSchema(JSON.parse(readFileSync(join(schema, file), 'utf8')) as object, file);
  }
  for (const file of schemaFiles) {
    byFile.set(basename(file, '.schema.json'), ajv.getSchema(file) as ValidateFunction);
  }

  const errors: string[] = [];
  for (const file of readdirSync(data).filter((f) => f.endsWith('.json')).sort()) {
    const stem = basename(file, '.json');
    const validate = byFile.get(stem);
    if (!validate) {
      errors.push(`${file}: no ${stem}.schema.json in ${schema}`);
      continue;
    }
    if (!validate(JSON.parse(readFileSync(join(data, file), 'utf8')))) {
      for (const err of validate.errors ?? []) errors.push(`${file}${describe(err)}`);
    }
  }
  return errors;
}

function describe(err: ErrorObject): string {
  const at = err.instancePath || '/';
  const extra = err.params && Object.keys(err.params).length ? ` ${JSON.stringify(err.params)}` : '';
  return `${at}: ${err.message ?? 'invalid'}${extra}`;
}
