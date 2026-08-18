import { CHARACTER_CREATION } from '../../../content/books/psg/character-creation.ts';
import { parseResults, drawnRow } from './table-result.js';
import { loadSkills, loadClasses } from './skills.js';
import { expandSlots, packageCounts, PICK_KINDS } from './picks.js';
import { localize, format } from '../../i18n.ts';

/**
 * The draft store. The generator is a wizard, not a sheet: the actor
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

/** What a regenerated character sheds. The class is replaced separately, by `#grantClass`. */
const SHED = ['item', 'armor', 'weapon', 'skill', 'condition'];

const zeroed = (keys) => Object.fromEntries(keys.map((key) => [key, 0]));
const nulled = (keys) => Object.fromEntries(keys.map((key) => [key, null]));

export class CharacterDraft {
  name = $state('');
  pronouns = $state('');
  className = $state('');
  classUuid = $state('');
  traumaResponse = $state('');
  rolled = $state(nulled(ROLL_KEYS));
  bonus = $state(zeroed(BONUSES));
  patch = $state(null);
  trinket = $state(null);
  loadout = $state(null);
  classOptions = $state([]);

  // The three questions a class asks. Each is state the panes fill in place: the wizard opens no
  // window over itself, so an unanswered question is a control waiting rather than a modal.

  /** `choose_stat`: a modification, the stats it may be spent on, and where it went. */
  statChoices = $state([]);
  /** `choose_skill_or`: the bonus packages a class offers, and which one was taken. */
  skillGroups = $state([]);
  /** One slot per skill the class's picks promise: a rank, whether it is gated, and the pick. */
  skillSlots = $state([]);

  #actor;
  #catalog = $state([]);
  #granted = $state([]);
  #classPicks = $state({});
  #tables = { patch: '', trinket: '', loadout: '' };

  constructor(actor) {
    this.#actor = actor;
    this.name = actor.name;
    this.pronouns = actor.system?.pronouns?.value ?? '';
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

  /**
   * Apply a class: its flat adjustments, then the questions it leaves to the player. Nothing is
   * asked here — the adjustments it lets the player place and the skills it lets them pick become
   * state the class and skills panes fill in, so choosing a class opens no window over the wizard.
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
    this.loadout = null;

    // base_adjustment declares all eight keys, so assigning them is the replacement -- there is
    // nothing left of the previous class to clear first. choose_stat adds to what this leaves.
    const { base_adjustment, selected_adjustment } = klass.system;
    for (const [key, value] of Object.entries(base_adjustment)) {
      if (key !== 'skills_granted') this.bonus[key] = value;
    }

    this.statChoices = selected_adjustment.choose_stat
      .filter((entry) => entry.modification)
      .map((entry) => ({ modification: entry.modification, stats: [...entry.stats], chosen: null }));

    this.#granted = this.#known(base_adjustment.skills_granted);
    this.#classPicks = { ...selected_adjustment.choose_skill_and };
    // A group offering one package is not a question, so it is taken as read.
    this.skillGroups = selected_adjustment.choose_skill_or
      .filter((group) => group.length > 0)
      .map((group) => ({
        chosen: group.length === 1 ? 0 : null,
        options: group.map((option) => ({
          name: option.name,
          counts: packageCounts(option),
          granted: this.#known(option.from_list),
          picks: Object.fromEntries(PICK_KINDS.map((kind) => [kind, option[kind] ?? 0])),
        })),
      }));
    this.skillSlots = [];
    this.#rebuildSlots();
  }

  /**
   * Spend one `choose_stat` entry on a stat, or take it back by naming the stat it already sits
   * on. The bonus moves with the pick, so a player who changes their mind does not pay twice.
   */
  chooseStat(index, stat) {
    const choice = this.statChoices[index];
    if (!choice || !choice.stats.includes(stat)) return;
    if (choice.chosen !== null) this.bonus[choice.chosen] -= choice.modification;
    choice.chosen = choice.chosen === stat ? null : stat;
    if (choice.chosen !== null) this.bonus[choice.chosen] += choice.modification;
  }

  get statChoicesSpent() {
    return this.statChoices.every((choice) => choice.chosen !== null);
  }

  /** Take one of a group's bonus packages. Its slots replace the ones the last package left. */
  chooseSkillOption(group, option) {
    const entry = this.skillGroups[group];
    if (!entry || !entry.options[option]) return;
    entry.chosen = option;
    this.#rebuildSlots();
  }

  /**
   * Toggle one skill on or off this session's picks. Picking finds whichever open slot of the
   * skill's rank fits it: a gated slot when the prerequisite is already held elsewhere, or an
   * ungated one otherwise — spending the pickier slot first keeps an ungated `*_full_set` slot free
   * for a skill that still needs one. Does nothing for a skill the class already granted outright,
   * or one no open slot can currently take; the picker only offers a toggle where one is legal.
   */
  toggleSkill(uuid) {
    if (this.#grantedUuids().has(uuid)) return;
    const held = this.skillSlots.find((slot) => slot.chosen === uuid);
    if (held) {
      held.chosen = null;
      this.#prune();
      return;
    }
    const skill = this.#skill(uuid);
    if (!skill) return;
    const heldUuids = this.skills.map((entry) => entry.uuid);
    const open = this.skillSlots.filter((slot) => slot.chosen === null && slot.rank === skill.rank);
    const slot = open.find((slot) => slot.gated && skill.prerequisites.some((id) => heldUuids.includes(id)))
      ?? open.find((slot) => !slot.gated);
    if (!slot) return;
    slot.chosen = uuid;
    this.#prune();
  }

  /** Unfilled slots per rank — the picker's live remaining-pick budget. */
  get skillBudget() {
    const remaining = { Trained: 0, Expert: 0, Master: 0 };
    for (const slot of this.skillSlots) if (slot.chosen === null) remaining[slot.rank] += 1;
    return remaining;
  }

  /**
   * The whole catalog, each skill flagged with where it stands this session: `granted` (the class
   * or a chosen package handed it out outright, nothing to pick), `picked` (this session's answer
   * to one of the slots above), `available` (an unfilled slot of its rank can still take it), or
   * `unavailable` (no slot can — every slot of its rank is spent, or the only ones left are gated
   * on a prerequisite nothing held yet satisfies). An unavailable skill carries which of those two
   * it is as `reason`, because the picker has to say so: a Trained skill greyed out for want of a
   * pick reads as a rule about the skill unless the pane names the budget.
   */
  get skillTree() {
    const grantedUuids = this.#grantedUuids();
    const pickedUuids = new Set(this.skillSlots.map((slot) => slot.chosen).filter(Boolean));
    return this.#catalog.map((skill) => {
      const state = grantedUuids.has(skill.uuid) ? 'granted'
        : pickedUuids.has(skill.uuid) ? 'picked'
        : this.#openSlotFor(skill) ? 'available'
        : 'unavailable';
      return {
        ...skill,
        state,
        reason: state !== 'unavailable' ? null
          : this.skillSlots.some((slot) => slot.chosen === null && slot.rank === skill.rank) ? 'gated'
          : 'spent',
      };
    });
  }

  /** What the class, or a package already taken, hands out with no choice involved. */
  #grantedUuids() {
    return new Set([
      ...this.#granted,
      ...this.skillGroups.flatMap((group) => (group.chosen === null ? [] : group.options[group.chosen].granted)),
    ]);
  }

  /** An unfilled slot of this skill's rank that could take it right now, ungated or otherwise. */
  #openSlotFor(skill) {
    const heldUuids = this.skills.map((entry) => entry.uuid);
    return this.skillSlots.some((slot) =>
      slot.chosen === null
      && slot.rank === skill.rank
      && (!slot.gated || skill.prerequisites.some((id) => heldUuids.includes(id))),
    );
  }

  /**
   * Whether every either/or package the class offers has been taken. It is asked with the rest of
   * what the class hands out, a pane before the skills themselves: the packages are the class's
   * benefit, and the picker cannot say how many picks a rank has left until one is chosen.
   */
  get skillGroupsChosen() {
    return this.skillGroups.every((group) => group.chosen !== null);
  }

  get skillsPicked() {
    return this.skillGroupsChosen && this.skillSlots.every((slot) => slot.chosen !== null);
  }

  /** The skills the draft would hand out: granted, then taken with a package, then picked. */
  get skills() {
    const uuids = [
      ...this.#granted,
      ...this.skillGroups.flatMap((group) => (group.chosen === null ? [] : group.options[group.chosen].granted)),
      ...this.skillSlots.map((slot) => slot.chosen).filter(Boolean),
    ];
    return [...new Set(uuids)].map((uuid) => {
      const skill = this.#skill(uuid);
      return { uuid, name: skill?.name ?? uuid };
    });
  }

  /**
   * The slots the class and its taken packages promise. Picks survive a rebuild by their slot key,
   * so swapping one package for another drops that package's answers and keeps the rest.
   */
  #rebuildSlots() {
    const kept = new Map(this.skillSlots.map((slot) => [slot.key, slot.chosen]));
    const slots = [
      ...expandSlots(this.#classPicks, 'class'),
      ...this.skillGroups.flatMap((group, index) =>
        group.chosen === null ? [] : expandSlots(group.options[group.chosen].picks, `group-${index}`),
      ),
    ];
    this.skillSlots = slots.map((slot) => ({ ...slot, chosen: kept.get(slot.key) ?? null }));
    this.#prune();
  }

  /**
   * A gated pick stands on a prerequisite another slot chose, so changing that slot can leave it
   * standing on nothing; those picks are emptied rather than saved illegally. Clearing one can
   * strand the next, so this runs until nothing more falls.
   */
  #prune() {
    for (let pass = 0; pass < this.skillSlots.length; pass += 1) {
      const stranded = this.skillSlots.find((slot) => {
        if (!slot.gated || slot.chosen === null) return false;
        const owned = this.#owned(slot.key);
        return !(this.#skill(slot.chosen)?.prerequisites ?? []).some((id) => owned.includes(id));
      });
      if (!stranded) return;
      stranded.chosen = null;
    }
  }

  /** Every skill the draft holds bar one slot's own answer. */
  #owned(exceptKey) {
    return this.skills
      .map((skill) => skill.uuid)
      .filter((uuid) => uuid !== this.skillSlots.find((slot) => slot.key === exceptKey)?.chosen);
  }

  #skill(uuid) {
    return this.#catalog.find((skill) => skill.uuid === uuid);
  }

  /** What a package's fixed skills are called, for the pane that offers the package. */
  skillName(uuid) {
    return this.#skill(uuid)?.name ?? uuid;
  }

  /**
   * A class can outlive a skill it grants. The class sheet keeps such a row so it can be deleted;
   * here there is nothing to hand out, so say so and carry on.
   */
  #known(uuids) {
    return uuids.filter((uuid) => {
      if (this.#skill(uuid)) return true;
      ui.notifications.warn(`Skill not found: ${uuid}`);
      return false;
    });
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
    if (this.pronouns) update['system.pronouns.value'] = this.pronouns;
    if (this.className) {
      update['system.class.value'] = this.className;
      update['system.other.stressdesc.value'] = this.traumaResponse;
    }

    // Generating a character replaces one; there is no reading of "roll me a new Teamster" that
    // keeps the last one's kit, so the window no longer asks.
    const shed = actor.items.filter((item) => SHED.includes(item.type)).map((item) => item.id);
    if (shed.length) await actor.deleteEmbeddedDocuments('Item', shed);

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
