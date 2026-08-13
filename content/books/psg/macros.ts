// The macros the shipped tables, sheets and conditions call. Macros are user interface, not the
// system (docs/plans/legacy-remake.md decision 4): every command here is a one-liner into
// `game.mothershiprpg`. Nothing in this file draws a dialog — the prompts that choose an amount,
// a Save or a Wound table are the system's own, in `module/dialogs/`, so they are translated and
// a sheet can open the same ones.
//
// The stat/save, wound-table and modify families are GENERATED from short lists (audit C9) rather
// than transcribed one entry at a time — 700 lines of hand-unrolled cross-product used to hide the
// one typo that shipped a broken Death Save (audit C1). A generator cannot make that mistake twice.
//
// A macro that raises a Condition cannot hold that Condition's id: the id is minted by the build.
// Those rows name the condition by slug instead, and `applyCondition` resolves it at runtime
// through `CONDITION_IDS` — so unlike every other family here, the loader writes this one's call.

import type { Advantage, StatKey } from '../../../module/rolls/spec.ts';
import type { TableKey } from '../../../module/tables/tables.ts';

export interface CommandMacro {
  contentId: string;
  name: string;
  img: string;
  command: string;
}

/** Raises a Condition on the selected actor. The build resolves `condition` to its document id. */
export interface ConditionMacro {
  contentId: string;
  name: string;
  img: string;
  condition: string;
  severity: number;
}

export type MacroRecord = CommandMacro | ConditionMacro;

export function isConditionMacro(macro: MacroRecord): macro is ConditionMacro {
  return 'condition' in macro;
}

const IMG = 'icons/svg/d10-grey.svg';

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/* -------------------------------------------------------------------------------------------- */
/*  The stat/save × advantage cross-product, and the tables' — one line, one verb, one argument.  */
/* -------------------------------------------------------------------------------------------- */

interface AdvantageVariant {
  readonly suffix: string;
  readonly label: string;
  readonly advantage: Advantage;
}

/** `none` still states its modifier explicitly — omitting it is the hotbar's cue to open a prompt. */
const VARIANTS: readonly AdvantageVariant[] = [
  { suffix: '', label: '', advantage: 'none' },
  { suffix: '-minus', label: ' -', advantage: 'disadvantage' },
  { suffix: '-plus', label: ' +', advantage: 'advantage' },
];

function checkMacro(contentId: string, name: string, stat: StatKey, advantage: Advantage): CommandMacro {
  return {
    contentId,
    name,
    img: IMG,
    command: `game.mothershiprpg.rollStat('${stat}', { advantage: '${advantage}' });`,
  };
}

/** The seven stats and saves a Check or Save macro can name — the book spells two nouns for them. */
const STAT_CHECKS: readonly { readonly stat: StatKey; readonly noun: 'Check' | 'Save' }[] = [
  { stat: 'strength', noun: 'Check' },
  { stat: 'speed', noun: 'Check' },
  { stat: 'intellect', noun: 'Check' },
  { stat: 'combat', noun: 'Check' },
  { stat: 'sanity', noun: 'Save' },
  { stat: 'fear', noun: 'Save' },
  { stat: 'body', noun: 'Save' },
];

const STAT_CROSS_PRODUCT: readonly CommandMacro[] = STAT_CHECKS.flatMap(({ stat, noun }) =>
  VARIANTS.map((variant) =>
    checkMacro(
      `${stat}-${noun.toLowerCase()}${variant.suffix}`,
      `${capitalize(stat)} ${noun}${variant.label}`,
      stat,
      variant.advantage,
    ),
  ),
);

/** Rest Save has no bare, un-modified entry — the hotbar's own "Rest Save" prompt is that one. */
const REST_SAVE_CROSS_PRODUCT: readonly CommandMacro[] = VARIANTS.filter((v) => v.advantage !== 'none').map(
  (variant) => ({
    contentId: `rest-save${variant.suffix}`,
    name: `Rest Save${variant.label}`,
    img: IMG,
    command: `game.mothershiprpg.rollRestSave({ advantage: '${variant.advantage}' });`,
  }),
);

function tableMacro(contentId: string, name: string, table: TableKey, advantage: Advantage): CommandMacro {
  return {
    contentId,
    name,
    img: IMG,
    command: `game.mothershiprpg.rollTable('${table}', { advantage: '${advantage}' });`,
  };
}

/** The five Wound tables PSG 29.1 names, and the words the book's macro names used for each. */
const WOUND_TABLES: readonly { readonly key: TableKey; readonly name: string }[] = [
  { key: 'bleeding', name: 'Bleeding Wound' },
  { key: 'blunt-force', name: 'Blunt Force Wound' },
  { key: 'fire-explosives', name: 'Fire & Explosives Wound' },
  { key: 'gore-massive', name: 'Gore & Massive Wound' },
  { key: 'gunshot', name: 'Gunshot Wound' },
];

const WOUND_CROSS_PRODUCT: readonly CommandMacro[] = WOUND_TABLES.flatMap(({ key, name }) =>
  VARIANTS.map((variant) => tableMacro(`${key}-wound${variant.suffix}`, `${name}${variant.label}`, key, variant.advantage)),
);

/** Death has no bare entry either — the hotbar's "Death Save" macro rolls that one, prompt and all. */
const DEATH_CROSS_PRODUCT: readonly CommandMacro[] = VARIANTS.filter((v) => v.advantage !== 'none').map(
  (variant) => tableMacro(`death-save${variant.suffix}`, `Death Save${variant.label}`, 'death', variant.advantage),
);

function panicMacro(contentId: string, name: string, advantage: Advantage): CommandMacro {
  return { contentId, name, img: IMG, command: `game.mothershiprpg.rollPanic({ advantage: '${advantage}' });` };
}

/**
 * A Panic Check is a Check, not a table (`chat/enrichers.ts`) — `rollPanic`, never `rollTable`.
 * Same shape as the rest, minus the bare entry, which the content-referenced `roll-on-panic-table`
 * macro already supplies below.
 */
const PANIC_CROSS_PRODUCT: readonly CommandMacro[] = VARIANTS.filter((v) => v.advantage !== 'none').map(
  (variant) => panicMacro(`panic-check${variant.suffix}`, `Panic Check${variant.label}`, variant.advantage),
);

/* -------------------------------------------------------------------------------------------- */
/*  The `initModifyActor` family — one flat address, one amount, no per-variant function.         */
/* -------------------------------------------------------------------------------------------- */

type ModifyAmount = { readonly kind: 'amount'; readonly amount: number } | { readonly kind: 'roll'; readonly dice: string };

function amountLiteral(amount: ModifyAmount): string {
  return amount.kind === 'amount'
    ? `{ kind: 'amount', amount: ${amount.amount} }`
    : `{ kind: 'roll', dice: '${amount.dice}' }`;
}

function modifyMacro(contentId: string, name: string, address: string, amount: ModifyAmount): CommandMacro {
  return { contentId, name, img: IMG, command: `game.mothershiprpg.modify('${address}', ${amountLiteral(amount)});` };
}

const amount = (n: number): ModifyAmount => ({ kind: 'amount', amount: n });
const roll = (dice: string): ModifyAmount => ({ kind: 'roll', dice });

const HEALTH = 'system.health.value';
const MAX_HEALTH = 'system.health.max';
const WOUND = 'system.hits.value';
const MAX_WOUND = 'system.hits.max';
const STRESS = 'system.other.stress.value';
const MIN_STRESS = 'system.other.stress.min';
const MAX_STRESS = 'system.other.stress.max';
const stat = (key: string): string => `system.stats.${key}.value`;

const MODIFY_MACROS: readonly CommandMacro[] = [
  modifyMacro('minus-10-health', '-10 Health', HEALTH, amount(-10)),
  modifyMacro('minus-1-health', '-1 Health', HEALTH, amount(-1)),
  modifyMacro('minus-1-maximum-wound', '-1 Maximum Wound', MAX_WOUND, amount(-1)),
  modifyMacro('minus-1-minimum-stress', '-1 Minimum Stress', MIN_STRESS, amount(-1)),
  modifyMacro('minus-1-stress', '-1 Stress', STRESS, amount(-1)),
  modifyMacro('minus-1-wound', '-1 Wound', WOUND, amount(-1)),
  modifyMacro('minus-1d10-body-save', '-1d10 Body Save', stat('body'), roll('-1d10')),
  modifyMacro('minus-1d10-health', '-1d10 Health', HEALTH, roll('-1d10')),
  modifyMacro('minus-1d10-intellect', '-1d10 Intellect', stat('intellect'), roll('-1d10')),
  modifyMacro('minus-1d10-maximum-stress', '-1d10 Maximum Stress', MAX_STRESS, roll('-1d10')),
  modifyMacro('minus-1d10-strength', '-1d10 Strength', stat('strength'), roll('-1d10')),
  modifyMacro('minus-1d10-stress', '-1d10 Stress', STRESS, roll('-1d10')),
  modifyMacro('minus-1d5-maximum-health', '-1d5 Maximum Health', MAX_HEALTH, roll('-1d5')),
  modifyMacro('minus-1d5-sanity-save', '-1d5 Sanity Save', stat('sanity'), roll('-1d5')),
  modifyMacro('minus-1d5-stress', '-1d5 Stress', STRESS, roll('-1d5')),
  modifyMacro('minus-2-maximum-stress', '-2 Maximum Stress', MAX_STRESS, amount(-2)),
  modifyMacro('minus-2d10-body-save', '-2d10 Body Save', stat('body'), roll('-2d10')),
  modifyMacro('minus-2d10-health', '-2d10 Health', HEALTH, roll('-2d10')),
  modifyMacro('minus-3d10-health', '-3d10 Health', HEALTH, roll('-3d10')),
  modifyMacro('plus-1-minimum-stress', '+1 Minimum Stress', MIN_STRESS, amount(1)),
  modifyMacro('plus-1-sanity-save', '+1 Sanity Save', stat('sanity'), amount(1)),
  modifyMacro('plus-1-stress', '+1 Stress', STRESS, amount(1)),
  modifyMacro('plus-1d10-combat', '+1d10 Combat', stat('combat'), roll('1d10')),
  modifyMacro('plus-1d10-fear-save', '+1d10 Fear Save', stat('fear'), roll('1d10')),
  modifyMacro('plus-1d10-health', '+1d10 Health', HEALTH, roll('1d10')),
  modifyMacro('plus-1d10-maximum-stress', '+1d10 Maximum Stress', MAX_STRESS, roll('1d10')),
  modifyMacro('plus-1d10-stress', '+1d10 Stress', STRESS, roll('1d10')),
  modifyMacro('plus-1d5-stress', '+1d5 Stress', STRESS, roll('1d5')),
  modifyMacro('plus-2-minimum-stress', '+2 Minimum Stress', MIN_STRESS, amount(2)),
  modifyMacro('plus-2-stress', '+2 Stress', STRESS, amount(2)),
  modifyMacro('plus-2d10-body-save', '+2d10 Body Save', stat('body'), roll('2d10')),
  modifyMacro('plus-2d10-speed', '+2d10 Speed', stat('speed'), roll('2d10')),
  modifyMacro('plus-2d10-strength', '+2d10 Strength', stat('strength'), roll('2d10')),
];

/* -------------------------------------------------------------------------------------------- */
/*  The `initModifyItem` family — a Condition and how much of it, nothing else.                   */
/* -------------------------------------------------------------------------------------------- */

const CONDITION_MACROS: readonly ConditionMacro[] = [
  { contentId: 'plus-1-bleeding', name: '+1 Bleeding', img: IMG, condition: 'bleeding', severity: 1 },
  { contentId: 'plus-1-coward', name: '+1 Coward', img: IMG, condition: 'coward', severity: 1 },
  { contentId: 'plus-1-deflated', name: '+1 Deflated', img: IMG, condition: 'deflated', severity: 1 },
  { contentId: 'plus-1-doomed', name: '+1 Doomed', img: IMG, condition: 'doomed', severity: 1 },
  { contentId: 'plus-1-frightened', name: '+1 Frightened', img: IMG, condition: 'frightened', severity: 1 },
  { contentId: 'plus-1-haunted', name: '+1 Haunted', img: IMG, condition: 'haunted', severity: 1 },
  {
    contentId: 'plus-1-loss-of-confidence',
    name: '+1 Loss of Confidence',
    img: IMG,
    condition: 'loss-of-confidence',
    severity: 1,
  },
  { contentId: 'plus-1-nightmares', name: '+1 Nightmares', img: IMG, condition: 'nightmares', severity: 1 },
  { contentId: 'plus-1-spiraling', name: '+1 Spiraling', img: IMG, condition: 'spiraling', severity: 1 },
  { contentId: 'plus-2-bleeding', name: '+2 Bleeding', img: IMG, condition: 'bleeding', severity: 2 },
  { contentId: 'plus-3-bleeding', name: '+3 Bleeding', img: IMG, condition: 'bleeding', severity: 3 },
  { contentId: 'plus-4-bleeding', name: '+4 Bleeding', img: IMG, condition: 'bleeding', severity: 4 },
  { contentId: 'plus-5-bleeding', name: '+5 Bleeding', img: IMG, condition: 'bleeding', severity: 5 },
  { contentId: 'plus-6-bleeding', name: '+6 Bleeding', img: IMG, condition: 'bleeding', severity: 6 },
  { contentId: 'plus-7-bleeding', name: '+7 Bleeding', img: IMG, condition: 'bleeding', severity: 7 },
];

/* -------------------------------------------------------------------------------------------- */
/*  The four bespoke triggered macros — a genuine procedure each, not a cross-product member.     */
/* -------------------------------------------------------------------------------------------- */

/**
 * "Set the field to N" reads the current value and asks `modify` for the difference — the one
 * thing this API states as a change, never an absolute (audit C3: this used to be a 35-line
 * function per macro, with two of its four parameters always null).
 */
function setFieldMacro(contentId: string, name: string, address: string, target: number, floor = false): CommandMacro {
  const clamp = floor ? `Math.max(0, ${target} - current)` : `${target} - current`;
  return {
    contentId,
    name,
    img: IMG,
    command:
      `game.mothershiprpg.forTargetActors((actor) => {\n` +
      `  const current = ${addressGet(address)};\n` +
      `  return actor.modify('${address}', { kind: 'amount', amount: ${clamp} });\n` +
      `});`,
  };
}

/** `'system.a.b.c'` read the way a macro already reads it — a plain property chain off the actor. */
function addressGet(address: string): string {
  return `actor.${address}`;
}

const BESPOKE_TRIGGERED: readonly CommandMacro[] = [
  panicMacro('roll-on-panic-table', 'Roll on Panic Table', 'none'),
  {
    contentId: 'take-bleeding-damage',
    name: 'Take Bleeding Damage',
    img: IMG,
    command: 'game.mothershiprpg.forTargetActors((actor) => actor.takeBleedingDamage());',
  },
  setFieldMacro('lower-minimum-stress-to-2', 'Lower Minimum Stress to 2', MIN_STRESS, 2),
  setFieldMacro('lower-wounds-to-0', 'Lower Wounds to 0', WOUND, 0),
  setFieldMacro('raise-maximum-stress-to-85', 'Raise Maximum Stress to 85', MAX_STRESS, 85, true),
];

/** Called by table results, condition descriptions and the `Mosh.macro.*` flavour-text links. */
export const TRIGGERED_MACROS: readonly MacroRecord[] = [
  ...STAT_CROSS_PRODUCT,
  ...REST_SAVE_CROSS_PRODUCT,
  ...WOUND_CROSS_PRODUCT,
  ...DEATH_CROSS_PRODUCT,
  ...PANIC_CROSS_PRODUCT,
  ...BESPOKE_TRIGGERED,
  ...MODIFY_MACROS,
  ...CONDITION_MACROS,
];

export type TriggeredMacroId = (typeof TRIGGERED_MACROS)[number]['contentId'];

/* -------------------------------------------------------------------------------------------- */
/*  The hotbar macros — one per procedure the book asks a player to run. Targeting is `modify`'s  */
/*  problem now (`forTargetActors` asks when nothing is selected), so none of these read a        */
/*  setting or branch on `game.user.character` — the ~30-line wrapper every one of these used to   */
/*  open with is simply gone.                                                                      */
/* -------------------------------------------------------------------------------------------- */

export const HOTBAR_MACROS: readonly CommandMacro[] = [
  {
    contentId: 'cover',
    name: 'Cover',
    img: 'systems/mothershiprpg/images/icons/ui/attributes/armor.png',
    command: 'game.mothershiprpg.forTargetActors((actor) => actor.chooseCover());',
  },
  {
    contentId: 'death-save',
    name: 'Death Save',
    img: 'systems/mothershiprpg/images/icons/ui/rolltables/death_save.png',
    // Advantage absent opens the roll prompt — the system's own dialog replaces the embedded one.
    command: "game.mothershiprpg.rollTable('death');",
  },
  {
    contentId: 'gain-stress',
    name: 'Gain Stress',
    img: 'systems/mothershiprpg/images/icons/ui/macros/gain_stress.png',
    // The amount chooser is `dialogs/Amount.svelte` now, translated and shared with its opposite.
    command: "game.mothershiprpg.promptStress('gain');",
  },
  {
    contentId: 'panic-check',
    name: 'Panic Check',
    img: 'systems/mothershiprpg/images/icons/ui/rolltables/panic_check.png',
    // Advantage absent opens the roll prompt — the same trade as Death Save, above.
    command: 'game.mothershiprpg.rollPanic();',
  },
  {
    contentId: 'relieve-stress',
    name: 'Relieve Stress',
    img: 'systems/mothershiprpg/images/icons/ui/macros/relieve_stress.png',
    command: "game.mothershiprpg.promptStress('relieve');",
  },
  {
    contentId: 'rest-save',
    name: 'Rest Save',
    img: 'systems/mothershiprpg/images/icons/ui/macros/rest_save.png',
    // rollRestSave() opens the same skill-and-advantage prompt every Rest Save offers a character.
    command: 'game.mothershiprpg.rollRestSave();',
  },
  {
    contentId: 'save',
    name: 'Save',
    img: 'systems/mothershiprpg/images/icons/ui/macros/save.png',
    // The three Saves are `dialogs/`'s stat picker with the book's other list in it.
    command: 'game.mothershiprpg.promptSave();',
  },
  {
    contentId: 'stat-check',
    name: 'Stat Check',
    img: 'systems/mothershiprpg/images/icons/ui/macros/stat_check.png',
    // promptCheck() opens the same four-stat picker this macro's dialog used to draw by hand.
    command: 'game.mothershiprpg.promptCheck();',
  },
  {
    contentId: 'wound-roll',
    name: 'Wound Roll',
    img: 'systems/mothershiprpg/images/icons/ui/macros/wound_roll.png',
    // The five table keys are `tables/`'s, so this macro carries no document id at all (audit C2).
    command: 'game.mothershiprpg.promptWound();',
  },
];
