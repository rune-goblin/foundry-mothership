// The embedded-item operations an actor sheet's rows drive. AppV1 bound each of these by jQuery
// selector in `activateListeners` and reached the item through `duplicate(getEmbeddedDocument(...))`;
// they are plain functions now, called from the component with the id the row already carries.

import { svelteDialog } from '../../dialogs/svelte-dialog.ts';
import { localize } from '../../i18n.ts';
import { rankBonus, SKILL_RANKS } from '../../rules.ts';
import NewSkill from './NewSkill.svelte';

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

/** Skill items store the rank capitalized, and `Mosh.SkillRank<Rank>` names it the same way. */
const stored = (rank) => `${rank[0].toUpperCase()}${rank.slice(1)}`;

/**
 * A skill is created through a dialog because its rank sets its bonus — and the bonus is
 * `rules.ts`'s, not a second table kept here (audit U5).
 */
export async function promptNewSkill(actor) {
  const skill = await svelteDialog({
    component: NewSkill,
    props: {
      nameLabel: localize('Mosh.Name'),
      rankLabel: localize('Mosh.SkillRank'),
      ranks: SKILL_RANKS.map((rank) => ({
        value: stored(rank),
        label: localize(`Mosh.SkillRank${stored(rank)}`),
      })),
    },
    title: localize('Mosh.CreateSkill'),
    initial: { name: localize('Mosh.NewSkill'), rank: stored(SKILL_RANKS[0]) },
    buttons: [
      {
        action: 'create',
        label: localize('Mosh.Create'),
        icon: 'fas fa-check',
        default: true,
        answer: (draft) => draft,
      },
      { action: 'cancel', label: localize('Mosh.Cancel'), icon: 'fas fa-times', answer: () => null },
    ],
  });
  if (skill === null) return null;

  return await actor.createEmbeddedDocuments('Item', [
    { name: skill.name, type: 'skill', system: { rank: skill.rank, bonus: rankBonus(skill.rank) } },
  ]);
}
