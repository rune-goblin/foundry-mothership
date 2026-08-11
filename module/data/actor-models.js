// Replaces the Actor half of template.json. See item-models.js for the same conventions;
// test/actor-models.test.ts asserts these reproduce template.json field-for-field.

const { fields } = foundry.data;

const num = (initial, integer = false) =>
  new fields.NumberField({ required: true, nullable: false, initial, integer });

const str = (initial = '') => new fields.StringField({ required: true, blank: true, initial });

const bool = (initial = false) => new fields.BooleanField({ required: true, initial });

const html = (initial = '') => new fields.HTMLField({ required: true, blank: true, initial });

// A tracked pool: health, wounds, and the derived net HP all share this shape.
const pool = (value, max, label, { min = 0, withMax = true } = {}) =>
  new fields.SchemaField({
    value: num(value),
    min: num(min),
    ...(withMax ? { max: num(max) } : {}),
    label: str(label),
  });

// A rollable stat. Characters carry `mod`, creatures carry `enabled`, armour carries both
// plus cover and damage reduction — hence the flags rather than three near-copies.
const stat = (value, label, rollLabel, { mod = false, enabled = null, armor = false } = {}) =>
  new fields.SchemaField({
    value: num(value),
    ...(mod || armor ? { mod: num(0) } : {}),
    min: num(0),
    max: num(99),
    ...(armor ? { damageReduction: num(0), cover: str('none') } : {}),
    label: str(label),
    rollLabel: str(rollLabel),
    ...(enabled === null ? {} : { enabled: bool(enabled) }),
  });

const counter = (value, max) => new fields.SchemaField({ value: num(value), max: num(max) });

const baseSchema = () => ({
  health: pool(10, 10, 'Health'),
  hits: pool(0, 2, 'Wounds'),
  netHP: pool(20, 20, 'Net HP'),
  bleeding: pool(0, null, 'Bleeding', { withMax: false }),
});

export class MoshCharacter extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...baseSchema(),
      biography: html(''),
      notes: html(''),
      weight: new fields.SchemaField({ current: num(0), capacity: num(0) }),
      class: new fields.SchemaField({ value: str('') }),
      rank: new fields.SchemaField({ value: str('') }),
      pronouns: new fields.SchemaField({ value: str('') }),
      credits: new fields.SchemaField({ value: str('') }),
      stressdesc: new fields.SchemaField({ value: str('') }),
      // `html` is a number here, not a string -- the sheet builds the XP pips from it.
      xp: new fields.SchemaField({ value: num(0), html: num(0), selectedSkill: str('') }),
      attributes: new fields.SchemaField({ level: new fields.SchemaField({ value: num(0) }) }),
      stats: new fields.SchemaField({
        strength: stat(10, 'Strength', 'Strength Check', { mod: true }),
        speed: stat(10, 'Speed', 'Speed Check', { mod: true }),
        intellect: stat(10, 'Intellect', 'Intellect Check', { mod: true }),
        combat: stat(10, 'Combat', 'Combat Check', { mod: true }),
        sanity: stat(10, 'Sanity', 'Sanity Save', { mod: true }),
        fear: stat(10, 'Fear', 'Fear Save', { mod: true }),
        body: stat(10, 'Body', 'Body Save', { mod: true }),
        armor: stat(0, 'Armor', 'Armor Save', { armor: true }),
      }),
      other: new fields.SchemaField({
        stress: pool(2, 20, 'Stress', { min: 2 }),
        resolve: pool(0, 15, 'Resolve'),
        stressdesc: new fields.SchemaField({ value: str('') }),
      }),
    };
  }
}

export class MoshCreature extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...baseSchema(),
      biography: html(''),
      notes: html(''),
      description: html('This is a description'),
      xp: new fields.SchemaField({ value: num(1), html: str(''), selectedSkill: str('') }),
      stats: new fields.SchemaField({
        combat: stat(10, 'Combat', 'Combat Check', { enabled: true }),
        instinct: stat(10, 'Instinct', 'Instinct Check', { enabled: true }),
        speed: stat(10, 'Speed', 'Speed Check', { enabled: false }),
        loyalty: stat(10, 'Loyalty', 'Loyalty Check', { enabled: false }),
        armor: stat(0, 'Armor', 'Armor Save', { armor: true, enabled: false }),
        sanity: stat(10, 'Sanity', 'Sanity Save', { enabled: false }),
      }),
      // The creature-settings swarm toggle multiplies combat by the creature's remaining
      // wounds and stashes the original here to restore on the way back. Absent from the
      // schema, the stash was cleaned off and the multiplication became permanent.
      swarm: new fields.SchemaField({
        enabled: bool(false),
        combat: new fields.SchemaField({ value: num(0) }),
      }),
    };
  }
}

export class MoshShip extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...baseSchema(),
      biography: html(''),
      description: html('This is a description'),
      type: str(''),
      class: str(''),
      // The ship-sheet header treats these as free text, not currency: no data-dtype, and
      // values like "2,000,000cr" are what the sheet is for.
      cost: str(''),
      owed: str(''),
      make: str(''),
      transponder: bool(false),
      xp: new fields.SchemaField({ value: num(1) }),
      images: new fields.SchemaField({
        layout: new fields.FilePathField({
          categories: ['IMAGE'], required: true, blank: true,
          initial: 'systems/mothershiprpg/images/Galloway_Top.png',
        }),
        beauty: new fields.FilePathField({
          categories: ['IMAGE'], required: true, blank: true,
          initial: 'systems/mothershiprpg/images/Galloway_Top.png',
        }),
      }),
      runSetup: bool(true),
      megadamage: new fields.SchemaField({
        html: str(''),
        hits: new fields.ArrayField(new fields.StringField()),
        menu: new fields.SchemaField({ html: str('') }),
        open: bool(false),
      }),
      // Every ship stat carries `mod`: parseRollResult's caller adds `stats[attribute].mod` to
      // the target of any stat roll, and _deriveShip() is empty, so nothing recomputes it.
      // Only four are exposed by ship-sheet.html today; the rest would be the same latent hole.
      stats: new fields.SchemaField({
        armor: stat(10, 'Armor', 'Armor Save', { mod: true }),
        combat: stat(10, 'Combat', 'Combat Check', { mod: true }),
        intellect: stat(10, 'Intellect', 'Intellect Check', { mod: true }),
        speed: stat(10, 'Speed', 'Speed Check', { mod: true }),
        thrusters: stat(10, 'Thrusters', 'Thrusters Save', { mod: true }),
        battle: stat(10, 'Battle', 'Battle Save', { mod: true }),
        systems: stat(10, 'Systems', 'Systems Save', { mod: true }),
        bankruptcy: stat(10, 'Bankruptcy', 'Bankruptcy Save', { mod: true }),
      }),
      supplies: new fields.SchemaField({
        // The numeric keys are the damage thresholds the hull has already crossed.
        hull: new fields.SchemaField({
          value: num(10), max: num(10), 75: num(0), 50: num(0), 25: num(0),
        }),
        fuel: counter(10, 10),
        stock: counter(10, 10),
        crew: counter(10, 10),
        oxygen: new fields.SchemaField({ value: num(0) }),
        'warp-cores': new fields.SchemaField({ value: num(0) }),
        cryopods: new fields.SchemaField({ value: num(0) }),
        'escape-pods': new fields.SchemaField({ value: num(0) }),
        upgrades: counter(0, 0),
      }),
      'weapon-stats': new fields.SchemaField({
        weapons: counter(0, 1),
        megadamage: counter(0, 1),
        hardpoints: counter(0, 1),
      }),
    };
  }
}

export const ACTOR_MODELS = {
  character: MoshCharacter,
  creature: MoshCreature,
  ship: MoshShip,
};
