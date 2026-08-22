import { svelteDialog } from '../../dialogs/svelte-dialog.ts';
import { localize } from '../../i18n.ts';
import { rankBonus, SKILL_RANKS, storedRank } from '../../rules.ts';
import { rankChoices } from '../skill/ranks.js';
import NewSkill from './NewSkill.svelte';
import PickFromPack from './PickFromPack.svelte';

// contextmenu (right click) is consumed here so it doesn't also open the browser context menu.
export const stepBy = (event) => {
  if (event.type !== 'contextmenu') return 1;
  event.preventDefault();
  return -1;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function adjust(actor, itemId, path, delta, { min = -Infinity, max = Infinity } = {}) {
  const item = actor.items.get(itemId);
  if (!item) return;
  const current = Number(foundry.utils.getProperty(item.system, path) ?? 0);
  return actor.updateEmbeddedDocuments('Item', [
    { _id: itemId, [`system.${path}`]: clamp(current + delta, min, max) },
  ]);
}

// Shots and ammo move together, which is why this isn't two `adjust` calls.
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

const PICKS = {
  skill: {
    pack: 'mothershiprpg.skills_1e',
    title: 'Mothership.AddSkill',
    blank: 'Mothership.NewSkill',
    headers: ['Mothership.SkillName', 'Mothership.SkillRank', 'Mothership.SkillBonus'],
    cells: (doc) => [doc.system.rank, `+${doc.system.bonus}`],
  },
  weapon: {
    pack: 'mothershiprpg.weapons_1e',
    title: 'Mothership.AddWeapon',
    blank: 'Mothership.NewWeapon',
    headers: ['Mothership.WeaponName', 'Mothership.Damage', 'Mothership.Range'],
    cells: (doc) => [doc.system.damage, localize(`Mothership.RangeBand.${doc.system.range}`)],
  },
  item: {
    pack: 'mothershiprpg.equipment_1e',
    title: 'Mothership.AddItem',
    blank: 'Mothership.NewGear',
    headers: ['Mothership.ItemName', 'Mothership.Cost', 'Mothership.Weight'],
    cells: (doc) => [doc.system.cost, doc.system.weight],
  },
  armor: {
    pack: 'mothershiprpg.armor_1e',
    title: 'Mothership.AddArmor',
    blank: 'Mothership.NewArmor',
    headers: ['Mothership.ArmorName', 'Mothership.AP', 'Mothership.DR'],
    cells: (doc) => [doc.system.armorPoints, doc.system.damageReduction],
  },
  condition: {
    pack: 'mothershiprpg.conditions_1e',
    title: 'Mothership.AddCondition',
    blank: 'Mothership.NewCondition',
    headers: ['Mothership.Condition'],
    cells: () => [],
  },
};

const byName = (a, b) => a.name.localeCompare(b.name);

/** Between the picker and the sheet a Create opens beside it, and how far it cascades instead. */
const SHEET_GAP = 8;
const SHEET_CASCADE = 44;

/**
 * Foundry centres a new window, which is where the picker already is — so the list the new row
 * just joined would sit behind its own editor. Stand the sheet beside the picker where the screen
 * has room for both, and cascade it off the picker's corner where it does not.
 */
function placeBeside(sheet, anchor) {
  const rect = anchor?.getBoundingClientRect?.();
  const width = sheet.position?.width ?? 0;
  if (rect === undefined || width <= 0) return;

  const fits = rect.right + SHEET_GAP + width <= globalThis.innerWidth;
  const left = fits ? rect.right + SHEET_GAP : rect.left + SHEET_CASCADE;
  sheet.setPosition?.({
    left: Math.max(0, Math.min(left, globalThis.innerWidth - width)),
    top: fits ? rect.top : rect.top + SHEET_CASCADE,
  });
}

/** PSG 22's tree runs weakest to strongest; an unknown rank sorts last rather than first. */
const rankIndex = (doc) => {
  const index = SKILL_RANKS.findIndex((rank) => storedRank(rank) === doc.system.rank);
  return index === -1 ? SKILL_RANKS.length : index;
};

const byRankThenName = (a, b) => rankIndex(a) - rankIndex(b) || byName(a, b);

// Prerequisite ids are pack UUIDs; what an actor owns are copies, so match on name instead.
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

// Fallback when there is nothing at all to pick from.
const blank = (actor, type) =>
  type === 'skill' ? promptNewSkill(actor) : createItem(actor, type);

/** Everything of this type the world holds, which is what Create adds to. */
const worldDocs = (type) =>
  [...(globalThis.game?.items ?? [])].filter((doc) => doc.type === type).sort(byName);

/** Writes a world document and opens its sheet; the picker's own hooks bring the row in. */
async function createInWorld(type, anchor) {
  const documentClass = globalThis.game?.items?.documentClass ?? globalThis.Item;
  const doc = await documentClass?.create({ name: localize(PICKS[type].blank), type });
  const sheet = doc?.sheet;
  if (!sheet) return doc;

  await sheet.render({ force: true });
  placeBeside(sheet, anchor);
  return doc;
}

export async function promptAddItem(actor, type) {
  const spec = PICKS[type];
  const pack = globalThis.game?.packs?.get(spec.pack);
  const docs = (await pack?.getDocuments()) ?? [];

  const skills = type === 'skill';
  const sorted = [...docs].sort(skills ? byRankThenName : byName);
  const unmet = skills ? markUnmet(sorted, actor) : () => false;

  // Keyed by uuid, not id: the pack half and the world half are separate id spaces, and one key
  // has to resolve back to exactly one document.
  const rowOf = (group) => (doc) => ({
    id: doc.uuid,
    name: doc.name,
    cells: spec.cells(doc),
    unmet: unmet(doc),
    group,
  });

  const world = localize('Mothership.FromThisWorld');
  const rows = () => [...sorted.map(rowOf('')), ...worldDocs(type).map(rowOf(world))];

  if (rows().length === 0) return blank(actor, type);

  const picked = await svelteDialog({
    component: PickFromPack,
    props: {
      filterLabel: localize('Mothership.Filter'),
      headers: spec.headers.map((key) => localize(key)),
      enforceLabel: skills ? localize('Mothership.EnforcePrerequisites') : '',
      createLabel: localize('Mothership.Create'),
      oncreate: (anchor) => createInWorld(type, anchor),
      reload: rows,
      rows: rows(),
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
  const byUuid = (entry) => entry.uuid === picked.id;
  const doc = sorted.find(byUuid) ?? worldDocs(type).find(byUuid);
  if (doc === undefined) return null;
  return actor.createEmbeddedDocuments('Item', [doc.toObject()]);
}

// Bonus comes from rules.ts's rankBonus(), not a duplicate table here.
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
