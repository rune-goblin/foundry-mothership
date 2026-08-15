/**
 * The grammar of a clickable rule. Conditions and table results used to link a *macro document*
 * per phrasing — 15 of them, each a copy of one of four functions with its arguments baked in —
 * so every piece of content carried an id that could dangle (audit C2, C10). Here the content
 * names the meaning instead:
 *
 * ```
 * @Check[fear -]                 make a Fear Save at disadvantage
 * @Table[gunshot]                roll on the Gunshot Wound table
 * @Gain[stress 1d5]              gain 1d5 Stress
 * @Gain[health -bleeding]        take damage equal to your Bleeding
 * @Apply[coward]                 gain the Coward condition
 * ```
 *
 * Each renders as a button; `chat/actions.ts` routes the click. A trailing `{…}` overrides the
 * generated label, exactly as `@UUID[…]{…}` does. One parser reads both the text form and the
 * button's `data-mothership-action`, so what content writes and what a click executes cannot
 * diverge.
 *
 * A Panic Check is a check, not a table: it is judged against Stress and it is spelled
 * `@Check[panicCheck]`. `@Table` takes the six tables that are pure lookups.
 */

import { localize, format } from '../i18n.ts';
import { addressOf, isFieldKey, type FieldKey } from '../mutation/fields.ts';
import type { PodLeaf } from '../mutation/address.ts';
import { isTableKey, type TableKey } from '../tables/tables.ts';
import type { Advantage } from '../rolls/spec.ts';

/**
 * The rolls a check can name — `module/data/item-models.js`'s `ROLL_SCOPES`, which is the same
 * key space a condition's modifier declares (S8). One vocabulary: a condition that says it
 * applies to `restSave` modifies the roll `@Check[restSave]` makes. `test/chat-enrichers.test.ts`
 * holds the two lists to each other.
 */
export const CHECK_SCOPES = [
  'strength',
  'speed',
  'intellect',
  'combat',
  'sanity',
  'fear',
  'body',
  'restSave',
  'panicCheck',
] as const;

export type CheckScope = (typeof CHECK_SCOPES)[number];

export type ActionVerb = 'check' | 'table' | 'gain' | 'apply';

/** What a field changes by: a flat number, dice to roll, or the severity of a condition. */
export type GainAmount =
  | { readonly kind: 'amount'; readonly amount: number }
  | { readonly kind: 'roll'; readonly dice: string }
  | { readonly kind: 'severity'; readonly condition: string; readonly sign: 1 | -1 };

export type ChatAction =
  | { readonly verb: 'check'; readonly scope: CheckScope; readonly advantage: Advantage }
  | { readonly verb: 'table'; readonly table: TableKey; readonly advantage: Advantage }
  | {
      readonly verb: 'gain';
      readonly field: FieldKey;
      readonly leaf: PodLeaf;
      readonly amount: GainAmount;
    }
  | { readonly verb: 'apply'; readonly condition: string; readonly count: number };

export type ActionFault = 'syntax' | 'verb' | 'argument';

export type ActionParse =
  | { readonly ok: true; readonly action: ChatAction; readonly label: string | null }
  | { readonly ok: false; readonly fault: ActionFault; readonly detail: string };

const VERBS: Readonly<Record<string, ActionVerb>> = {
  Check: 'check',
  Table: 'table',
  Gain: 'gain',
  Apply: 'apply',
};

const SPELLING: Readonly<Record<ActionVerb, string>> = {
  check: 'Check',
  table: 'Table',
  gain: 'Gain',
  apply: 'Apply',
};

const SYNTAX = '@(Check|Table|Gain|Apply)\\[([^\\]]*)\\](?:\\{([^}]*)\\})?';

/** The enricher scans with this; `parseAction` uses its own anchored copy, so neither carries
 * the other's `lastIndex`. */
export const ACTION_PATTERN = new RegExp(SYNTAX, 'g');

const ANCHORED = new RegExp(`^${SYNTAX}$`);

const MODIFIERS: Readonly<Record<string, Advantage>> = { '+': 'advantage', '-': 'disadvantage' };

const SIGNS: Readonly<Record<Advantage, string>> = { none: '', advantage: ' +', disadvantage: ' -' };

const NUMBER = /^[+-]?\d+$/;
const DICE = /^[+-]?\d*d\d+$/i;
const SLUG = /^[a-z][a-z0-9-]*$/;

function bad(fault: ActionFault, detail: string): ActionParse {
  return { ok: false, fault, detail };
}

function advantageOf(token: string | undefined): Advantage | null {
  if (token === undefined) return 'none';
  return MODIFIERS[token] ?? null;
}

function parseCheck(args: readonly string[]): ActionParse {
  const [scope, modifier, ...rest] = args;
  const advantage = advantageOf(modifier);
  if (rest.length > 0 || advantage === null) return bad('argument', `@Check[${args.join(' ')}]`);
  if (!(CHECK_SCOPES as readonly string[]).includes(scope)) {
    return bad('argument', `${scope} is not a roll a condition can name`);
  }
  return { ok: true, action: { verb: 'check', scope: scope as CheckScope, advantage }, label: null };
}

function parseTable(args: readonly string[]): ActionParse {
  const [key, modifier, ...rest] = args;
  const advantage = advantageOf(modifier);
  if (rest.length > 0 || advantage === null) return bad('argument', `@Table[${args.join(' ')}]`);
  // The Panic Check draws from a table but is judged against Stress, so it has one spelling.
  if (key === 'panic') return bad('argument', 'a Panic Check is @Check[panicCheck]');
  if (!isTableKey(key)) return bad('argument', `${key} is not a table`);
  return { ok: true, action: { verb: 'table', table: key, advantage }, label: null };
}

function parseAmount(token: string): GainAmount | null {
  if (NUMBER.test(token)) return { kind: 'amount', amount: Number(token) };
  if (DICE.test(token)) return { kind: 'roll', dice: token };

  const sign = token.startsWith('-') ? -1 : 1;
  const condition = token.replace(/^[+-]/, '');
  return SLUG.test(condition) ? { kind: 'severity', condition, sign } : null;
}

function parseGain(args: readonly string[]): ActionParse {
  const [target, value, ...rest] = args;
  if (rest.length > 0 || value === undefined) return bad('argument', `@Gain[${args.join(' ')}]`);

  const [field, leaf = 'value'] = target.split('.');
  if (!isFieldKey(field)) return bad('argument', `${field} is not a field`);
  if (leaf !== 'value' && leaf !== 'min' && leaf !== 'max') {
    return bad('argument', `${leaf} is not value, min or max`);
  }

  const amount = parseAmount(value);
  if (amount === null) return bad('argument', `${value} is not an amount`);
  return { ok: true, action: { verb: 'gain', field, leaf, amount }, label: null };
}

function parseApply(args: readonly string[]): ActionParse {
  const [condition, count = '1', ...rest] = args;
  if (rest.length > 0) return bad('argument', `@Apply[${args.join(' ')}]`);
  if (!SLUG.test(condition ?? '')) return bad('argument', `${condition} is not a condition`);
  if (!NUMBER.test(count) || Number(count) === 0) return bad('argument', `${count} is not a count`);
  return { ok: true, action: { verb: 'apply', condition, count: Number(count) }, label: null };
}

/** Read one expression. The same function reads content text and a button's data attribute. */
export function parseAction(text: string): ActionParse {
  const match = ANCHORED.exec(String(text ?? '').trim());
  if (match === null) return bad('syntax', String(text ?? ''));

  const verb = VERBS[match[1]];
  if (verb === undefined) return bad('verb', match[1]);

  const args = match[2].trim().split(/\s+/).filter((part) => part !== '');
  const parsed =
    verb === 'check'
      ? parseCheck(args)
      : verb === 'table'
        ? parseTable(args)
        : verb === 'gain'
          ? parseGain(args)
          : parseApply(args);

  return parsed.ok && match[3] !== undefined ? { ...parsed, label: match[3] } : parsed;
}

function amountText(amount: GainAmount): string {
  switch (amount.kind) {
    case 'amount':
      return String(amount.amount);
    case 'roll':
      return amount.dice;
    case 'severity':
      return `${amount.sign === -1 ? '-' : ''}${amount.condition}`;
  }
}

/** The action back as the expression that produced it — what the button carries and a click reads. */
export function formatAction(action: ChatAction): string {
  const args = (() => {
    switch (action.verb) {
      case 'check':
        return `${action.scope}${SIGNS[action.advantage]}`;
      case 'table':
        return `${action.table}${SIGNS[action.advantage]}`;
      case 'gain':
        return `${action.field}${action.leaf === 'value' ? '' : `.${action.leaf}`} ${amountText(action.amount)}`;
      case 'apply':
        return `${action.condition}${action.count === 1 ? '' : ` ${action.count}`}`;
    }
  })();
  return `@${SPELLING[action.verb]}[${args}]`;
}

/** The dotted address a `@Gain` names, for the mutation engine that takes one. */
export function gainAddress(action: Extract<ChatAction, { verb: 'gain' }>): string {
  return addressOf(action.field, action.leaf);
}

const FIELD_NOUNS: Readonly<Record<FieldKey, string>> = {
  health: 'Mothership.Health',
  wounds: 'Mothership.Wounds',
  stress: 'Mothership.Stress',
  strength: 'Mothership.Strength',
  speed: 'Mothership.Speed',
  intellect: 'Mothership.Intellect',
  combat: 'Mothership.Combat',
  sanity: 'Mothership.Sanity',
  fear: 'Mothership.Fear',
  body: 'Mothership.Body',
};

const BOUNDS: Readonly<Record<PodLeaf, string | null>> = {
  value: null,
  min: 'Mothership.Minimum',
  max: 'Mothership.Maximum',
};

const MODIFIER_LABELS: Readonly<Record<Advantage, string>> = {
  none: '',
  advantage: ' [+]',
  disadvantage: ' [-]',
};

function signed(text: string): string {
  return text.startsWith('-') ? text : `+${text}`;
}

/** A condition slug as prose. Content that wants the book's capitals passes its own `{label}`. */
function conditionName(condition: string): string {
  return condition
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function fieldLabel(field: FieldKey, leaf: PodLeaf): string {
  const noun = localize(FIELD_NOUNS[field]);
  const bound = BOUNDS[leaf];
  return bound === null ? noun : format('Mothership.Chat.BoundedField', { bound: localize(bound), field: noun });
}

/** What the button says when the content does not say it itself. */
export function actionLabel(action: ChatAction): string {
  switch (action.verb) {
    case 'check':
      return `${localize(`Mothership.RollScope.${action.scope}`)}${MODIFIER_LABELS[action.advantage]}`;
    case 'table':
      return `${localize(`Mothership.Table.${action.table}`)}${MODIFIER_LABELS[action.advantage]}`;
    case 'gain':
      return action.amount.kind === 'severity'
        ? format('Mothership.Chat.SufferLabel', { condition: conditionName(action.amount.condition) })
        : format('Mothership.Chat.GainLabel', {
            amount: signed(amountText(action.amount)),
            field: fieldLabel(action.field, action.leaf),
          });
    case 'apply':
      return format('Mothership.Chat.ApplyLabel', {
        count: signed(String(action.count)),
        condition: conditionName(action.condition),
      });
  }
}

const ICONS: Readonly<Record<ActionVerb, string>> = {
  check: 'fa-solid fa-dice-d20',
  table: 'fa-solid fa-list',
  gain: 'fa-solid fa-plus-minus',
  apply: 'fa-solid fa-notes-medical',
};

/** The routing key the delegated listener matches, namespaced so no window claims it by accident. */
export const ACTION_ATTRIBUTE = 'mothershipChatAction';

export function actionButton(action: ChatAction, label: string | null = null): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'content-link mothership-action';
  button.dataset.action = ACTION_ATTRIBUTE;
  button.dataset.mothershipAction = formatAction(action);

  const icon = document.createElement('i');
  icon.className = ICONS[action.verb];
  button.append(icon, label ?? actionLabel(action));
  return button;
}

/** Unreadable text stays text: a typo in content is visible, never a button that does nothing. */
export function enrichAction(match: RegExpMatchArray): HTMLElement | null {
  const parsed = parseAction(match[0]);
  return parsed.ok ? actionButton(parsed.action, parsed.label) : null;
}

interface EnricherConfig {
  readonly id: string;
  readonly pattern: RegExp;
  readonly enricher: (match: RegExpMatchArray) => HTMLElement | null;
}

declare const CONFIG: { readonly TextEditor: { enrichers: EnricherConfig[] } } | undefined;

const ENRICHER_ID = 'mothership-action';

/** Called once, by `init.ts`. Registering twice would render every action twice. */
export function registerEnrichers(): void {
  if (typeof CONFIG === 'undefined') return;
  const enrichers = CONFIG?.TextEditor.enrichers;
  if (enrichers === undefined || enrichers.some((entry) => entry.id === ENRICHER_ID)) return;
  enrichers.push({ id: ENRICHER_ID, pattern: ACTION_PATTERN, enricher: enrichAction });
}
