import { gain } from '../checks/actions.ts';
import {
  cardSource,
  speakerOf,
  voiceOfActor,
  type CheckItem,
} from '../checks/actor.ts';
import {
  promptCheck,
  promptSkillCheck,
  runCheck,
  type CheckOptions,
  type CheckOutcome,
} from '../checks/checks.ts';
import { evaluateRoll } from '../checks/roll.ts';
import { runTable, type TableOptions, type TableResult } from '../checks/tables.ts';
import { descriptionCard, flavor, itemCard, mutationCard, postCard, reloadCard } from '../chat/cards.ts';
import { deprecated } from '../debug.ts';
import { chooseCover } from '../dialogs/prompts.ts';
import { format, localize } from '../i18n.ts';
import type { ReloadOutcome } from '../inventory/ammo.ts';
import { lookup, notifyMiss } from '../lookup.ts';
import { grantItem, type GrantDocument, type GrantResult } from '../mutation/items.ts';
import { mutate, type Amount, type Change, type MutationResult } from '../mutation/mutate.ts';
import type { Outcome } from '../rolls/resolve.ts';
import { parseRollSpec } from '../rolls/parse.ts';
import { CHECK_SEMANTICS, type RollSpec, type StatKey } from '../rolls/spec.ts';
import { COVER_BONUS, STR_CAPACITY_DIVISOR, XP_PIPS, type Cover } from '../rules.ts';
import type { TableKey } from '../tables/tables.ts';
import type { MothershipItem } from './item.ts';

// Returns the live document, never a JSON clone.
interface ActorItems extends Iterable<MothershipItem> {
  get(id: string): MothershipItem | undefined;
}

// A subset of Foundry's `Actor`; the global supplies the rest at runtime.
interface ActorDocument {
  readonly id: string | null;
  readonly name: string;
  readonly img: string;
  readonly type: string;
  readonly system: unknown;
  readonly items: ActorItems;
  readonly token?: { readonly id?: string | null } | null;
  prepareDerivedData(): void;
  toObject(): { readonly system: unknown };
  update(data: Record<string, unknown>): Promise<unknown>;
  createEmbeddedDocuments(type: string, data: readonly object[]): Promise<unknown>;
}

declare const Actor: new (...args: never[]) => ActorDocument;

export const CHARACTER = 'character';
export const CREATURE = 'creature';

const ARMOR = 'armor';
const WEAPON = 'weapon';
const GEAR = 'item';
const CONDITION = 'condition';

// Matched by name, not id — a fragile link if this Condition is ever renamed.
const BLEEDING = 'Bleeding';

// The dice a damage string leads with — `2d10`, and the `2` a swarm multiplies.
const DAMAGE_DICE = /(\d+)(d\d+)/i;

// `total` and `weight` are derived-only: computed here, never stored in the schema.
interface DerivedSystem {
  readonly stats: {
    armor: { value?: number; mod: number; total: number; damageReduction: number };
    combat?: { value: number };
    strength?: { value?: number };
  };
  readonly health: { value?: number; max?: number };
  readonly hits: { value?: number; max?: number };
  netHP: { value: number; max: number };
  bleeding: { value: number };
  weight?: { current: number; capacity: number };
  readonly swarm?: { enabled?: boolean; combat?: { value?: number } };
}

function fields(value: unknown): Record<string, unknown> {
  return (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
}

function number(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function deriveArmor(items: Iterable<CheckItem>, system: DerivedSystem): void {
  let armorPoints = 0;
  let damageReduction = 0;

  for (const item of items) {
    if (item.type !== ARMOR) continue;
    const worn = fields(item.system);
    if (worn.equipped !== true) continue;
    armorPoints += number(worn.armorPoints);
    damageReduction += number(worn.damageReduction);
  }

  const armor = system.stats.armor;
  armor.mod = armorPoints;
  armor.total = armorPoints + number(armor.value);
  armor.damageReduction = damageReduction;
}

// Wounds and health as one pool: every Wound still in hand is worth a full bar.
function deriveNetHP(system: DerivedSystem): void {
  const healthMax = number(system.health.max);
  system.netHP.value =
    (number(system.hits.max) - number(system.hits.value) - 1) * healthMax + number(system.health.value);
  system.netHP.max = healthMax * number(system.hits.max);
}

function deriveBleeding(items: Iterable<CheckItem>, system: DerivedSystem): void {
  let severity = 0;
  for (const item of items) {
    if (item.type !== CONDITION || item.name !== BLEEDING) continue;
    severity += number(fields(item.system).severity);
  }
  system.bleeding.value = severity;
}

function swarmSize(system: DerivedSystem): number {
  return number(system.hits.max) - number(system.hits.value);
}

// modify() reuses weapon-damage roll semantics for a generic amount.
const AMOUNT_KIND = 'weapon-damage';

// A truthy value wins over dice, so a modValue of 0 falls through to the roll string.
export function legacyAmount(value: number | null, dice: string | null): Amount {
  if (value) return { kind: 'amount', amount: Number(value) };
  return dice ? { kind: 'roll', dice: String(dice) } : { kind: 'amount', amount: 0 };
}

export interface CardOptions {
  readonly message?: boolean;
}

export interface WeaponOptions extends CheckOptions {
  // Damage never touches the magazine.
  readonly roll?: 'attack' | 'damage';
}

export class MothershipActor extends Actor {
  prepareDerivedData(): void {
    super.prepareDerivedData();
    if (this.type === CHARACTER) this._deriveCharacter();
    else if (this.type === CREATURE) this._deriveCreature();
  }

  _deriveCharacter(): void {
    const system = this.system as DerivedSystem;
    deriveArmor(this.items, system);
    deriveNetHP(system);
    deriveBleeding(this.items, system);

    let carried = 0;
    for (const item of this.items) {
      const gear = fields(item.system);
      if (item.type === GEAR) carried += number(gear.weight) * number(gear.quantity);
      else if (item.type === ARMOR || item.type === WEAPON) carried += number(gear.weight);
    }
    system.weight = {
      current: carried,
      capacity: Math.ceil(number(system.stats.strength?.value) / STR_CAPACITY_DIVISOR),
    };
  }

  _deriveCreature(): void {
    const system = this.system as DerivedSystem;
    deriveArmor(this.items, system);
    deriveNetHP(system);
    deriveBleeding(this.items, system);

    // A swarm fights as hard as it is numerous: the Wounds it has left multiply its Combat.
    const swarm = system.swarm;
    if (swarm?.enabled === true && system.stats.combat !== undefined) {
      system.stats.combat.value = number(swarm.combat?.value) * swarmSize(system);
    }
  }

  // Returns null for "roll the weapon's own damage" — a non-swarm creature, or a weapon whose
  // damage names no dice.
  swarmDamage(itemId: string): string | null {
    const system = this.system as DerivedSystem;
    if (system.swarm?.enabled !== true) return null;

    const damage = String(fields(this.items.get(itemId)?.system).damage ?? '');
    const dice = DAMAGE_DICE.exec(damage);
    if (dice === null) return null;
    return damage.replace(DAMAGE_DICE, `${number(dice[1]) * swarmSize(system)}$2`);
  }

  // Reads via toObject(): this.system.stats.combat.value is derived (prepareDerivedData
  // mutates it in place), so the live value is already the multiplied product.
  async setSwarm(enabled: boolean): Promise<unknown> {
    const system = this.toObject().system as DerivedSystem;
    const combat = number(system.stats.combat?.value);

    return await this.update({
      'system.swarm.enabled': enabled,
      'system.stats.combat.value': enabled
        ? combat * swarmSize(system)
        : number(system.swarm?.combat?.value),
      'system.swarm.combat.value': enabled ? combat : 0,
    });
  }

  async rollStat(stat: StatKey, options: CheckOptions = {}): Promise<CheckOutcome | null> {
    return await runCheck(this, { kind: 'stat', stat }, options);
  }

  async promptCheck(options: CheckOptions = {}): Promise<CheckOutcome | null> {
    return await promptCheck(this, options);
  }

  async rollSkill(skillId: string, options: CheckOptions = {}): Promise<CheckOutcome | null> {
    return await promptSkillCheck(this, skillId, options);
  }

  async rollWeapon(itemId: string, options: WeaponOptions = {}): Promise<CheckOutcome | null> {
    const { roll = 'attack', ...check } = options;
    return roll === 'damage'
      ? await runCheck(this, { kind: 'weapon-damage', itemId, damage: check.damage ?? null }, check)
      : await runCheck(this, { kind: 'weapon-attack', itemId }, check);
  }

  async rollPanic(options: CheckOptions = {}): Promise<CheckOutcome | null> {
    return await runCheck(this, { kind: 'panic' }, options);
  }

  async rollRestSave(options: CheckOptions = {}): Promise<CheckOutcome | null> {
    return await runCheck(this, { kind: 'rest-save' }, options);
  }

  async rollTable(key: TableKey, options: TableOptions = {}): Promise<TableResult | null> {
    return await runTable(this, key, options);
  }

  // The address stays a dotted string because that is what macros carry.
  async modify(address: string, amount: Amount, options: CardOptions = {}): Promise<MutationResult> {
    let spec: RollSpec | null = null;
    let rollOutcome: Outcome | null = null;
    let change: Change;

    if (amount.kind === 'roll') {
      spec = parseRollSpec(amount.dice, CHECK_SEMANTICS[AMOUNT_KIND].aim);
      const rolled = await evaluateRoll({ spec, kind: AMOUNT_KIND });
      rollOutcome = rolled.outcome;
      change = { kind: 'roll', roll: rolled.roll };
    } else {
      change = { kind: 'amount', amount: amount.amount };
    }

    const result = await mutate(this, address, change);
    if (options.message === false) return result;

    const card = mutationCard({
      source: cardSource(this),
      result,
      voice: voiceOfActor(this),
      spec,
      rollOutcome,
    });
    await postCard(card, { speaker: speakerOf(this) });
    return result;
  }

  // The write lives in mutation/items.ts; the card stays here since a card is not a mutation.
  async applyItem(
    document: GrantDocument,
    count = 1,
    options: CardOptions = {},
  ): Promise<GrantResult> {
    const result = await grantItem(this, document, count);
    if (options.message === false) return result;

    const card = itemCard({
      source: cardSource(this),
      header: result.name,
      image: result.img,
      flavor: this.#grantFlavor(result),
    });
    await postCard(card, { speaker: speakerOf(this) });
    return result;
  }

  #grantFlavor(result: GrantResult): string {
    const { change } = result;
    if (change.counted === null) {
      if (!change.created) return localize('Mothership.YouAddAnotherOfThisToYourInventory');
      return localize(result.type === 'skill' ? 'Mothership.YouLearnThisSkill' : 'Mothership.YouAddThisToYourInventory');
    }

    const changed = format('Mothership.Chat.FieldChanged', {
      field: localize(change.counted === 'severity' ? 'Mothership.Severity' : 'Mothership.Quantity'),
      direction: localize(change.to >= change.from ? 'Mothership.Chat.Increased' : 'Mothership.Chat.Decreased'),
      from: `<strong>${change.from}</strong>`,
      to: `<strong>${change.to}</strong>`,
    });
    if (change.counted !== 'severity') return changed;

    const arrival = flavor(voiceOfActor(this), 'item', CONDITION, change.created ? 'add' : 'increase');
    return arrival === '' ? changed : `${arrival} ${changed}`;
  }

  // A stale reference resolves to a notification, not a crash.
  async applyItemRef(
    ref: string,
    count = 1,
    options: CardOptions = {},
  ): Promise<GrantResult | null> {
    const found = await lookup<GrantDocument>(ref, 'Item');
    if (!found.found) {
      notifyMiss(found.request);
      return null;
    }
    return await this.applyItem(found.document, count, options);
  }

  // XP_PIPS is the single source for track length, so the clamp and the sheet's pip count agree.
  async stepXp(delta: number): Promise<unknown> {
    const current = number(fields(fields(this.system).xp).value);
    return await this.update({
      'system.xp.value': Math.min(XP_PIPS, Math.max(0, current + delta)),
    });
  }

  async reloadWeapon(itemId: string): Promise<ReloadOutcome | null> {
    const item = this.items.get(itemId);
    if (item === undefined) {
      notifyMiss({ ref: itemId, type: 'Item' });
      return null;
    }
    const outcome = await item.reload();
    const card = reloadCard(item.toChat(), outcome, cardSource(this));
    if (card !== null) await postCard(card, { speaker: speakerOf(this) });
    return outcome;
  }

  async printDescription(itemId: string): Promise<unknown> {
    const item = this.items.get(itemId);
    if (item === undefined) {
      notifyMiss({ ref: itemId, type: 'Item' });
      return null;
    }
    return await postCard(descriptionCard(item.toChat(), item.system, cardSource(this)), {
      speaker: speakerOf(this),
    });
  }

  // Writes directly rather than through mutation/: cover is one of four words, and that
  // module's contract is that what it writes is a number.
  async chooseCover(): Promise<Cover | null> {
    const armor = fields(fields(fields(this.system).stats).armor);
    const stored = armor.cover;
    const current: Cover =
      typeof stored === 'string' && Object.hasOwn(COVER_BONUS, stored) ? (stored as Cover) : 'none';

    const chosen = await chooseCover(current, {
      armorPoints: number(armor.mod),
      damageReduction: number(armor.damageReduction),
    });
    if (chosen === null) return null;

    await this.update({ 'system.stats.armor.cover': chosen });
    return chosen;
  }

  // PSG 28: Bleeding costs its severity in Health.
  async takeBleedingDamage(): Promise<void> {
    await gain(this, {
      verb: 'gain',
      field: 'health',
      leaf: 'value',
      amount: { kind: 'severity', condition: 'bleeding', sign: -1 },
    });
  }

  // Legacy entry point: a flat value, or a roll string when the value is null.
  async modifyActor(
    fieldAddress: string,
    modValue: number | null,
    modRollString: string | null,
    outputChatMsg: boolean,
  ): Promise<MutationResult> {
    deprecated('actor.modifyActor', 'actor.modify');
    return await this.modify(fieldAddress, legacyAmount(modValue, modRollString), {
      message: outputChatMsg !== false,
    });
  }
}
