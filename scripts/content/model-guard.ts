import { undeclaredKeys } from '../model-schema.ts';
import type { Emitted } from './emit.ts';
import { ITEM_SCHEMAS } from './models.ts';

/**
 * Every key an emitted Item puts in `system` must be declared by the DataModel that will receive
 * it. A SchemaField cleans off keys it does not know, so an undeclared key is accepted by the
 * build, written to the pack, and discarded the moment Foundry loads the document — the failure
 * mode that stopped armour equipping and destroyed the creature swarm toggle.
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
  }
  return errors;
}
