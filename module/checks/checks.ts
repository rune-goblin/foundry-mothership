/**
 * What happens when someone rolls something. The `Check` union is the whole dispatch: legacy took
 * seven positional parameters, back-filled the null ones from dialogs, and then re-read three of
 * them as sentinels — `attribute === 'damage'`, `attribute === 'restSave'`, `tableId ===
 * 'panicCheck'` — so a damage roll and a Rest Save were the same 434-line method as a Stat Check
 * (audit F9, F14). Here each kind states its own arguments, and this module asks only for what
 * the caller did not say.
 *
 * A check reads the **derived** system: the armour, the swarm multiplier and the condition tally
 * derivation computes are exactly what the roll must be judged against.
 */

import {
  asset,
  checkCard,
  flavor,
  mutationOutcome,
  postCard,
  reloadCard,
  type Card,
} from '../chat/cards.ts';
import { CHECK_SCOPES, type CheckScope } from '../chat/enrichers.ts';
import {
  ATTRIBUTE_KEYS,
  askReload,
  chooseAdvantage,
  chooseAttribute,
  chooseSkill,
  outOfAmmo,
  type SkillRow,
} from '../dialogs/prompts.ts';
import { format, localize } from '../i18n.ts';
import { notifyMiss } from '../lookup.ts';
import { mutate, type MutationResult } from '../mutation/mutate.ts';
import { parseRollSpec } from '../rolls/parse.ts';
import type { Outcome } from '../rolls/resolve.ts';
import { CHECK_SEMANTICS, type Advantage, type Check, type RollSpec, type StatKey } from '../rolls/spec.ts';
import { CHECK_DIE } from '../rules.ts';
import { isTableKey } from '../tables/tables.ts';
import {
  cardSource,
  isCharacter,
  skillBonus,
  skillRankWord,
  speakerOf,
  statOf,
  voiceOfActor,
  type CheckActor,
  type CheckItem,
  type StatValue,
} from './actor.ts';
import { conditionModifier, conditionNote, conditionPreselect } from './conditions.ts';
import { cardWeapon, damageFlavor, rollDamage, woundEffectOf } from './damage.ts';
import { evaluateRoll } from './roll.ts';
import { autoStress } from './settings.ts';
import { runTable, type TableResult } from './tables.ts';

declare const ui: { readonly notifications?: { error(message: string): unknown } } | undefined;

const STRESS = 'system.other.stress.value';

/** PSG 22 — a Rest Save is rolled against the worst of these three. */
const SAVES: readonly StatKey[] = ['sanity', 'fear', 'body'];

const SCOPES: ReadonlySet<string> = new Set(CHECK_SCOPES);

export interface CheckOptions {
  /**
   * The modifier the caller already knows. `null` or absent opens the prompt — which is where a
   * condition preselects the button it argues for (§34), so content naming no modifier still
   * lets the conditions speak.
   */
  readonly advantage?: Advantage | null;
  /** A damage expression that is not the weapon's own: a swarm's scaled dice. */
  readonly damage?: string | null;
}

export interface CheckResult {
  readonly kind: 'check';
  readonly check: Check;
  readonly spec: RollSpec;
  readonly outcome: Outcome;
  readonly stat: StatValue;
  readonly skill: SkillRow | null;
  readonly target: number;
  /** The Stress a failure cost, or a successful rest relieved. */
  readonly stress: MutationResult | null;
  readonly card: Card;
}

export interface DamageResult {
  readonly kind: 'damage';
  readonly card: Card;
}

export type CheckOutcome = CheckResult | DamageResult | TableResult;

/** Which roll a condition would have to name to reach this check. */
export function checkScope(check: Check): CheckScope | null {
  switch (check.kind) {
    case 'stat':
    case 'skill':
      return SCOPES.has(check.stat) ? (check.stat as CheckScope) : null;
    case 'weapon-attack':
      return 'combat';
    case 'rest-save':
      return 'restSave';
    case 'panic':
      return 'panicCheck';
    default:
      return null;
  }
}

/** The check a piece of content names — `@Check[fear]`, `@Check[panicCheck]`. */
export function checkOf(scope: CheckScope): Check {
  if (scope === 'panicCheck') return { kind: 'panic' };
  if (scope === 'restSave') return { kind: 'rest-save' };
  return { kind: 'stat', stat: scope };
}

function describeCheck(check: Check): string {
  const scope = checkScope(check);
  return scope === null ? check.kind : localize(`Mothership.RollScope.${scope}`);
}

/** A roll this actor has no stat for is a message, not a `undefined is not an object`. */
function notifyUnavailable(actor: CheckActor, check: Check): null {
  if (typeof ui !== 'undefined') {
    ui?.notifications?.error(
      format('Mothership.Errors.CheckUnavailable', { actor: actor.name, check: describeCheck(check) }),
    );
  }
  return null;
}

/** The stat a check is rolled against; a Rest Save finds its own — the worst save held. */
function statFor(actor: CheckActor, check: Check): StatValue | null {
  switch (check.kind) {
    case 'stat':
    case 'skill':
      return statOf(actor.system, check.stat);
    case 'weapon-attack':
      return statOf(actor.system, 'combat');
    case 'rest-save': {
      const held = SAVES.map((key) => statOf(actor.system, key)).filter(
        (save): save is StatValue => save !== null,
      );
      // Strictly worse, so saves tying for the worst resolve in the book's order.
      return held.reduce<StatValue | null>(
        (worst, save) => (worst === null || save.value + save.mod < worst.value + worst.mod ? save : worst),
        null,
      );
    }
    default:
      return null;
  }
}

function skillRows(actor: CheckActor): SkillRow[] {
  const rows: SkillRow[] = [];
  for (const item of actor.items) {
    if (item.type !== 'skill' || item.id === null) continue;
    const system = (item.system ?? {}) as { description?: unknown };
    rows.push({
      id: item.id,
      name: item.name,
      img: item.img,
      bonus: skillBonus(item.system),
      description: typeof system.description === 'string' ? system.description : '',
      rank: skillRankWord(item.system),
    });
  }
  return rows;
}

/**
 * PSG 22 — a character may add a relevant skill to what they roll, so every check a character
 * makes opens with the offer. A creature holds no skills to offer, and a check that already
 * names its skill has nothing to ask.
 */
function offersSkill(actor: CheckActor, check: Check): boolean {
  if (!isCharacter(actor)) return false;
  return check.kind === 'stat' || check.kind === 'weapon-attack' || check.kind === 'rest-save';
}

interface Chosen {
  readonly skill: SkillRow | null;
  readonly advantage: Advantage;
}

/**
 * PSG 2's weapon table gives every weapon a range — Adjacent is the melee band, everything past
 * it is fired. A default only: the player can still pick a different skill, or none.
 */
function defaultCombatSkill(weapon: CheckItem, rows: readonly SkillRow[]): SkillRow | null {
  const name = (weapon.system as { range?: unknown }).range === 'adjacent' ? 'Hand-to-Hand Combat' : 'Firearms';
  return rows.find((row) => row.name === name) ?? null;
}

/** Ask for what the caller did not say — in one dialog, where one dialog carries both answers. */
async function ask(
  actor: CheckActor,
  check: Check,
  options: CheckOptions,
  stat: StatValue,
  weapon: CheckItem | null,
): Promise<Chosen | null> {
  const given = options.advantage ?? null;
  const rows = skillRows(actor);
  const named = check.kind === 'skill' ? (rows.find((row) => row.id === check.skillId) ?? null) : null;
  const modifier = conditionModifier(actor.items, checkScope(check));

  // A list of one row saying "No Skill" is not an offer, so an actor holding no skills is asked
  // the plainer question instead.
  if (!offersSkill(actor, check) || rows.length === 0) {
    if (given !== null) return { skill: named, advantage: given };
    const advantage = await chooseAdvantage({
      title: stat.rollLabel,
      note: conditionNote(modifier),
      preselect: conditionPreselect(modifier),
    });
    return advantage === null ? null : { skill: named, advantage };
  }

  const answer = await chooseSkill({
    title: stat.rollLabel,
    skills: rows,
    note: conditionNote(modifier),
    preselect: conditionPreselect(modifier),
    advantage: given === null,
    defaultSkill: weapon === null ? null : defaultCombatSkill(weapon, rows),
    // What the check will roll under before a skill is added — `d100Check` totals the same two.
    stat: { label: stat.label, amount: stat.value + stat.mod },
  });
  return answer === null ? null : { skill: answer.skill, advantage: given ?? answer.advantage };
}

/** The weapon a check names — and a notification rather than a crash when the id is stale. */
function weaponOf(actor: CheckActor, itemId: string): CheckItem | null {
  const item = actor.items.get(itemId);
  if (item === undefined) {
    notifyMiss({ ref: itemId, type: 'Item' });
    return null;
  }
  return item;
}

/**
 * One attack costs what the weapon says it costs, and only an attack asks: a damage roll has no
 * route to this call (audit F5). A weapon that cannot fire says so, and the attack does not
 * happen — the reload it offers is the shot's replacement, not its prelude.
 */
async function spendShot(actor: CheckActor, item: CheckItem): Promise<boolean> {
  const outcome = await item.fire();
  if (outcome.status === 'fired') return true;

  if (outcome.status === 'needs-reload' && (await askReload())) {
    const reloaded = await item.reload();
    const card = reloadCard(item.toChat(), reloaded, cardSource(actor));
    if (card !== null) await postCard(card, { speaker: speakerOf(actor) });
  } else if (outcome.status === 'out-of-ammo') {
    await outOfAmmo();
  }
  return false;
}

function headerOf(check: Check, stat: StatValue, weapon: CheckItem | null): { title: string; image: string } {
  if (weapon !== null) return { title: weapon.name, image: weapon.img };
  if (check.kind === 'rest-save') {
    return { title: localize('Mothership.RestSave'), image: asset('images/icons/ui/macros/rest_save.png') };
  }
  return { title: stat.rollLabel, image: asset(`images/icons/ui/attributes/${stat.key}.png`) };
}

/** PSG 22 — a successful Rest Save relieves Stress equal to the ones digit of the roll. */
function restRelief(total: number): number {
  return -(Math.abs(total) % 10);
}

async function d100Check(
  actor: CheckActor,
  check: Check,
  options: CheckOptions,
): Promise<CheckResult | null> {
  const stat = statFor(actor, check);
  if (stat === null) return notifyUnavailable(actor, check);

  const weapon = check.kind === 'weapon-attack' ? weaponOf(actor, check.itemId) : null;
  if (check.kind === 'weapon-attack' && weapon === null) return null;

  const chosen = await ask(actor, check, options, stat, weapon);
  if (chosen === null) return null;

  if (weapon !== null && !(await spendShot(actor, weapon))) return null;

  const semantics = CHECK_SEMANTICS[check.kind];
  const bonus = chosen.skill?.bonus ?? 0;
  const target = stat.value + stat.mod + bonus;
  const spec: RollSpec = { ...parseRollSpec(CHECK_DIE, semantics.aim), advantage: chosen.advantage };
  const { roll, outcome } = await evaluateRoll({ spec, kind: check.kind, target });

  const voice = voiceOfActor(actor);
  const source = cardSource(actor);
  const character = isCharacter(actor);

  let stress: MutationResult | null = null;
  let flavorText = '';

  if (!outcome.success) {
    // PSG 20 — a failure is a Stress, when the GM leaves that to the system.
    if (character && autoStress()) {
      stress = await mutate(actor, STRESS, { kind: 'amount', amount: 1 });
      flavorText = mutationOutcome({ source, result: stress, voice });
    }
  } else if (weapon !== null) {
    flavorText = damageFlavor(actor, weapon, { override: options.damage, critical: outcome.critical });
  } else if (character && check.kind === 'rest-save') {
    stress = await mutate(actor, STRESS, { kind: 'amount', amount: restRelief(outcome.total) });
    flavorText = mutationOutcome({ source, result: stress, voice });
  } else if (character) {
    flavorText = flavor(voice, 'attribute', stat.key, 'check');
  }

  const header = headerOf(check, stat, weapon);
  const card = checkCard({
    source,
    outcome,
    spec,
    comparison: semantics.comparison,
    header: header.title,
    image: header.image,
    attribute: stat.label,
    skill: chosen.skill?.name ?? '',
    skillBonus: bonus,
    flavor: flavorText,
    weapon: weapon === null ? null : cardWeapon(weapon),
    woundEffect: weapon === null ? '' : woundEffectOf(weapon),
    // A critical failure is where a Panic Check comes from, and the card is where it is offered.
    critFail: character && !outcome.success && outcome.critical,
  });
  await postCard(card, { speaker: speakerOf(actor), roll });

  return { kind: 'check', check, spec, outcome, stat, skill: chosen.skill, target, stress, card };
}

async function damageOnly(
  actor: CheckActor,
  check: Extract<Check, { kind: 'weapon-damage' }>,
  options: CheckOptions,
): Promise<DamageResult | null> {
  const weapon = weaponOf(actor, check.itemId);
  if (weapon === null) return null;
  const card = await rollDamage(actor, weapon, { override: check.damage ?? options.damage ?? null });
  return { kind: 'damage', card };
}

/** The one entry: what is rolled is the check, never a parameter that means two things. */
export async function runCheck(
  actor: CheckActor,
  check: Check,
  options: CheckOptions = {},
): Promise<CheckOutcome | null> {
  switch (check.kind) {
    case 'weapon-damage':
      return await damageOnly(actor, check, options);
    case 'panic':
      return await runTable(actor, 'panic', options);
    case 'table':
      if (!isTableKey(check.tableId)) {
        notifyMiss({ ref: check.tableId, type: 'RollTable' });
        return null;
      }
      return await runTable(actor, check.tableId, options);
    default:
      return await d100Check(actor, check, options);
  }
}

/** What each Stat is worth on this actor: `value + mod`, the two numbers `d100Check` totals. */
function statValues(actor: CheckActor): Record<string, number> {
  const values: Record<string, number> = {};
  for (const key of ATTRIBUTE_KEYS) {
    const stat = statOf(actor.system, key);
    if (stat !== null) values[key] = stat.value + stat.mod;
  }
  return values;
}

/**
 * The check whose stat nobody has named — the Skill Check the hotbar offers. Choosing the stat is
 * one dialog and adding a skill is the next.
 *
 * The roll type is **not** asked here. It used to be, which meant committing to Advantage on the
 * Stat window and then meeting the Skill list with a lone Next — a choice made before its own
 * grounds were known. The last window before the dice owns it, and here that is the Skill window.
 */
export async function promptCheck(
  actor: CheckActor,
  options: CheckOptions = {},
): Promise<CheckOutcome | null> {
  const chosen = await chooseAttribute({ advantage: false, values: statValues(actor) });
  if (chosen === null) return null;
  return await runCheck(actor, { kind: 'stat', stat: chosen.stat }, options);
}

/**
 * The opposite gap: the skill is known — it was clicked — and the stat it applies to is not. PSG
 * 22 leaves that to the moment, so this asks for the stat and nothing else; the skill list the
 * plain check offers has already been answered by the click.
 */
export async function promptSkillCheck(
  actor: CheckActor,
  skillId: string,
  options: CheckOptions = {},
): Promise<CheckOutcome | null> {
  const item = actor.items.get(skillId);
  if (item === undefined || item.type !== 'skill') {
    notifyMiss({ ref: skillId, type: 'Item' });
    return null;
  }

  const bonus = skillBonus(item.system);
  // This window is the last before the dice, so it owns the roll type — and it can name the Skill
  // that opened it, which is what the total on show is adding.
  const chosen = await chooseAttribute({
    advantage: (options.advantage ?? null) === null,
    values: statValues(actor),
    skill: {
      id: skillId,
      name: item.name,
      img: item.img,
      bonus,
      description: '',
      rank: skillRankWord(item.system),
    },
  });
  if (chosen === null) return null;

  return await runCheck(
    actor,
    { kind: 'skill', stat: chosen.stat, skillId, bonus },
    { ...options, advantage: options.advantage ?? chosen.advantage },
  );
}
