import { MothershipItemSheet } from '../item/ItemSheetApp.js';
import SkillSheet from './SkillSheet.svelte';

export class MothershipSkillSheet extends MothershipItemSheet {
  static COMPONENT = SkillSheet;

  /**
   * `item` is null when a UUID no longer resolves — rendered as removable. `key` includes the
   * index because a stored list can hold the same UUID twice.
   */
  async _context() {
    const context = await super._context();
    const prerequisites = await Promise.all(
      this.document.system.prerequisite_ids.map(async (uuid, index) => ({
        key: `${index}-${uuid}`,
        uuid,
        item: await fromUuid(uuid),
      })),
    );
    return { ...context, prerequisites };
  }
}
