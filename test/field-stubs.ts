import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export {
  defaultsOf,
  installFoundryFieldStubs,
  leaves,
  undeclaredKeys,
  type Stub,
} from '../scripts/model-schema.ts';

export const template = JSON.parse(
  readFileSync(fileURLToPath(new URL('../template.json', import.meta.url)), 'utf8'),
) as { Actor: Record<string, any>; Item: Record<string, any> };

export const manifest = JSON.parse(
  readFileSync(fileURLToPath(new URL('../system.json', import.meta.url)), 'utf8'),
) as { documentTypes: { Actor: Record<string, unknown>; Item: Record<string, unknown> } };

export function templateDefaults(kind: 'Actor' | 'Item', type: string): Record<string, unknown> {
  const body = template[kind][type];
  const merged: Record<string, unknown> = {};
  for (const name of body.templates ?? []) Object.assign(merged, template[kind].templates[name]);
  for (const [k, v] of Object.entries(body)) if (k !== 'templates') merged[k] = v;
  return merged;
}
