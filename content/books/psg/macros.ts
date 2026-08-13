// The macros the shipped tables, sheets and conditions call. Macros are user interface, not the
// system (docs/plans/legacy-remake.md decision 4): every command here is a one-liner into
// `game.mothershiprpg`, and the four hotbar prompts that still choose something the API cannot
// (an amount, a Save, a Wound table) keep the smallest DialogV2 that asks, never their own copy
// of the roll or mutation logic.
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

/**
 * The five Wound tables PSG 29.1 names, the words the book's macro names used for each, and the
 * shipped icon filename — which keeps the `&` the table key's dashes do not spell (audit-adjacent:
 * a naive slug from the key would have 404ed two of these five images).
 */
const WOUND_TABLES: readonly { readonly key: TableKey; readonly name: string; readonly icon: string }[] = [
  { key: 'bleeding', name: 'Bleeding Wound', icon: 'wounds_bleeding.png' },
  { key: 'blunt-force', name: 'Blunt Force Wound', icon: 'wounds_blunt_force.png' },
  { key: 'fire-explosives', name: 'Fire & Explosives Wound', icon: 'wounds_fire_&_explosives.png' },
  { key: 'gore-massive', name: 'Gore & Massive Wound', icon: 'wounds_gore_&_massive.png' },
  { key: 'gunshot', name: 'Gunshot Wound', icon: 'wounds_gunshot.png' },
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

const DIALOG_HEADER = (title: string, img: string, body: string): string => `
  <div class="macro_window" style="margin-bottom: 7px;">
    <div class="grid grid-2col" style="grid-template-columns: 150px auto">
      <div class="macro_img"><img src="${img}" style="border:none"/></div>
      <div class="macro_desc"><h4>${title}</h4>${body}</div>
    </div>
  </div>`;

function amountButtons(
  address: string,
  amounts: readonly [action: string, label: string, icon: string, value: ModifyAmount][],
): string {
  return amounts
    .map(
      ([action, label, icon, value]) =>
        `{ label: \`${label}\`, action: '${action}', icon: \`${icon}\`, ` +
        `callback: () => game.mothershiprpg.modify('${address}', ${amountLiteral(value)}) }`,
    )
    .join(',\n      ');
}

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
    command: `new foundry.applications.api.DialogV2({
  window: { title: "Gain Stress" },
  classes: ["macro-popup-dialog"],
  position: { width: 600 },
  content: \`${DIALOG_HEADER(
    'Gain Stress',
    'systems/mothershiprpg/images/icons/ui/macros/gain_stress.png',
    '<strong>You gain 1 Stress every time you fail a Stat Check or Save.</strong> Occasionally, ' +
      'certain locations or entities can automatically give you Stress from interacting with or ' +
      'witnessing them. Your <strong>Minimum Stress</strong> starts at 2, and the ' +
      '<strong>Maximum Stress you can have is 20.</strong> Any Stress you take over 20 instead ' +
      'reduces the most relevant Stat or Save by that amount.',
  )}
    <div class="macro_prompt">Select your modification:</div>\`,
  buttons: [
    ${amountButtons(STRESS, [
      ['one', 'Gain 1 Stress', 'fas fa-angle-up', amount(1)],
      ['two', 'Gain 2 Stress', 'fas fa-angle-double-up', amount(2)],
      ['roll', 'Gain 1d5 Stress', 'fas fa-arrow-circle-up', roll('1d5')],
    ])}
  ]
}).render({ force: true });`,
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
    command: `new foundry.applications.api.DialogV2({
  window: { title: "Relieve Stress" },
  classes: ["macro-popup-dialog"],
  position: { width: 600 },
  content: \`${DIALOG_HEADER(
    'Relieve Stress',
    'systems/mothershiprpg/images/icons/ui/macros/relieve_stress.png',
    'Occasionally, certain moments, places, or events can automatically <strong>relieve your ' +
      'stress.</strong> Escaping perilous situations, finding a serene location, or experiencing a ' +
      'touching moment with a loved one can have meaningful impacts on your mood and outlook on ' +
      'life. If your stress is getting close to 20, you should consider making a ' +
      '<strong>Rest Save</strong> - as the effects of a failed <strong>Panic Check</strong> can be ' +
      'devastating.',
  )}
    <div class="macro_prompt">Select your modification:</div>\`,
  buttons: [
    ${amountButtons(STRESS, [
      ['one', 'Relieve 1 Stress', 'fas fa-angle-down', amount(-1)],
      ['two', 'Relieve 2 Stress', 'fas fa-angle-double-down', amount(-2)],
      ['roll', 'Relieve 1d5 Stress', 'fas fa-arrow-circle-down', roll('-1d5')],
    ])}
  ]
}).render({ force: true });`,
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
    command: `new foundry.applications.api.DialogV2({
  window: { title: "Save" },
  classes: ["macro-popup-dialog"],
  position: { width: 600 },
  content: \`${DIALOG_HEADER(
    'Save',
    'systems/mothershiprpg/images/icons/ui/macros/save.png',
    'You have three Saves which represent your ability to withstand different kinds of trauma. ' +
      'In order to avoid certain dangers, you sometimes need to roll a Save. <strong>If you roll ' +
      'less than your Save you succeed. Otherwise you fail, and gain 1 Stress.</strong> A roll of ' +
      '90-99 is always a failure. A Critical Failure means something bad happens, and furthermore ' +
      'you must make a Panic Check.',
  )}
    <label for="san"><div class="macro_window" style="padding-left: 3px;">
      <div class="grid grid-3col" style="align-items: center; grid-template-columns: 20px 60px auto">
        <input type="radio" id="san" name="save" value="sanity" checked>
        <div class="macro_img"><img src="systems/mothershiprpg/images/icons/ui/attributes/sanity.png" style="border:none"/></div>
        <div class="macro_desc"><span><strong>Sanity:</strong> Rationalize logical inconsistencies in the universe, make sense out of chaos, detect illusions and mimicry, cope with Stress.</span></div>
      </div>
    </div></label>
    <label for="fer"><div class="macro_window" style="padding-left: 3px;">
      <div class="grid grid-3col" style="align-items: center; grid-template-columns: 20px 60px auto">
        <input type="radio" id="fer" name="save" value="fear">
        <div class="macro_img"><img src="systems/mothershiprpg/images/icons/ui/attributes/fear.png" style="border:none"/></div>
        <div class="macro_desc"><span><strong>Fear:</strong> Maintain a level head while struggling with fear, loneliness, depression, and other emotional surges.</span></div>
      </div>
    </div></label>
    <label for="bod"><div class="macro_window" style="padding-left: 3px;">
      <div class="grid grid-3col" style="align-items: center; grid-template-columns: 20px 60px auto">
        <input type="radio" id="bod" name="save" value="body">
        <div class="macro_img"><img src="systems/mothershiprpg/images/icons/ui/attributes/body.png" style="border:none"/></div>
        <div class="macro_desc"><span><strong>Body:</strong> Employ quick reflexes and resist hunger, disease, or organisms that might try and invade your insides.</span></div>
      </div>
    </div></label>\`,
  buttons: [
    { label: \`Next\`, action: 'next', icon: \`fas fa-chevron-circle-right\`,
      callback: (event, button) => game.mothershiprpg.rollStat(button.form.querySelector("input[name='save']:checked").value) }
  ]
}).render({ force: true });`,
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
    command: `new foundry.applications.api.DialogV2({
  window: { title: "Wound Roll" },
  classes: ["macro-popup-dialog"],
  position: { width: 600 },
  content: \`${DIALOG_HEADER(
    'Wound Roll',
    'systems/mothershiprpg/images/icons/ui/macros/wound_roll.png',
    'Make a <strong>Wound Roll</strong> according to the type of Damage received.',
  )}
    ${WOUND_TABLES.map(
      ({ key, name, icon }) => `<label for="wt-${key}"><div class="macro_window" style="padding-left: 3px;">
      <div class="grid grid-3col" style="align-items: center; grid-template-columns: 20px 60px auto">
        <input type="radio" id="wt-${key}" name="wound_table" value="${key}"${key === 'blunt-force' ? ' checked' : ''}>
        <div class="macro_img"><img src="systems/mothershiprpg/images/icons/ui/rolltables/${icon}" style="border:none"/></div>
        <div class="macro_desc"><span><strong>${name}</strong></span></div>
      </div>
    </div></label>`,
    ).join('\n    ')}
    <div class="macro_prompt">Select your roll type:</div>\`,
  buttons: [
    { label: \`Advantage\`, action: 'plus', icon: \`fas fa-angle-double-up\`,
      callback: (event, button) => game.mothershiprpg.rollTable(button.form.querySelector("input[name='wound_table']:checked").value, { advantage: 'advantage' }) },
    { label: \`Normal\`, action: 'normal', icon: \`fas fa-minus\`,
      callback: (event, button) => game.mothershiprpg.rollTable(button.form.querySelector("input[name='wound_table']:checked").value, { advantage: 'none' }) },
    { label: \`Disadvantage\`, action: 'minus', icon: \`fas fa-angle-double-down\`,
      callback: (event, button) => game.mothershiprpg.rollTable(button.form.querySelector("input[name='wound_table']:checked").value, { advantage: 'disadvantage' }) }
  ]
}).render({ force: true });`,
  },
];
