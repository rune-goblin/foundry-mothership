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
    return { ...base(), roll: str('') };
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

export class MoshClass extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...base(),
      trauma_response: str(''),
      robotic: bool(true),
      // These eight keys are a contract, not a bag: actor-generator.js writes every key except
      // skills_granted into `input[name="system.stats.<key>.bonus"]`, so anything added here is
      // applied as a stat bonus. Stats and saves share the one flat key space, which is what the
      // book's adjustments map onto (MODERNIZATION.md §27).
      base_adjustment: new fields.SchemaField({
        strength: num(0),
        speed: num(0),
        intellect: num(0),
        combat: num(0),
        sanity: num(0),
        fear: num(0),
        body: num(0),
        max_wounds: num(0),
        skills_granted: uuidList(),
      }),
      // Free-form until S5. choose_skill_or is an array of arrays whose entries the character
      // generator treats as two things at once: showOptionsDialog resolves one and hands it
      // straight to popUpSkillOptions, which reads it as a pick-set. A strict SchemaField would
      // pin a shape the generator is still moving; S5 untangles that, and tightens this.
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
  condition: MoshCondition,
  class: MoshClass,
};
