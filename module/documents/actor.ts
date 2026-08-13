/**
 * The actor document. Two things live here and nothing else: **derivation**, which is the
 * document's own work, and **thin named methods** that hand the work to a service. Legacy's
 * 2,394-line class held the roll engine, six dialogs, the chat renderer and the mutation engine
 * besides (audit F1); every one of those now has a module, and what is left is the surface a
 * sheet, a macro or a chat button calls by name.
 *
 * The legacy-named methods at the bottom are the compatibility surface: macros users have already
 * imported into worlds call `modifyActor`, `takeBleedingDamage`, `chooseCover` and
 * `printDescription` on the actor directly. They keep their old signatures and are implemented
 * over the same services as everything else.
 */

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
import { mutate, type Change, type MutationResult } from '../mutation/mutate.ts';
import type { Outcome } from '../rolls/resolve.ts';
import { parseRollSpec } from '../rolls/parse.ts';
import { CHECK_SEMANTICS, type RollSpec, type StatKey } from '../rolls/spec.ts';
import { COVER_BONUS, STR_CAPACITY_DIVISOR, type Cover } from '../rules.ts';
import type { TableKey } from '../tables/tables.ts';
import type { MothershipItem } from './item.ts';

/** The embedded items, as this class reads them: the whole document, never a JSON clone (RC3). */
interface ActorItems extends Iterable<MothershipItem> {
  get(id: string): MothershipItem | undefined;
}

/** The part of Foundry's `Actor` this class uses; the global supplies the rest at runtime. */
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

/** PSG 28 — the condition the sheet totals. Matched by name, exactly as legacy matched it. */
const BLEEDING = 'Bleeding';

/**
 * The system as derivation writes it. The schema declares every pod read here; `total` and
 * `weight` are derived-only and exist nowhere else, which is why they are written but never
 * stored. The pre-DataModel `??=` guards legacy carried are gone — the schema is what supplies
 * these fields now (audit F25).
 */
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

/**
 * Worn armour, totalled. The character and the creature each carried their own copy of this, of
 * net HP, and of Bleeding — three verbatim blocks in two methods (audit F25).
 */
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

/** Wounds and health as one pool: every Wound still in hand is worth a full bar. */
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

/** What a mutation changes by, as a caller states it: a flat number, or dice to roll for it. */
export type Amount =
  | { readonly kind: 'amount'; readonly amount: number }
  | { readonly kind: 'roll'; readonly dice: string };

/** A rolled amount is read the way damage is: what it says on the dice, top face and all. */
const AMOUNT_KIND = 'weapon-damage';

/**
 * Legacy's two mutation parameters as one amount. It took the value when there was one and the
 * roll string otherwise — `if (modValue)`, so a zero meant "not given" — and a call carrying
 * neither reached `new Roll(undefined)`. That last case is a change of nothing now.
 */
export function legacyAmount(value: number | null, dice: string | null): Amount {
  if (value) return { kind: 'amount', amount: Number(value) };
  return dice ? { kind: 'roll', dice: String(dice) } : { kind: 'amount', amount: 0 };
}

export interface ModifyOptions {
  /** Whether the change posts a card. A check that narrates the Stress itself does not. */
  readonly message?: boolean;
}

export interface WeaponOptions extends CheckOptions {
  /** Which half of the attack this is. Damage never touches the magazine (audit F5). */
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
      system.stats.combat.value =
        number(swarm.combat?.value) * (number(system.hits.max) - number(system.hits.value));
    }
  }

  /* -------------------------------------------- */
  /*  Rolls                                       */
  /* -------------------------------------------- */

  async rollStat(stat: StatKey, options: CheckOptions = {}): Promise<CheckOutcome | null> {
    return await runCheck(this, { kind: 'stat', stat }, options);
  }

  /** The check whose stat nobody has named — what legacy's broken `rollStatMacro` meant (RC5). */
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

  /* -------------------------------------------- */
  /*  Changes                                     */
  /* -------------------------------------------- */

  /**
   * Change one tracked number. The address stays a dotted string because that is what macros
   * carry; everything past `mutation/` is typed (audit F12).
   */
  async modify(address: string, amount: Amount, options: ModifyOptions = {}): Promise<MutationResult> {
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

  /**
   * Give this actor an item — a Condition, mostly, which is what every `+N` macro is for. The
   * write is `mutation/items.ts`; the card is here, because a card is not a mutation.
   */
  async applyItem(document: GrantDocument, count = 1): Promise<GrantResult> {
    const result = await grantItem(this, document, count);
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
      if (!change.created) return localize('Mosh.YouAddAnotherOfThisToYourInventory');
      return localize(result.type === 'skill' ? 'Mosh.YouLearnThisSkill' : 'Mosh.YouAddThisToYourInventory');
    }

    const changed = format('Mosh.Chat.FieldChanged', {
      field: localize(change.counted === 'severity' ? 'Mosh.Severity' : 'Mosh.Quantity'),
      direction: localize(change.to >= change.from ? 'Mosh.Chat.Increased' : 'Mosh.Chat.Decreased'),
      from: `<strong>${change.from}</strong>`,
      to: `<strong>${change.to}</strong>`,
    });
    if (change.counted !== 'severity') return changed;

    const arrival = flavor(voiceOfActor(this), 'item', CONDITION, change.created ? 'add' : 'increase');
    return arrival === '' ? changed : `${arrival} ${changed}`;
  }

  /**
   * The same grant for a caller holding only a reference: the generator's loadout rows are UUIDs,
   * and a macro names a Condition by id. Resolution is `lookup`'s, so a stale reference is a
   * notification rather than a crash.
   */
  async applyItemRef(ref: string, count = 1): Promise<GrantResult | null> {
    const found = await lookup<GrantDocument>(ref, 'Item');
    if (!found.found) {
      notifyMiss(found.request);
      return null;
    }
    return await this.applyItem(found.document, count);
  }

  /** Refill a weapon's magazine from the rounds carried, and say so in chat. */
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

  /** Post an item's description to chat. The document keeps its accessors — nothing is cloned. */
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

  /* -------------------------------------------- */
  /*  The compatibility surface                   */
  /* -------------------------------------------- */

  /**
   * Ask which cover this actor is behind, and remember the answer. The write goes direct rather
   * than through `mutation/`: cover is one of four words, and that module's whole contract is
   * that what it writes is a number.
   */
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

  /** PSG 28 — Bleeding costs its severity in Health, and says so in the card every gain does. */
  async takeBleedingDamage(): Promise<void> {
    await gain(this, {
      verb: 'gain',
      field: 'health',
      leaf: 'value',
      amount: { kind: 'severity', condition: 'bleeding', sign: -1 },
    });
  }

  /** Legacy's mutation entry: a flat value, or a roll string when the value is null. */
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
