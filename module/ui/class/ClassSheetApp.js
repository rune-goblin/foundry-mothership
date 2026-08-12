import { MoshItemSheet } from '../item/ItemSheetApp.js';
import ClassSheet from './ClassSheet.svelte';

/**
 * The class sheet stores its skills as UUID strings — the granted list and every choose_skill_or
 * option's from_list — so they have to be resolved before the component can name them. `fromUuid`
 * is async, which is why that happens here.
 *
 * The AppV1 sheet resolved them onto `data.system` during render, which is what kept
 * base_adjustment a free-form ObjectField: a SchemaField would have cleaned the derived keys off.
 * Nothing is written back to the document now; the resolved names travel beside it.
 */
export class MoshClassSheet extends MoshItemSheet {
  static COMPONENT = ClassSheet;

  static DEFAULT_OPTIONS = {
    position: { width: 820, height: 820 },
  };

  /** A UUID that no longer resolves keeps its row and shows itself raw, as on the skill sheet. */
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
