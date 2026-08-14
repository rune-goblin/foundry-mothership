import { CHARACTER_CREATION } from '../../../content/books/psg/character-creation.ts';
import { parseResults, drawnRow } from './table-result.js';
import { loadSkills, loadClasses } from './skills.js';
import { pickSkills, pickBonusOption, pickStat, PICK_KINDS } from './dialogs.js';
import { localize, format } from '../../i18n.ts';

/**
 * The draft store (architecture.md Decision 3). The generator is a wizard, not a sheet: the actor
 * is read once when the window opens and written once on save, so the state lives here rather than
 * in the form. The AppV1 window had no state at all — every step reached into the DOM with
 * `this._element.find(...)`, and `getData()` wrote its render scaffolding onto the live actor.
 */

const STATS = ['strength', 'speed', 'intellect', 'combat'];
const SAVES = ['sanity', 'fear', 'body'];

/** Everything base_adjustment can raise, plus the health bonus the window offers beside it. */
const BONUSES = [...STATS, ...SAVES, 'health', 'max_wounds'];

const step = (id) => CHARACTER_CREATION.steps.find((s) => s.id === id);

/** The book's dice, read from the catalog rather than copied out of it. */
export const FORMULA = {
  stats: step('step-1-roll-stats').roll.formula,
  saves: step('step-2-roll-saves').roll.formula,
  health: step('step-4-roll-health').roll.formula,
  credits: step('step-8-roll-loadout-trinket-and-patch').roll.formula,
};

// Step 5 is the one creation rule the book states in prose rather than dice: "Characters' current
// Stress and Minimum Stress both start at 2." test/content-catalogs.test.ts pins that sentence.
export const STARTING_STRESS = 2;

// Wounds are 2 plus whatever the class adds; the schema default says the same thing.
const BASE_WOUNDS = 2;

const ROLLS = {
  strength: { formula: FORMULA.stats, label: 'Mothership.Strength' },
  speed: { formula: FORMULA.stats, label: 'Mothership.Speed' },
  intellect: { formula: FORMULA.stats, label: 'Mothership.Intellect' },
  combat: { formula: FORMULA.stats, label: 'Mothership.Combat' },
  sanity: { formula: FORMULA.saves, label: 'Mothership.Sanity' },
  fear: { formula: FORMULA.saves, label: 'Mothership.Fear' },
  body: { formula: FORMULA.saves, label: 'Mothership.Body' },
  health: { formula: FORMULA.health, label: 'Mothership.Health' },
  credits: { formula: FORMULA.credits, label: 'Mothership.Credits' },
};

export const ROLL_KEYS = Object.keys(ROLLS);

const TABLES = ['patch', 'trinket', 'loadout'];

/** What "remove previous items" removes. The class is replaced whether it is ticked or not. */
const SHED = ['item', 'armor', 'weapon', 'skill', 'condition'];

const zeroed = (keys) => Object.fromEntries(keys.map((key) => [key, 0]));
const nulled = (keys) => Object.fromEntries(keys.map((key) => [key, null]));

export class CharacterDraft {
  name = $state('');
  className = $state('');
  classUuid = $state('');
  traumaResponse = $state('');
  rolled = $state(nulled(ROLL_KEYS));
  bonus = $state(zeroed(BONUSES));
  skills = $state([]);
  patch = $state(null);
  trinket = $state(null);
  loadout = $state(null);
  removePreviousItems = $state(true);
  classOptions = $state([]);

  #actor;
  #catalog = [];
  #tables = { patch: '', trinket: '', loadout: '' };

  constructor(actor) {
    this.#actor = actor;
    this.name = actor.name;
  }

  /** The compendium scans, run once when the window opens rather than per dialog. */
  async load() {
    [this.classOptions, this.#catalog] = await Promise.all([loadClasses(), loadSkills()]);
  }

  total(key) {
    return (this.rolled[key] ?? 0) + (this.bonus[key] ?? 0);
  }

  get wounds() {
    return BASE_WOUNDS + this.bonus.max_wounds;
  }

  async roll(key) {
    if (this.rolled[key] !== null) return;
    const { formula, label } = ROLLS[key];
    const roll = await new Roll(formula).roll();
    await roll.toMessage({ flavor: format('Mothership.RollingForGeneric', { name: localize(label) }) });
    this.rolled[key] = roll.total;
  }

  async rollTable(kind) {
    if (this[kind]) return;
    if (!this.classUuid) {
      ui.notifications.error(localize('Mothership.CharacterGenerator.Error.NoClass'));
      return;
    }
    const table = await fromUuid(this.#tables[kind]);
    if (!table) {
      ui.notifications.error(`${this.className}: no ${kind} table at ${this.#tables[kind]}`);
      return;
    }
    const draw = await table.draw({ displayChat: true });
    this[kind] = { roll: drawnRow(draw), ...parseResults(draw.results) };
  }

  async rollEverything() {
    for (const key of ROLL_KEYS) await this.roll(key);
    for (const kind of TABLES) await this.rollTable(kind);
  }

  /**
   * Apply a class: its flat adjustments, then the choices it leaves to the player. The bonuses go
   * on first so that closing a dialog leaves the class half-applied rather than not applied at all
   * — the AppV1 ordering, kept deliberately.
   */
  async chooseClass(uuid) {
    const klass = await fromUuid(uuid);
    if (klass?.type !== 'class') return;

    this.classUuid = klass.uuid;
    this.className = klass.name;
    this.traumaResponse = klass.system.trauma_response;
    this.#tables = { ...klass.system.roll_tables };

    // A second class replaces the first rather than stacking on it. The loadout goes with it
    // because that table is the class's own; trinkets and patches are one table for everyone. The
    // health bonus is the player's own number and no class sets it, so it stays.
    this.skills = [];
    this.loadout = null;

    // base_adjustment declares all eight keys, so assigning them is the replacement -- there is
    // nothing left of the previous class to clear first. choose_stat adds to what this leaves.
    const { base_adjustment, selected_adjustment } = klass.system;
    for (const [key, value] of Object.entries(base_adjustment)) {
      if (key !== 'skills_granted') this.bonus[key] = value;
    }

    for (const entry of selected_adjustment.choose_stat) {
      if (!entry.modification) continue;
      const stat = await pickStat(entry);
      if (stat) this.bonus[stat] += entry.modification;
    }

    await this.applyClassSkills();
  }

  async applyClassSkills() {
    if (!this.classUuid) {
      ui.notifications.error(localize('Mothership.CharacterGenerator.SkillOption.Classerror'));
      return;
    }
    const klass = await fromUuid(this.classUuid);
    if (!klass) return;

    this.skills = [];
    await this.#grant(klass.system.base_adjustment.skills_granted);
    await this.#pick(klass.system.selected_adjustment.choose_skill_and);

    for (const group of klass.system.selected_adjustment.choose_skill_or) {
      if (!group.length) continue;
      const option = group.length > 1 ? await pickBonusOption(await this.#describe(group)) : group[0];
      if (!option) continue;
      // Its fixed skills first, so the picks below already see them as owned.
      await this.#grant(option.from_list);
      await this.#pick(option);
    }
  }

  /** The picks a class hands out, in the order the prerequisite chain needs: broadest first. */
  async #pick(picks) {
    for (const kind of PICK_KINDS) {
      for (let i = 0; i < (picks[kind] ?? 0); i += 1) {
        await this.#grant(await pickSkills(kind, this.#catalog, this.skills.map((s) => s.uuid)));
      }
    }
  }

  async #grant(uuids) {
    for (const uuid of uuids) {
      if (this.skills.some((skill) => skill.uuid === uuid)) continue;
      // A class can outlive a skill it grants. The class sheet keeps such a row so it can be
      // deleted; here there is nothing to hand out, so say so and carry on.
      const skill = await fromUuid(uuid);
      if (!skill) {
        ui.notifications.warn(`Skill not found: ${uuid}`);
        continue;
      }
      this.skills.push({ uuid, name: skill.name });
    }
  }

  /** A choose_skill_or option's from_list is UUIDs; the choice dialog shows names. */
  async #describe(group) {
    return Promise.all(
      group.map(async (option) => ({
        ...option,
        fromListNames: await Promise.all(
          option.from_list.map(async (uuid) => (await fromUuid(uuid))?.name ?? uuid),
        ),
      })),
    );
  }

  /**
   * The one write. Rolled values are only sent when they were actually rolled, so saving a
   * half-finished draft cannot overwrite a stat with NaN — which is what the AppV1 submit did with
   * an empty numeric input.
   */
  async apply() {
    const actor = this.#actor;
    const update = {
      'system.hits.max': this.wounds,
      // PSG step 5, decided for S5: regenerating a character resets Stress the way it resets
      // health and the stats.
      'system.other.stress.value': STARTING_STRESS,
      'system.other.stress.min': STARTING_STRESS,
    };

    for (const key of [...STATS, ...SAVES]) {
      if (this.rolled[key] !== null) update[`system.stats.${key}.value`] = this.total(key);
    }
    if (this.rolled.health !== null) {
      update['system.health.value'] = this.total('health');
      update['system.health.max'] = this.total('health');
    }
    if (this.rolled.credits !== null) update['system.credits.value'] = String(this.rolled.credits);
    if (this.name) update.name = this.name;
    if (this.className) {
      update['system.class.value'] = this.className;
      update['system.other.stressdesc.value'] = this.traumaResponse;
    }

    if (this.removePreviousItems) {
      const ids = actor.items.filter((item) => SHED.includes(item.type)).map((item) => item.id);
      if (ids.length) await actor.deleteEmbeddedDocuments('Item', ids);
    }

    // The grants are silent: creation hands out a class, a loadout, two table results and a skill
    // list at once, and a card apiece would bury the rolls that produced them. `applyItemRef`
    // dedupes by name and takes the count, so a loadout row naming the same item twice arrives as
    // one item of quantity two.
    if (this.classUuid) await this.#grantClass();
    for (const [uuid, quantity] of this.#loadoutTally()) await this.#give(uuid, quantity);
    for (const kind of ['patch', 'trinket']) {
      for (const entry of this[kind]?.entries ?? []) await this.#give(entry.uuid, 1);
    }
    for (const skill of this.skills) await this.#give(skill.uuid, 1);

    await actor.update(update);
  }

  #give(uuid, quantity) {
    return this.#actor.applyItemRef(uuid, quantity, { message: false });
  }

  /**
   * The class as an item, not just as `system.class.value`: the `robotic` flag on that document is
   * what tells the Panic table an android from a human (`tables/tables.ts`), and a name cannot.
   * A class the actor already carries goes first — it is being replaced, not added to.
   */
  async #grantClass() {
    const held = this.#actor.items.filter((item) => item.type === 'class').map((item) => item.id);
    if (held.length) await this.#actor.deleteEmbeddedDocuments('Item', held);
    await this.#give(this.classUuid, 1);
  }

  #loadoutTally() {
    const tally = new Map();
    for (const { uuid } of this.loadout?.entries ?? []) tally.set(uuid, (tally.get(uuid) ?? 0) + 1);
    return tally;
  }
}
