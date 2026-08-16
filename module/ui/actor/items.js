// The embedded-item operations an actor sheet's rows drive. AppV1 bound each of these by jQuery
// selector in `activateListeners` and reached the item through `duplicate(getEmbeddedDocument(...))`;
// they are plain functions now, called from the component with the id the row already carries.

import { svelteDialog } from '../../dialogs/svelte-dialog.ts';
import { localize } from '../../i18n.ts';
import { rankBonus, SKILL_RANKS, storedRank } from '../../rules.ts';
import { rankChoices } from '../skill/ranks.js';
import NewSkill from './NewSkill.svelte';
import PickFromPack from './PickFromPack.svelte';

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

/** What each pickable type shows in the picker, and which pack its rows come from. */
const PICKS = {
  skill: {
    pack: 'mothershiprpg.skills_1e',
    title: 'Mothership.AddSkill',
    headers: ['Mothership.SkillName', 'Mothership.SkillRank', 'Mothership.SkillBonus'],
    cells: (doc) => [doc.system.rank, `+${doc.system.bonus}`],
  },
  weapon: {
    pack: 'mothershiprpg.weapons_1e',
    title: 'Mothership.AddWeapon',
    headers: ['Mothership.WeaponName', 'Mothership.Damage', 'Mothership.Range'],
    cells: (doc) => [doc.system.damage, localize(`Mothership.RangeBand.${doc.system.range}`)],
  },
  item: {
    pack: 'mothershiprpg.equipment_1e',
    title: 'Mothership.AddItem',
    headers: ['Mothership.ItemName', 'Mothership.Cost', 'Mothership.Weight'],
    cells: (doc) => [doc.system.cost, doc.system.weight],
  },
  armor: {
    pack: 'mothershiprpg.armor_1e',
    title: 'Mothership.AddArmor',
    headers: ['Mothership.ArmorName', 'Mothership.AP', 'Mothership.DR'],
    cells: (doc) => [doc.system.armorPoints, doc.system.damageReduction],
  },
  condition: {
    pack: 'mothershiprpg.conditions_1e',
    title: 'Mothership.AddCondition',
    headers: ['Mothership.Condition'],
    cells: () => [],
  },
};

const byName = (a, b) => a.name.localeCompare(b.name);

/** PSG 22's tree runs weakest to strongest; an unknown rank sorts last rather than first. */
const rankIndex = (doc) => {
  const index = SKILL_RANKS.findIndex((rank) => storedRank(rank) === doc.system.rank);
  return index === -1 ? SKILL_RANKS.length : index;
};

const byRankThenName = (a, b) => rankIndex(a) - rankIndex(b) || byName(a, b);

/**
 * PSG 22 — an Expert or Master skill is learned from one of the skills that point at it: the
 * tree's converging arrows are alternatives, and no skill in the book needs two at once. The
 * prerequisite ids are pack UUIDs; what an actor owns are copies, so the tie is the name.
 */
function markUnmet(sorted, actor) {
  const names = new Map(sorted.map((doc) => [doc.uuid, doc.name]));
  const owned = new Set(
    actor.items.filter((item) => item.type === 'skill').map((item) => item.name),
  );
  return (doc) => {
    const required = doc.system.prerequisite_ids ?? [];
    return required.length > 0 && !required.some((uuid) => owned.has(names.get(uuid)));
  };
}

/** The blank-create path, kept for the fallback when a pack is missing or empty. */
const blank = (actor, type) =>
  type === 'skill' ? promptNewSkill(actor) : createItem(actor, type);

/**
 * Add from the book: the panel's + opens the matching compendium as a filterable table, and Add
 * embeds a copy of the row picked. Cancel — or Add with nothing picked — adds nothing. Skills
 * run weakest rank first, with prerequisite enforcement the toggle can lift.
 */
export async function promptAddItem(actor, type) {
  const spec = PICKS[type];
  const pack = globalThis.game?.packs?.get(spec.pack);
  const docs = (await pack?.getDocuments()) ?? [];
  if (docs.length === 0) return blank(actor, type);

  const skills = type === 'skill';
  const sorted = [...docs].sort(skills ? byRankThenName : byName);
  const unmet = skills ? markUnmet(sorted, actor) : () => false;
  const picked = await svelteDialog({
    component: PickFromPack,
    props: {
      filterLabel: localize('Mothership.Filter'),
      headers: spec.headers.map((key) => localize(key)),
      enforceLabel: skills ? localize('Mothership.EnforcePrerequisites') : '',
      rows: sorted.map((doc) => ({
        id: doc.id,
        name: doc.name,
        img: doc.img,
        cells: spec.cells(doc),
        unmet: unmet(doc),
      })),
    },
    title: localize(spec.title),
    initial: null,
    width: 600,
    buttons: [
      {
        action: 'add',
        label: localize('Mothership.Add'),
        icon: 'fas fa-check',
        default: true,
        answer: (id) => ({ id }),
      },
      { action: 'cancel', label: localize('Mothership.Cancel'), icon: 'fas fa-times', answer: () => null },
    ],
  });

  if (picked === null) return null;
  const doc = sorted.find((entry) => entry.id === picked.id);
  if (doc === undefined) return null;
  return actor.createEmbeddedDocuments('Item', [doc.toObject()]);
}

/**
 * A skill is created through a dialog because its rank sets its bonus — and the bonus is
 * `rules.ts`'s, not a second table kept here (audit U5).
 */
export async function promptNewSkill(actor) {
  const skill = await svelteDialog({
    component: NewSkill,
    props: {
      nameLabel: localize('Mothership.Name'),
      rankLabel: localize('Mothership.SkillRank'),
      ranks: rankChoices(),
    },
    title: localize('Mothership.CreateSkill'),
    initial: { name: localize('Mothership.NewSkill'), rank: storedRank(SKILL_RANKS[0]) },
    buttons: [
      {
        action: 'create',
        label: localize('Mothership.Create'),
        icon: 'fas fa-check',
        default: true,
        answer: (draft) => draft,
      },
      { action: 'cancel', label: localize('Mothership.Cancel'), icon: 'fas fa-times', answer: () => null },
    ],
  });
  if (skill === null) return null;

  return await actor.createEmbeddedDocuments('Item', [
    { name: skill.name, type: 'skill', system: { rank: skill.rank, bonus: rankBonus(skill.rank) } },
  ]);
}
