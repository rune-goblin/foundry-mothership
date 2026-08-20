import { invalidChoices, undeclaredKeys } from '../model-schema.ts';
import type { Emitted } from './emit.ts';
import { ITEM_SCHEMAS } from './models.ts';

/**
 * A SchemaField cleans off keys it does not know, so an undeclared key in `system` is written to
 * the pack and silently discarded the moment Foundry loads the document.
 */
export function checkModelFields(emitted: Emitted[]): string[] {
  const errors: string[] = [];
  for (const doc of emitted) {
    if (doc.record.body.kind !== 'Item') continue;
    const type = doc.record.body.type;
    const where = `${doc.compendium}/${doc.contentId}`;
    const schema = ITEM_SCHEMAS[type];
    if (!schema) {
      errors.push(`${where}: no DataModel is registered for Item type "${type}"`);
      continue;
    }
    const system = (doc.document.system ?? {}) as Record<string, unknown>;
    for (const path of undeclaredKeys(system, schema)) {
      errors.push(`${where}: ${type} declares no system.${path} — Foundry would discard it on load`);
    }
    for (const path of invalidChoices(system, schema)) {
      errors.push(`${where}: system.${path} is not one of the choices ${type} declares`);
    }
  }
  return errors;
}
