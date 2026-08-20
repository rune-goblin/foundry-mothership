// Nothing here may import a path that reaches the item's fire or reload methods —
// test/checks-damage.test.ts asserts the import graph.
import {
  asset,
  CARD_FLAG,
  checkCard,
  ownsCard,
  postCard,
  renderCard,
  SYSTEM_ID,
  type Card,
  type CardMessage,
  type CardWeapon,
} from '../chat/cards.ts';
import { formatAction } from '../chat/enrichers.ts';
import { format, localize } from '../i18n.ts';
import { parseRollSpec, themed } from '../rolls/parse.ts';
import { resolveOutcome } from '../rolls/resolve.ts';
import { CHECK_SEMANTICS, type Advantage } from '../rolls/spec.ts';
import { STR_CAPACITY_DIVISOR } from '../rules.ts';
import type { TableKey } from '../tables/tables.ts';
import { cardSource, speakerOf, statOf, type CheckActor, type CheckItem } from './actor.ts';
import { critDamage, damageTheme, type CritDamage } from './settings.ts';

/** The stored damage of a weapon whose damage is the wielder's Strength (PSG 2). */
const UNARMED = 'Str/10';

export interface DamageMode {
  /** What decides this damage — a range band, most often. Blank for the weapon's own. */
  readonly label: string;
  readonly formula: string;
}

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
  /** Offer the damage as buttons instead of rolling it: the GM turned auto-rolling off. */
  readonly offer?: boolean;
}

function rangeLabel(item: CheckItem): string {
  const range = (item.system as { range?: unknown }).range;
  return typeof range === 'string' && range !== '' && range !== 'none'
    ? localize(`Mothership.RangeBand.${range}`)
    : '';
}

/** Minus the empty rows the sheet's editor leaves behind. */
function storedModes(item: CheckItem): DamageMode[] {
  const rows = (item.system as { damageModes?: unknown }).damageModes;
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row) => {
      const mode = (typeof row === 'object' && row !== null ? row : {}) as Record<string, unknown>;
      return {
        label: typeof mode.label === 'string' ? mode.label : '',
        formula: typeof mode.formula === 'string' ? mode.formula.trim() : '',
      };
    })
    .filter((mode) => mode.formula !== '');
}

/** A caller that names the damage has already settled the question, so it gets no alternatives. */
export function damageModes(item: CheckItem, override: string | null = null): DamageMode[] {
  const primary = { label: rangeLabel(item), formula: weaponDamage(item, override) };
  const chosen = override !== null && override.trim() !== '';
  return chosen ? [primary] : [primary, ...storedModes(item)];
}

/** A mode's label cannot carry the braces the action grammar ends a label with. */
const labelText = (label: string): string => label.replace(/[{}]/g, '');

/** `Str/10` is the book's shorthand, not a formula — a button has to carry dice Foundry can roll. */
function rollable(actor: CheckActor, formula: string): string {
  if (formula !== UNARMED) return formula;
  const strength = statOf(actor.system, 'strength');
  return strength === null ? formula : `floor(${strength.value}/${STR_CAPACITY_DIVISOR})`;
}

/** The crit rule is baked in here, so a button rolls the damage its own attack earned. */
function offerHtml(
  actor: CheckActor,
  item: CheckItem,
  modes: readonly DamageMode[],
  critical: boolean,
): string {
  const critRule = critDamage();
  const critValue = weaponText(item, 'critDmg');

  const buttons = modes
    .map((mode) => {
      const base = rollable(actor, mode.formula);
      const formula = critical ? critFormula(base, critRule, critValue) : base;
      const action = formatAction({ verb: 'damage', formula });
      if (mode.label === '') return action;
      return `${action}{${format('Mothership.Chat.DamageModeLabel', {
        damage: formula,
        mode: labelText(mode.label),
      })}}`;
    })
    .join(' ');

  return format('Mothership.Chat.RollDamageOffer', { damage: buttons });
}

/**
 * Unarmed damage is stated as arithmetic (Strength/10, rounded down), not dice. With auto-rolling
 * off, offers every mode instead of stating one — this function doesn't know the range.
 */
export function damageFlavor(actor: CheckActor, item: CheckItem, options: DamageOptions = {}): string {
  const modes = damageModes(item, options.override ?? null);

  if (options.offer === true) return offerHtml(actor, item, modes, options.critical === true);

  const damage = modes[0].formula;
  const strength = statOf(actor.system, 'strength');

  if (damage === UNARMED && strength !== null) {
    return format('Mothership.Chat.UnarmedDamage', {
      damage: `<strong>[[floor(${strength.value}/${STR_CAPACITY_DIVISOR})]]</strong>`,
    });
  }

  const rolled = options.critical === true ? critFormula(damage, critDamage(), weaponText(item, 'critDmg')) : damage;
  return format('Mothership.Chat.DamageDealt', { damage: `[[${themed(rolled, damageTheme())}]]` });
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

/** Only a recognized wound-effect name becomes a table link; the rest of the field's text passes through unchanged. */
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

function rememberedCard(message: CardMessage): Card<Record<string, unknown>> | null {
  const stored = message.getFlag(SYSTEM_ID, CARD_FLAG);
  if (typeof stored !== 'object' || stored === null) return null;
  const card = stored as { kind?: unknown; data?: unknown };
  return card.kind === 'check' && typeof card.data === 'object' && card.data !== null
    ? (card as Card<Record<string, unknown>>)
    : null;
}

/**
 * `forbidden` is a rule, not a failure to route around — a separate card would let a player roll
 * a creature's damage by the back door. `unrecorded` is a card posted before this system kept its
 * own data behind one.
 */
export type CardDamage = 'rewritten' | 'forbidden' | 'unrecorded';

/** The offer becomes the result, in the card that made it, so it cannot be taken twice. */
export async function rollDamageInCard(
  message: CardMessage,
  user: unknown,
  actor: CheckActor,
  item: CheckItem,
  formula: string,
): Promise<CardDamage> {
  if (!ownsCard(message, user)) return 'forbidden';

  const card = rememberedCard(message);
  if (card === null) return 'unrecorded';

  // No `critical`: the button was written carrying the crit rule already applied.
  const flavorText = damageFlavor(actor, item, { override: formula });
  const content = await renderCard({ kind: card.kind, data: { ...card.data, flavorText } });
  if (content === null) return 'unrecorded';

  await message.update({ content, [`flags.${SYSTEM_ID}.${CARD_FLAG}.data.flavorText`]: flavorText });
  return 'rewritten';
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
