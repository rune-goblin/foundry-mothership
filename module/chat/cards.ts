/**
 * Every card the system posts, assembled as data and rendered once. Legacy built its outcome and
 * dice markup inside the dice engine and its condition cards as hand-written HTML strings — which
 * is how two of them came to point at `systems/foundry-mothership/…`, a path that stopped
 * existing at the rename (audit F4, F8). Here the assembly is pure and unit-tested, every path
 * comes from one constant, and the only impure step is `postCard`.
 *
 * The six `templates/chat/*.html` files stay Handlebars and keep the keys they read today: until
 * R5 deletes it, legacy renders the same templates, so a shape change here would break the
 * shipped system while this module is still wired to nothing.
 */

import type { ItemCard } from '../documents/item.ts';
import { format, has, localize } from '../i18n.ts';
import type { FireOutcome, ReloadOutcome } from '../inventory/ammo.ts';
import type { MutationResult } from '../mutation/mutate.ts';
import { toRollString } from '../rolls/parse.ts';
import type { Outcome } from '../rolls/resolve.ts';
import type { Comparison, RollSpec } from '../rolls/spec.ts';
import type { TableDraw, TableKey } from '../tables/tables.ts';

/** The one place the system's own id appears in a path (audit F4, §18's rename). */
export const SYSTEM_ID = 'mothershiprpg';

export function asset(path: string): string {
  return `systems/${SYSTEM_ID}/${path}`;
}

export type CardKind = 'check' | 'table' | 'mutation' | 'item' | 'reload' | 'description';

const TEMPLATES: Readonly<Record<CardKind, string>> = {
  check: 'rollCheck',
  table: 'rollTable',
  mutation: 'modifyActor',
  item: 'modifyItem',
  reload: 'reload',
  description: 'itemRoll',
};

export function templateOf(kind: CardKind): string {
  return asset(`templates/chat/${TEMPLATES[kind]}.html`);
}

export interface Card<D extends object = object> {
  readonly kind: CardKind;
  readonly data: D;
}

/** What every template reads to tag its message with who it came from. */
export interface CardSource {
  readonly actorId: string | null;
  readonly actorImg: string;
  readonly tokenId: string | null;
}

interface CardOrigin {
  readonly actor: { readonly _id: string | null; readonly img: string };
  readonly tokenId: string | null;
}

function origin(source: CardSource): CardOrigin {
  return { actor: { _id: source.actorId, img: source.actorImg }, tokenId: source.tokenId };
}

export type Voice = 'human' | 'android';

export function voiceOf(robotic: boolean): Voice {
  return robotic ? 'android' : 'human';
}

/**
 * The flavour library: `Mosh.<type>.<context>.<action>.<voice>`. A missing android line falls
 * back to the human one; a missing entry is nothing at all, where `getFlavorText` printed its own
 * argument — "increase" — into the card (audit F20).
 */
export function flavor(voice: Voice, ...path: readonly string[]): string {
  const key = `Mosh.${path.join('.')}`;
  if (has(`${key}.${voice}`)) return localize(`${key}.${voice}`);
  if (has(`${key}.human`)) return localize(`${key}.human`);
  return '';
}

const COMPARE_ICONS: Readonly<Record<Comparison, string>> = {
  '<': 'fa-less-than',
  '<=': 'fa-less-than-equal',
  '>': 'fa-greater-than',
  '>=': 'fa-greater-than-equal',
};

const COMPARE_WORDS: Readonly<Record<Comparison, string>> = {
  '<': 'Mosh.Chat.LessThan',
  '<=': 'Mosh.Chat.LessThanOrEqual',
  '>': 'Mosh.Chat.GreaterThan',
  '>=': 'Mosh.Chat.GreaterThanOrEqual',
};

/**
 * The verdict line. A check with nothing to beat has no verdict, so it prints none. The inline
 * style is legacy's, kept to the pixel: `css/mosh.css` is outside this plan's scope, so these
 * cards may not depend on a class it does not already have.
 */
export function outcomeHtml(outcome: Outcome): string {
  if (outcome.target === null) return '';
  const key = outcome.critical
    ? outcome.success
      ? 'Mosh.Chat.CriticalSuccess'
      : 'Mosh.Chat.CriticalFailure'
    : outcome.success
      ? 'Mosh.Chat.Success'
      : 'Mosh.Chat.Failure';

  return (
    `<div style="font-size: 1.1rem; margin-top : -10px; margin-bottom : 5px;">` +
    `<strong>${localize(key)}</strong></div>`
  );
}

/** A d100 and a d5 are both rolled as a d10 in Foundry's dice art. */
function dieClass(faces: number): string {
  return `d${faces === 100 || faces === 5 ? 10 : faces}`;
}

export interface RollHtmlOptions {
  readonly spec: RollSpec;
  /** Null for a roll that is not judged — a damage roll, a Stress loss. */
  readonly comparison: Comparison | null;
}

/** Foundry's own dice-tooltip markup, built from the outcome instead of from the `Roll` (F19). */
export function rollHtml(outcome: Outcome, options: RollHtmlOptions): string {
  const formula =
    outcome.target === null || options.comparison === null
      ? toRollString(options.spec)
      : `${toRollString(options.spec)} <i class="fas ${COMPARE_ICONS[options.comparison]}"></i> ${outcome.target}`;

  const parts = outcome.dice
    .map((die) => {
      const highlight = die.critical ? (die.success ? ' max' : ' min') : '';
      return (
        `<section class="tooltip-part"><div class="dice">` +
        `<header class="part-header flexrow">` +
        `<span class="part-formula">1d${die.faces}</span>` +
        `<span class="part-total">${die.result}</span>` +
        `</header>` +
        `<ol class="dice-rolls">` +
        `<li class="roll die ${dieClass(die.faces)}${highlight}">${die.result}</li>` +
        `</ol></div></section>`
      );
    })
    .join('');

  return (
    `<div class="dice-roll" style="margin-bottom: 10px;" data-action="expandRoll"><div class="dice-result">` +
    `<div class="dice-formula">${formula}</div>` +
    `<div class="dice-tooltip" hidden><div class="wrapper">${parts}</div></div>` +
    `<h4 class="dice-total">${outcome.total}</h4>` +
    `</div></div>`
  );
}

function rolled(outcome: Outcome, options: RollHtmlOptions): object {
  return {
    total: outcome.total,
    success: outcome.success,
    critical: outcome.critical,
    outcomeHtml: outcomeHtml(outcome),
    rollHtml: rollHtml(outcome, options),
  };
}

export interface CardWeapon {
  readonly _id: string | null;
  readonly name: string;
  readonly img: string;
  readonly system: { readonly description: string };
}

export interface CheckCardInput {
  readonly source: CardSource;
  readonly outcome: Outcome;
  readonly spec: RollSpec;
  readonly comparison: Comparison;
  /** The card's title: the stat's roll label, the weapon's name, "Rest Save". */
  readonly header: string;
  readonly image: string;
  /** The stat this was rolled against, as the sheet labels it. */
  readonly attribute: string;
  readonly skill?: string | null;
  readonly skillBonus?: number;
  readonly flavor?: string;
  readonly weapon?: CardWeapon | null;
  /** The weapon's wound effect, already enriched by the caller. */
  readonly woundEffect?: string;
  /** A damage-only card: the check half of the template is skipped. */
  readonly damage?: boolean;
  readonly critFail?: boolean;
}

export function checkCard(input: CheckCardInput): Card<object> {
  const weapon = input.weapon ?? null;
  const woundEffect = input.woundEffect ?? '';

  return {
    kind: 'check',
    data: {
      ...origin(input.source),
      weapon,
      msgHeader: input.header,
      msgImgPath: input.image,
      // The template's one sentinel, and it never leaves the template's own data.
      specialRoll: input.damage === true ? 'damage' : '',
      parsedRollResult: rolled(input.outcome, input),
      attribute: input.attribute,
      skill: input.skill ?? '',
      skillValue: input.skillBonus ?? 0,
      outcomeVerb: localize(input.outcome.success ? 'Mosh.Chat.Rolled' : 'Mosh.Chat.DidNotRoll'),
      comparisonText: localize(COMPARE_WORDS[input.comparison]),
      flavorText: input.flavor ?? '',
      needsDesc: weapon !== null && (weapon.system.description !== '' || woundEffect !== ''),
      woundEffect,
      critFail: input.critFail === true,
    },
  };
}

/** Which flavour entry each table has. Data, so renaming a table cannot change what it says. */
const TABLE_FLAVOR: Readonly<Record<TableKey, string>> = {
  panic: 'panic_check',
  death: 'death_save',
  bleeding: 'bleeding_wound',
  'blunt-force': 'blunt_force_wound',
  'fire-explosives': 'fire_explosives_wound',
  'gore-massive': 'gore_massive_wound',
  gunshot: 'gunshot_wound',
};

export interface TableCardInput {
  readonly source: CardSource;
  readonly draw: TableDraw;
  readonly spec: RollSpec;
  readonly comparison: Comparison;
  readonly voice: Voice;
  /** What spending the Wound this roll cost said, when the caller spent one. */
  readonly woundText?: string;
  /** A Panic Check names its own effect roll in the card. */
  readonly secondRoll?: boolean;
}

export function tableCard(input: TableCardInput): Card<object> {
  const { draw } = input;
  const entry = draw.key === null ? null : TABLE_FLAVOR[draw.key];

  return {
    kind: 'table',
    data: {
      ...origin(input.source),
      tableName: draw.name,
      tableImg: draw.img,
      parsedRollResult: rolled(draw.outcome, input),
      msgDesc: entry === null ? '' : flavor(input.voice, 'table', entry, 'roll'),
      flavorText: entry === null ? '' : flavor(input.voice, 'table', entry, 'success'),
      tableResultType: draw.rowType,
      tableResult: draw.rows,
      woundText: input.woundText ?? '',
      secondRoll: input.secondRoll === true,
      specialRoll: draw.key === 'panic' ? 'panicCheck' : '',
      critFail: draw.outcome.critical && !draw.outcome.success,
    },
  };
}

/** The image each tracked number shows, in code — the lang files carry prose, not paths (F20). */
const POD_IMAGES: Readonly<Record<string, string>> = {
  health: asset('images/icons/ui/attributes/health.png'),
  hits: asset('images/icons/ui/attributes/health.png'),
  netHP: asset('images/icons/ui/attributes/health.png'),
  bleeding: asset('images/icons/ui/attributes/health.png'),
  strength: asset('images/icons/ui/attributes/strength.png'),
  speed: asset('images/icons/ui/attributes/speed.png'),
  intellect: asset('images/icons/ui/attributes/intellect.png'),
  combat: asset('images/icons/ui/attributes/combat.png'),
  sanity: asset('images/icons/ui/attributes/sanity.png'),
  fear: asset('images/icons/ui/attributes/fear.png'),
  body: asset('images/icons/ui/attributes/body.png'),
  armor: asset('images/icons/ui/attributes/armor.png'),
};

const STRESS_IMAGES: Readonly<Record<'increase' | 'decrease', string>> = {
  increase: asset('images/icons/ui/macros/gain_stress.png'),
  decrease: asset('images/icons/ui/macros/relieve_stress.png'),
};

const BOUND_LABELS: Readonly<Record<string, string | null>> = {
  value: null,
  min: 'Mosh.Minimum',
  max: 'Mosh.Maximum',
};

const strong = (value: number): string => `<strong>${value}</strong>`;

export interface MutationCardInput {
  readonly source: CardSource;
  readonly result: MutationResult;
  readonly voice: Voice;
  /** The dice the change was rolled on, when it was rolled rather than named. */
  readonly spec?: RollSpec | null;
  readonly rollOutcome?: Outcome | null;
}

/**
 * What the change did, in words. The two 140-line copies legacy kept of this had already drifted
 * apart on which of `Mosh.HealthZeroMessage`/`HealthZeroMessage2` they used (audit F7); the second
 * is the one that names the health the bar came back with, and since the last Wound now refills
 * the bar too (divergence R1-6) it is the only one left with anything to say.
 */
function mutationOutcome(input: MutationCardInput): string {
  const { result, voice } = input;
  const pod = result.field.address.pod;
  const label = result.field.label ?? pod;
  const bound = BOUND_LABELS[result.field.address.leaf];
  const moved = result.field.from !== result.field.to;

  if (result.dead) return flavor(voice, 'attribute', 'hits', 'hitCeiling');

  if (result.wounds !== null) {
    return (
      `${localize('Mosh.HealthZeroMessage2')}${strong(result.field.to)}.` +
      `<br><br>${flavor(voice, 'attribute', 'hits', 'increase')}`
    );
  }

  const changed = format('Mosh.Chat.FieldChanged', {
    field: bound === null ? label : `${localize(bound)} ${label}`,
    direction: localize(result.amount >= 0 ? 'Mosh.Chat.Increased' : 'Mosh.Chat.Decreased'),
    from: strong(result.field.from),
    to: strong(result.field.to),
  });

  // PSG 20 — Stress over its maximum is spent reducing a Stat or Save, and it says so whether or
  // not the bar itself moved. Legacy's "already at maximum" branch shadowed the second half of
  // that rule, so a player at 20 Stress was never told to reduce anything (divergence R2-1).
  if (pod === 'stress' && result.overflow > 0) {
    const surplus = format('Mosh.Chat.ReduceStatBySurplus', { amount: result.overflow });
    return moved ? `${changed} ${surplus}` : `${flavor(voice, 'attribute', pod, 'hitCeiling')} ${surplus}`;
  }

  if (!moved && result.overflow !== 0) {
    return flavor(voice, 'attribute', pod, result.overflow > 0 ? 'pastCeiling' : 'pastFloor');
  }

  if (result.bound !== null && moved) {
    const hit = flavor(voice, 'attribute', pod, result.bound === 'floor' ? 'hitFloor' : 'hitCeiling');
    return hit === '' ? changed : `${hit} ${changed}`;
  }

  return changed;
}

export function mutationCard(input: MutationCardInput): Card<object> {
  const { result, voice } = input;
  const pod = result.field.address.pod;
  const direction = result.amount >= 0 ? 'increase' : 'decrease';
  const bound = BOUND_LABELS[result.field.address.leaf];
  const header = flavor(voice, 'attribute', pod, `${direction}Header`);
  const spec = input.spec ?? null;
  const rollOutcome = input.rollOutcome ?? null;

  return {
    kind: 'mutation',
    data: {
      ...origin(input.source),
      msgHeader: bound === null ? header : `${localize(bound)} ${header}`,
      msgImgPath: pod === 'stress' ? STRESS_IMAGES[direction] : (POD_IMAGES[pod] ?? ''),
      msgFlavor: flavor(voice, 'attribute', pod, direction),
      msgOutcome: mutationOutcome(input),
      modRollString: spec === null ? '' : toRollString(spec),
      parsedRollResult:
        spec === null || rollOutcome === null ? null : rolled(rollOutcome, { spec, comparison: null }),
    },
  };
}

export interface ItemCardInput {
  readonly source: CardSource;
  readonly header: string;
  readonly image: string;
  readonly flavor: string;
}

/** The card an item's arrival posts — one line about what the actor now carries. */
export function itemCard(input: ItemCardInput): Card<object> {
  return {
    kind: 'item',
    data: {
      ...origin(input.source),
      msgHeader: input.header,
      msgImgPath: input.image,
      flavorText: input.flavor,
    },
  };
}

interface ReloadCardData extends CardOrigin {
  readonly item: { readonly _id: string | null; readonly name: string };
  readonly msgBody: string;
}

function ammoCard(item: ItemCard, source: CardSource, message: string): Card<ReloadCardData> {
  return {
    kind: 'reload',
    data: {
      ...origin(source),
      item: { _id: item.itemId, name: item.name },
      msgBody: localize(message),
    },
  };
}

/** Reloading says so; a magazine that was already full, or a weapon that tracks none, says nothing. */
export function reloadCard(
  item: ItemCard,
  outcome: ReloadOutcome,
  source: CardSource,
): Card<ReloadCardData> | null {
  switch (outcome.status) {
    case 'reloaded':
      return ammoCard(item, source, 'Mosh.WeaponReloaded');
    case 'out-of-ammo':
      return ammoCard(item, source, 'Mosh.OutOfAmmo');
    default:
      return null;
  }
}

/** Firing posts the attack's own card; only the shot that could not happen posts this one. */
export function fireCard(
  item: ItemCard,
  outcome: FireOutcome,
  source: CardSource,
): Card<ReloadCardData> | null {
  switch (outcome.status) {
    case 'needs-reload':
      return ammoCard(item, source, 'Mosh.OutOfAmmoNeedReload');
    case 'out-of-ammo':
      return ammoCard(item, source, 'Mosh.OutOfAmmo');
    default:
      return null;
  }
}

function number(system: unknown, key: string): number | null {
  const fields = (typeof system === 'object' && system !== null ? system : {}) as Record<string, unknown>;
  const value = Number(fields[key]);
  return Number.isFinite(value) && value !== 0 ? value : null;
}

/**
 * The item as a card. `toChat()` says who the item is; the three numbers this shows besides the
 * description are presentation, so the card reads them rather than growing the document's record.
 *
 * Legacy swapped an item's name and description when the description was exactly `<p>Trinket</p>`
 * or `<p>Patch</p>` — items the AppV1 generator made, which nothing has created since S5 and no
 * shipped document carries. The swap is gone with them: a card shows the item's own name.
 */
export function descriptionCard(item: ItemCard, system: unknown, source: CardSource): Card<object> {
  return {
    kind: 'description',
    data: {
      ...origin(source),
      item: {
        _id: item.itemId,
        name: item.name,
        img: item.img,
        type: item.type,
        system: {
          description: item.description,
          roll: item.roll ?? '',
          severity: number(system, 'severity'),
          armorPoints: number(system, 'armorPoints'),
          damageReduction: number(system, 'damageReduction'),
        },
      },
    },
  };
}

export interface Speaker {
  readonly actor: string | null;
  readonly token: string | null;
  readonly alias: string;
}

export interface PostableRoll {
  toMessage(data: object, options?: object): Promise<unknown>;
}

export interface PostOptions {
  readonly speaker: Speaker;
  /** The evaluated roll to post with, so the dice animate and the message keeps its numbers. */
  readonly roll?: PostableRoll | null;
}

declare const game: { readonly user?: { readonly id: string } } | undefined;

declare const ChatMessage:
  | {
      create(data: object): Promise<unknown>;
      applyMode(data: object, mode?: string): object;
    }
  | undefined;

declare const foundry:
  | { readonly applications: { readonly handlebars: { renderTemplate(path: string, data: object): Promise<string> } } }
  | undefined;

/**
 * The impure half, and all of it: render the card's template and post it. A card built from a
 * roll posts through the roll so Foundry keeps the dice; anything else goes through
 * `ChatMessage`, with the GM's current message mode applied either way.
 */
export async function postCard<D extends object>(card: Card<D>, options: PostOptions): Promise<unknown> {
  if (typeof foundry === 'undefined' || typeof ChatMessage === 'undefined') return null;

  const content = await foundry.applications.handlebars.renderTemplate(templateOf(card.kind), card.data);
  const message = {
    user: typeof game === 'undefined' ? undefined : game?.user?.id,
    speaker: options.speaker,
    content,
  };

  return options.roll ? options.roll.toMessage(message) : ChatMessage.create(ChatMessage.applyMode(message));
}
