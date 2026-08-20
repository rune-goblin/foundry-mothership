import { MothershipItemSheet } from '../item/ItemSheetApp.js';
import ClassSheet from './ClassSheet.svelte';

export class MothershipClassSheet extends MothershipItemSheet {
  static COMPONENT = ClassSheet;

  static DEFAULT_OPTIONS = {
    position: { width: 820, height: 820 },
  };

  /** A UUID that no longer resolves keeps its row, shown raw. */
  async #resolve(uuids) {
    return Promise.all(
      uuids.map(async (uuid, index) => ({
        key: `${index}-${uuid}`,
        uuid,
        item: await fromUuid(uuid),
      })),
    );
  }

  async _context() {
    const context = await super._context();
    const { base_adjustment, selected_adjustment } = this.document.system;

    const skillGroups = await Promise.all(
      selected_adjustment.choose_skill_or.map(async (group, groupIndex) => ({
        key: groupIndex,
        index: groupIndex,
        options: await Promise.all(
          group.map(async (option, optionIndex) => ({
            key: `${groupIndex}-${optionIndex}`,
            index: optionIndex,
            option,
            fromList: await this.#resolve(option.from_list ?? []),
          })),
        ),
      })),
    );

    return {
      ...context,
      grantedSkills: await this.#resolve(base_adjustment.skills_granted),
      skillGroups,
    };
  }
}
