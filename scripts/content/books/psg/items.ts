// The five Item packs the price lists and the class/skill tables become.
//
// The runtime schema is not reshaped to match the
// book, so this file is the adapter. Where the two disagree — a book `tier` against a runtime
// `rank`, a wound reference against the `woundEffect` string actor.js parses — the book form is
// translated here and the DataModel guard checks the result.
import { ARMOR } from '../../../../content/books/psg/armor.ts';
import { CLASSES, type ClassId } from '../../../../content/books/psg/classes.ts';
import { EQUIPMENT } from '../../../../content/books/psg/equipment.ts';
import {
  EQUIPMENT_COVERED_BY_WEAPON,
  LOADOUT_ARMOR,
  LOADOUT_GEAR,
} from '../../../../content/books/psg/gear.ts';
import { SKILLS } from '../../../../content/books/psg/skills.ts';
import { WEAPONS, type Damage } from '../../../../content/books/psg/weapons.ts';
import type { Cost, Modifier, WoundType } from '../../../../content/books/common.ts';
import type { ContentRecord, IdLookup, PackDefinition } from '../../record.ts';
import { html, PACKS, uuid } from './uuid.ts';

const SOURCE = 'content/books/psg';

const ICON = {
  skill: 'icons/svg/book.svg',
  class: 'icons/svg/mystery-man.svg',
  weapon: 'icons/svg/sword.svg',
  armor: 'icons/svg/shield.svg',
  item: 'icons/svg/item-bag.svg',
} as const;

/**
 * The generator's class pane is four cards side by side, and four copies of the same silhouette
 * tell a player nothing. Foundry core ships no class art, so each takes the core icon nearest its
 * trade: the Marine's rifle, the Android's clockwork, the Scientist's pill, the Teamster's cargo.
 */
const CLASS_ICON: Record<ClassId, string> = {
  marine: 'icons/svg/sword.svg',
  android: 'icons/svg/clockwork.svg',
  scientist: 'icons/svg/pill.svg',
  teamster: 'icons/svg/barrel.svg',
};

const RANK = { trained: 'Trained', expert: 'Expert', master: 'Master' } as const;
const STATS = ['strength', 'speed', 'intellect', 'combat'] as const;
const SAVES = ['sanity', 'fear', 'body'] as const;

/** The names actor.js expects in `system.woundEffect` before it maps them onto wound macros. */
const WOUND_NAME: Record<WoundType, string> = {
  'blunt-force': 'Blunt Force',
  bleeding: 'Bleeding',
  gunshot: 'Gunshot',
  'fire-explosives': 'Fire & Explosives',
  'gore-massive': 'Gore & Massive',
};

const SIGN: Record<Modifier, string> = { advantage: ' [+]', disadvantage: ' [-]' };

const credits = (cost: Cost | null): number => cost?.value ?? 0;

/** The catalog is `as const`, so the modes are read through the interface rather than the union. */
const damageModes = (damage: Damage | null): { label: string; formula: string }[] =>
  damage?.modes?.map((mode) => ({ label: mode.label, formula: mode.formula })) ?? [];

function modifierNote(modifiers: readonly Modifier[]): string | null {
  if (!modifiers.length) return null;
  return modifiers.map((m) => (m === 'advantage' ? 'Rolls at [+].' : 'Rolls at [-].')).join(' ');
}

const skills: PackDefinition = {
  ...PACKS.skills,
  documentType: 'Item',
  load: (ids: IdLookup): ContentRecord[] =>
    SKILLS.map((skill) => ({
      contentId: skill.id,
      name: skill.name,
      img: ICON.skill,
      body: {
        kind: 'Item',
        type: 'skill',
        system: {
          description: html(skill.description),
          rank: RANK[skill.tier],
          bonus: skill.bonus,
          // The generator compares these against the UUIDs a class granted, so they are UUIDs and
          // not ids — see actor-generator.js's showSkillDialog.
          prerequisite_ids: skill.prerequisites.map((id) => uuid(ids, 'skills', id)),
        },
      },
      provenance: { source: `${SOURCE}/skills.ts`, sourceId: skill.id, page: skill.source.page },
    })),
};

/**
 * The book's `adjustments` against the runtime's flat `base_adjustment` / `selected_adjustment`.
 * Three rules and one choice: a named target is a key (stats and saves share the key space),
 * `all` fans out, and a null target is something the player picks.
 */
function adjustments(klass: (typeof CLASSES)[number], ids: IdLookup) {
  const base: Record<string, number | string[]> = {
    strength: 0, speed: 0, intellect: 0, combat: 0, sanity: 0, fear: 0, body: 0, max_wounds: 0,
    skills_granted: klass.skills.granted.map((id) => uuid(ids, 'skills', id)),
  };
  const chooseStat: { modification: number; stats: string[] }[] = [];

  for (const adj of klass.adjustments) {
    const spread = adj.kind === 'save' ? SAVES : STATS;
    if (adj.kind === 'max-wounds') {
      base.max_wounds = (base.max_wounds as number) + adj.value;
    } else if (adj.target === 'all') {
      for (const key of spread) base[key] = (base[key] as number) + adj.value;
    } else if (adj.target === null) {
      for (let i = 0; i < (adj.choose ?? 1); i += 1) {
        chooseStat.push({ modification: adj.value, stats: [...spread] });
      }
    } else {
      base[adj.target] = (base[adj.target] as number) + adj.value;
    }
  }
  return { base, chooseStat };
}

const noPicks = () => ({ trained: 0, expert: 0, expert_full_set: 0, master: 0, master_full_set: 0 });

type Picks = ReturnType<typeof noPicks>;

/**
 * A pick the book qualifies with "and an Expert and Trained Skill prerequisite" is the runtime's
 * *_full_set — the dialog that walks the whole prerequisite chain. That is the Scientist's Master
 * Skill, and it is the one class adjustment the plan left open.
 */
function addPick(into: Picks, tier: keyof typeof RANK, count: number, withPrerequisites = false): void {
  const key = withPrerequisites && tier !== 'trained' ? (`${tier}_full_set` as keyof Picks) : tier;
  into[key] += count;
}

function pickLabel(picks: { tier: keyof typeof RANK; count: number }[]): string {
  return picks
    .map((p) => `${p.count} ${RANK[p.tier]} Skill${p.count === 1 ? '' : 's'}`)
    .join(' and ');
}

const classes: PackDefinition = {
  ...PACKS.classes,
  documentType: 'Item',
  load: (ids: IdLookup): ContentRecord[] =>
    CLASSES.map((klass) => {
      const { base, chooseStat } = adjustments(klass, ids);
      const and = noPicks();
      for (const choice of klass.skills.choices) {
        addPick(and, choice.tier, choice.count, choice.withPrerequisites);
      }

      // One branch is something the player simply gets; more than one is a choice, and the runtime
      // models those differently — choose_skill_and against choose_skill_or.
      const branches = klass.skills.bonus.options;
      const or: unknown[][] = [];
      if (branches.length === 1) {
        for (const pick of branches[0]!) addPick(and, pick.tier, pick.count);
      } else {
        or.push(
          branches.map((branch) => {
            const picks = noPicks();
            for (const pick of branch) addPick(picks, pick.tier, pick.count);
            return { name: pickLabel([...branch]), from_list: [], ...picks };
          }),
        );
      }

      return {
        contentId: klass.id,
        name: klass.name,
        img: CLASS_ICON[klass.id] ?? ICON.class,
        body: {
          kind: 'Item',
          type: 'class',
          system: {
            description: html(klass.description),
            trauma_response: klass.traumaResponse,
            robotic: klass.id === 'android',
            base_adjustment: base,
            selected_adjustment: { choose_stat: chooseStat, choose_skill_and: and, choose_skill_or: or },
            roll_tables: {
              loadout: uuid(ids, 'rolltables', `loadout-${klass.id}`),
              trinket: uuid(ids, 'rolltables', 'trinkets'),
              patch: uuid(ids, 'rolltables', 'patches'),
            },
          },
        },
        provenance: { source: `${SOURCE}/classes.ts`, sourceId: klass.id, page: klass.source.page },
      };
    }),
};

const weapons: PackDefinition = {
  ...PACKS.weapons,
  documentType: 'Item',
  load: (): ContentRecord[] =>
    WEAPONS.map((weapon) => ({
      contentId: weapon.id,
      name: weapon.name,
      img: ICON.weapon,
      body: {
        kind: 'Item',
        type: 'weapon',
        system: {
          description: html(weapon.special, modifierNote(weapon.modifiers)),
          antiArmor: weapon.damage?.antiArmor ?? false,
          // Unarmed's "Str/10" is not a formula, and actor.js branches on that exact string.
          damage: weapon.damage ? (weapon.damage.formula ?? weapon.damage.raw.replace(/\s*DMG$/, '')) : '',
          damageModes: damageModes(weapon.damage),
          ammo: weapon.shots ?? 0,
          shots: weapon.shots ?? 0,
          curShots: weapon.shots ?? 0,
          shotsPerFire: 1,
          useAmmo: weapon.shots !== null,
          ammoType: '',
          critDmg: '',
          woundEffect: weapon.wounds
            .map((w) => WOUND_NAME[w.type] + w.modifiers.map((m) => SIGN[m]).join(''))
            .join(' '),
          bonus: 0,
          weight: 0,
          cost: credits(weapon.cost),
          // The band token, as the catalog spells it; its `null` is the runtime's `none`.
          range: weapon.range ?? 'none',
        },
      },
      provenance: { source: `${SOURCE}/weapons.ts`, sourceId: weapon.id, page: weapon.source.page },
    })),
};

const armor: PackDefinition = {
  ...PACKS.armor,
  documentType: 'Item',
  load: (): ContentRecord[] => [
    ...ARMOR.map(
      (a): ContentRecord => ({
        contentId: a.id,
        name: a.name,
        img: ICON.armor,
        body: {
          kind: 'Item',
          type: 'armor',
          system: {
            description: html(a.description),
            armorPoints: a.armorPoints,
            damageReduction: a.damageReduction,
            speed: a.speed.raw,
            // The actor sheets step oxygen by one per click, so the sheet's unit is the hour.
            oxygenMax: a.oxygen ? (a.oxygen.minutes ?? 0) / 60 : 0,
            oxygenCurrent: a.oxygen ? (a.oxygen.minutes ?? 0) / 60 : 0,
            weight: 0,
            cost: credits(a.cost),
            equipped: false,
            features: a.special ?? '',
          },
        },
        provenance: { source: `${SOURCE}/armor.ts`, sourceId: a.id, page: a.source.page },
      }),
    ),
    ...LOADOUT_ARMOR.map(
      (a): ContentRecord => ({
        contentId: a.id,
        name: a.name,
        img: ICON.armor,
        body: {
          kind: 'Item',
          type: 'armor',
          system: {
            description: html(a.description),
            armorPoints: a.armorPoints,
            damageReduction: 0,
            speed: 'Normal',
            oxygenMax: 0,
            oxygenCurrent: 0,
            weight: 0,
            // The loadout tables hand these out; the book never prices them, so neither does this.
            cost: 0,
            equipped: false,
            features: '',
          },
        },
        provenance: { source: `${SOURCE}/gear.ts`, sourceId: a.id, page: a.source.page },
      }),
    ),
  ],
};

const equipment: PackDefinition = {
  ...PACKS.equipment,
  documentType: 'Item',
  load: (): ContentRecord[] => {
    const covered = new Set<string>(EQUIPMENT_COVERED_BY_WEAPON);
    return [
      // The price list prints the Crowbar twice, once with damage. Emitting both would put two
      // documents of the same name in front of modifyItem, which resolves items by name.
      ...EQUIPMENT.filter((e) => !covered.has(e.id)).map(
        (e): ContentRecord => ({
          contentId: e.id,
          name: e.name,
          img: ICON.item,
          body: {
            kind: 'Item',
            type: 'item',
            system: {
              description: html(e.description),
              quantity: 1,
              weight: 0,
              cost: credits(e.cost),
            },
          },
          provenance: { source: `${SOURCE}/equipment.ts`, sourceId: e.id, page: e.source.page },
        }),
      ),
      ...LOADOUT_GEAR.map(
        (e): ContentRecord => ({
          contentId: e.id,
          name: e.name,
          img: ICON.item,
          body: {
            kind: 'Item',
            type: 'item',
            system: { description: html(e.description), quantity: 1, weight: 0, cost: 0 },
          },
          provenance: { source: `${SOURCE}/gear.ts`, sourceId: e.id, page: e.source.page },
        }),
      ),
    ];
  },
};

export const ITEM_PACKS = [skills, classes, weapons, armor, equipment];
