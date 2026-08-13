/**
 * What a weapon does when it connects. Every path here is about *damage*, and none of them can
 * reach the magazine: `documents/item.ts` owns `fire()`, only an attack calls it, and nothing in
 * this module's import graph can (audit F5 — `test/checks-damage.test.ts` asserts the graph).
 *
 * The damage itself stays an inline roll in the card, as it has always been: the player rolls it
 * by clicking, Foundry keeps the dice, and the crit rule the GM chose is baked into the
 * expression rather than into a second roll nobody asked for.
 */

import { asset, checkCard, postCard, type Card, type CardWeapon } from '../chat/cards.ts';
import { formatAction } from '../chat/enrichers.ts';
import { format } from '../i18n.ts';
import { parseRollSpec, themed } from '../rolls/parse.ts';
import { resolveOutcome } from '../rolls/resolve.ts';
import { CHECK_SEMANTICS, type Advantage } from '../rolls/spec.ts';
import { STR_CAPACITY_DIVISOR } from '../rules.ts';
import type { TableKey } from '../tables/tables.ts';
import { cardSource, speakerOf, statOf, type CheckActor, type CheckItem } from './actor.ts';
import { critDamage, damageTheme, type CritDamage } from './settings.ts';

/** The stored damage of a weapon whose damage is the wielder's Strength (PSG 2). */
const UNARMED = 'Str/10';

export function weaponDamage(item: CheckItem, override: string | null = null): string {
  const system = (item.system ?? {}) as { damage?: unknown };
  const stored = typeof system.damage === 'string' ? system.damage : '';
  return override !== null && override.trim() !== '' ? override : stored;
}

function weaponText(item: CheckItem, key: string): string {
  const system = (item.system ?? {}) as Record<string, unknown>;
  return typeof system[key] === 'string' ? (system[key] as string) : '';
}

export function cardWeapon(item: CheckItem): CardWeapon {
  return {
    _id: item.id,
    name: item.name,
    img: item.img,
    system: { description: weaponText(item, 'description') },
  };
}

/**
 * The damage expression a critical hit turns the weapon's into. The six answers are the GM's
 * `critDamage` setting, stated once instead of at the six branches legacy compared strings at.
 */
export function critFormula(damage: string, mode: CritDamage, critDamageValue: string): string {
  switch (mode) {
    case 'advantage':
      return `{${damage},${damage}}kh`;
    case 'doubleDamage':
      return `${damage} * 2`;
    case 'doubleDice':
      return `${damage} + ${damage}`;
    case 'maxDamage':
      // `2d10` becomes `2 * 10`: every die rolling its highest face.
      return damage.replaceAll('d', ' * ');
    case 'weaponValue':
      return critDamageValue === '' ? damage : `${damage} + ${critDamageValue}`;
    case 'none':
      return damage;
  }
}

export interface DamageOptions {
  /** The damage this roll deals, when the caller has one — a swarm's scaled dice. */
  readonly override?: string | null;
  /** Whether the attack that led here was a critical hit. */
  readonly critical?: boolean;
}

/**
 * The line the card shows. Unarmed damage is the wielder's Strength over ten, rounded down, so it
 * is stated as arithmetic rather than as dice; everything else is the weapon's own expression,
 * wearing the colorset the GM chose for damage.
 */
export function damageFlavor(actor: CheckActor, item: CheckItem, options: DamageOptions = {}): string {
  const damage = weaponDamage(item, options.override ?? null);
  const strength = statOf(actor.system, 'strength');

  if (damage === UNARMED && strength !== null) {
    return format('Mosh.Chat.UnarmedDamage', {
      damage: `<strong>[[floor(${strength.value}/${STR_CAPACITY_DIVISOR})]]</strong>`,
    });
  }

  const rolled = options.critical === true ? critFormula(damage, critDamage(), weaponText(item, 'critDmg')) : damage;
  return format('Mosh.Chat.DamageDealt', { damage: `[[${themed(rolled, damageTheme())}]]` });
}

/** The wound tables a weapon can name, as its `woundEffect` field spells them. */
const WOUND_EFFECTS: Readonly<Record<string, TableKey>> = {
  bleeding: 'bleeding',
  'blunt force': 'blunt-force',
  'fire & explosives': 'fire-explosives',
  'gore & massive': 'gore-massive',
  gunshot: 'gunshot',
};

const EFFECT_PATTERN = new RegExp(`(${Object.keys(WOUND_EFFECTS).join('|')})\\s*(?:\\[([+-])\\])?`, 'gi');

const MODIFIERS: Readonly<Record<string, Advantage>> = { '+': 'advantage', '-': 'disadvantage' };

/**
 * The weapon's wound effect as clickable rules. Legacy rewrote the same string into `@UUID` links
 * to fifteen macro documents by way of a lang-file lookup table, so a translator could break the
 * links and a re-minted id could dangle (audit F13, F20, C2). The table a wound names is data
 * now; anything else in the field stays the text the author wrote.
 */
export function woundEffectActions(effect: string): string {
  return String(effect ?? '').replace(EFFECT_PATTERN, (match, label: string, modifier?: string) => {
    const table = WOUND_EFFECTS[label.toLowerCase()];
    if (table === undefined) return match;
    return formatAction({ verb: 'table', table, advantage: MODIFIERS[modifier ?? ''] ?? 'none' });
  });
}

export function woundEffectOf(item: CheckItem): string {
  return woundEffectActions(weaponText(item, 'woundEffect'));
}

/** A damage card is judged against nothing, so its outcome is a record with no verdict to give. */
function noOutcome() {
  const spec = parseRollSpec('', CHECK_SEMANTICS['weapon-damage'].aim);
  const semantics = CHECK_SEMANTICS['weapon-damage'];
  return {
    spec,
    outcome: resolveOutcome(
      { total: 0, dice: [] },
      {
        spec,
        kind: 'weapon-damage' as const,
        target: null,
        comparison: semantics.comparison,
        crits: semantics.crits,
        zeroBased: semantics.zeroBased,
        autoFail: semantics.autoFail,
      },
    ),
  };
}

export function damageCard(actor: CheckActor, item: CheckItem, options: DamageOptions = {}): Card {
  const { spec, outcome } = noOutcome();

  return checkCard({
    source: cardSource(actor),
    outcome,
    spec,
    comparison: CHECK_SEMANTICS['weapon-damage'].comparison,
    header: item.name,
    image: item.img || asset('images/icons/ui/attributes/combat.png'),
    attribute: '',
    flavor: damageFlavor(actor, item, options),
    weapon: cardWeapon(item),
    woundEffect: woundEffectOf(item),
    damage: true,
  });
}

/** The whole damage flow: a card, posted. No roll is evaluated and no document is written. */
export async function rollDamage(
  actor: CheckActor,
  item: CheckItem,
  options: DamageOptions = {},
): Promise<Card> {
  const card = damageCard(actor, item, options);
  await postCard(card, { speaker: speakerOf(actor) });
  return card;
}
