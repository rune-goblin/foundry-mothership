import { MoshItemSheet } from '../item/ItemSheetApp.js';
import SkillSheet from './SkillSheet.svelte';

/**
 * The skill sheet adds one thing to the item shell: its prerequisites are stored as UUID strings,
 * so they have to be resolved before the component can render them. `fromUuid` is async, which is
 * why this happens here rather than in the component.
 */
export class MoshSkillSheet extends MoshItemSheet {
  static COMPONENT = SkillSheet;

  /**
   * `item` is null for a UUID that no longer resolves; the component renders those as removable.
   * `key` carries the index because the AppV1 sheet appended without a duplicate check, so a
   * stored list can hold the same UUID twice and the UUID alone is not unique.
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
