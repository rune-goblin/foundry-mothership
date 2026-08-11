// Replaces the Item half of template.json, which v14 deprecates (removed in v16). A
// registered dataModel wins over template.json, so types migrate one at a time.
//
// Every schema here reproduces its template.json defaults exactly -- test/item-models.test.ts
// asserts that field-for-field, so a typo fails CI instead of silently changing a default.

const { fields } = foundry.data;

const num = (initial, integer = false) =>
  new fields.NumberField({ required: true, nullable: false, initial, integer });

const str = (initial = '') => new fields.StringField({ required: true, blank: true, initial });

const bool = (initial = false) => new fields.BooleanField({ required: true, initial });

const uuidList = () => new fields.ArrayField(new fields.StringField());

// Shared by every item type.
const base = () => ({ description: new fields.HTMLField({ required: true, blank: true, initial: '' }) });

export class MoshItem extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return { ...base(), quantity: num(1, true), weight: num(0), cost: num(0) };
  }
}

export class MoshSkill extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return { ...base(), rank: str('Trained'), bonus: num(10), prerequisite_ids: uuidList() };
  }
}

export class MoshWeapon extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...base(),
      antiArmor: bool(false),
      damage: str('1d10'),
      ammo: num(10, true),
      shots: num(1, true),
      curShots: num(0, true),
      shotsPerFire: num(1, true),
      useAmmo: bool(false),
      ammoType: str(''),
      wound: str(''),
      critDmg: str(''),
      woundEffect: str(''),
      bonus: num(0),
      weight: num(0),
      cost: num(0),
      ranges: new fields.SchemaField({
        short: num(0), medium: num(0), long: num(0), value: str(''),
      }),
    };
  }
}

export class MoshArmor extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...base(),
      armorPoints: num(1),
      damageReduction: num(0),
      speed: str(''),
      oxygenMax: num(0),
      oxygenCurrent: num(0),
      weight: num(0),
      cost: num(0),
      // Absent from the original template.json, yet bound by the armor sheet and read by
      // _deriveCharacter/_deriveCreature. Under template.json unknown keys survived, so this
      // worked; a SchemaField cleans them off, which silently stopped armour from equipping.
      equipped: bool(false),
      features: str(''),
    };
  }
}

export class MoshAbility extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return { ...base(), text: str('An Ability'), roll: str('') };
  }
}

export class MoshModule extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...base(),
      quantity: num(1, true),
      hull: num(1),
      totalHull: num(1),
      feature: str(''),
      offline: bool(false),
      cost: num(0),
    };
  }
}

export class MoshCondition extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...base(),
      severity: num(1),
      treatment: new fields.SchemaField({ value: num(0), html: str('') }),
    };
  }
}

export class MoshCrew extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return { ...base(), text: str(''), job: str('') };
  }
}

export class MoshRepair extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return { ...base(), quantity: num(1, true), major: bool(false) };
  }
}

export class MoshClass extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...base(),
      source: str(''),
      author: str(''),
      link: str(''),
      trauma_response: str(''),
      robotic: bool(true),
      common_skills: uuidList(),
      // base_adjustment and selected_adjustment stay free-form ObjectFields on purpose.
      // selected_adjustment.choose_skill_or is an array of arrays of objects, and
      // class-sheet.js writes a derived `from_list_names` onto each entry while rendering --
      // a strict SchemaField would clean that back off. Tighten these once the character
      // generator stops mutating the model it renders from.
      base_adjustment: new fields.ObjectField({
        required: true,
        initial: () => ({
          strength: 0, speed: 0, intellect: 0, combat: 0, sanity: 0, fear: 0,
          body: 0, max_wounds: 0, skills_granted: [],
        }),
      }),
      selected_adjustment: new fields.ObjectField({
        required: true,
        initial: () => ({
          choose_stat: [],
          choose_skill_and: {
            trained: 0, expert: 0, expert_full_set: 0, master: 0, master_full_set: 0,
          },
          choose_skill_or: [],
        }),
      }),
      roll_tables: new fields.SchemaField({
        loadout: str(''), trinket: str(''), patch: str(''),
      }),
    };
  }
}

export const ITEM_MODELS = {
  item: MoshItem,
  skill: MoshSkill,
  weapon: MoshWeapon,
  armor: MoshArmor,
  ability: MoshAbility,
  module: MoshModule,
  condition: MoshCondition,
  crew: MoshCrew,
  repair: MoshRepair,
  class: MoshClass,
};
