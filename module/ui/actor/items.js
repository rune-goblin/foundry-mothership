// The embedded-item operations an actor sheet's rows drive. AppV1 bound each of these by jQuery
// selector in `activateListeners` and reached the item through `duplicate(getEmbeddedDocument(...))`;
// they are plain functions now, called from the component with the id the row already carries.

/**
 * The +/- cells: left click adds one, right click removes one. AppV1 read `event.button` off the
 * *global* `event` inside a `mousedown` handler -- a click/contextmenu pair says the same thing
 * without the global, and gives the cell a keyboard twin for free. The right click is consumed so
 * it does not also open a context menu over the sheet.
 */
export const stepBy = (event) => {
  if (event.type !== 'contextmenu') return 1;
  event.preventDefault();
  return -1;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/** Nudge one numeric field on an embedded item, within its bounds. */
export function adjust(actor, itemId, path, delta, { min = -Infinity, max = Infinity } = {}) {
  const item = actor.items.get(itemId);
  if (!item) return;
  const current = Number(foundry.utils.getProperty(item.system, path) ?? 0);
  return actor.updateEmbeddedDocuments('Item', [
    { _id: itemId, [`system.${path}`]: clamp(current + delta, min, max) },
  ]);
}

/**
 * Firing spends a shot and a round of ammunition; the reverse puts both back. The two move
 * together, which is why this is not two `adjust` calls.
 */
export function stepShots(actor, itemId, delta) {
  const item = actor.items.get(itemId);
  if (!item) return;
  const { curShots, shots, ammo } = item.system;
  if (delta > 0 && !(curShots >= 0 && curShots < shots && ammo > 0)) return;
  if (delta < 0 && !(curShots > 0)) return;
  return actor.updateEmbeddedDocuments('Item', [
    { _id: itemId, 'system.curShots': Number(curShots) + delta, 'system.ammo': Number(ammo) - delta },
  ]);
}

export function toggleEquipped(actor, itemId) {
  const item = actor.items.get(itemId);
  if (!item) return;
  return actor.updateEmbeddedDocuments('Item', [
    { _id: itemId, 'system.equipped': !item.system.equipped },
  ]);
}

export const editItem = (actor, itemId) => actor.items.get(itemId)?.sheet.render({ force: true });

export const deleteItem = (actor, itemId) => actor.deleteEmbeddedDocuments('Item', [itemId]);

export const createItem = (actor, type) =>
  actor.createEmbeddedDocuments('Item', [{ name: `New ${type.capitalize()}`, type }]);

/** `rollCheck` mutates the weapon it is handed and writes it back, so it wants source data. */
export const itemData = (actor, itemId) => actor.items.get(itemId)?.toObject();

const RANK_BONUS = { Trained: 10, Expert: 15, Master: 20 };

/** A skill is created through a dialog because its rank sets its bonus. */
export function promptNewSkill(actor) {
  return new foundry.applications.api.DialogV2({
    window: { title: 'New Skill' },
    classes: ['macro-popup-dialog'],
    content: `
      <div class="macro_window">
        <div class="macro_desc" style="padding-left: 8px; padding-bottom: 0px;">
          <h4> Name </h4>
        </div>
        <input type="text" id="name" name="name" value="New Skill">
      </div>
      <div class="macro_window">
        <div class="macro_desc" style="padding-left: 8px; padding-bottom: 0px;">
          <h4> Rank </h4>
        </div>
        <select name="rank" id="rank">
          <option value="Trained">Trained</option>
          <option value="Expert">Expert</option>
          <option value="Master">Master</option>
        </select>
      </div>
    `,
    buttons: [
      {
        icon: 'fas fa-check',
        action: 'create',
        label: 'Create',
        callback: (event, button) => {
          const rank = button.form.querySelector('#rank')?.value;
          return actor.createEmbeddedDocuments('Item', [
            {
              name: button.form.querySelector('#name')?.value,
              type: 'skill',
              system: { rank, bonus: RANK_BONUS[rank] },
            },
          ]);
        },
      },
      { icon: 'fas fa-times', action: 'cancel', label: 'Cancel' },
    ],
    default: 'create',
  }).render({ force: true });
}
