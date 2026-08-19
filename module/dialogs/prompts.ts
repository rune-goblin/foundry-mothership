/**
 * The prompts the system asks, each a typed function returning what the user answered — or `null`
 * when they closed the window. Nothing here decides anything: `checks/` asks only for what it is
 * missing, and every one of these resolves exactly once (audit F6).
 */

import { asset } from '../chat/cards.ts';
import { enrich } from '../enrich.ts';
import { format, localize } from '../i18n.ts';
import type { Amount } from '../mutation/mutate.ts';
import type { Advantage, StatKey } from '../rolls/spec.ts';
import { COVER_KEYS, type Cover } from '../rules.ts';
import { WOUND_TABLE_KEYS, type TableKey } from '../tables/tables.ts';
import AmountPromptBody from './Amount.svelte';
import CheckPrompt from './CheckPrompt.svelte';
import ChooseAdvantage from './ChooseAdvantage.svelte';
import CoverPrompt from './Cover.svelte';
import NoCharacter from './NoCharacter.svelte';
import ReloadPrompt from './Reload.svelte';
import WoundTable from './WoundTable.svelte';
import { svelteDialog, type DialogButton } from './svelte-dialog.ts';

const DIALOG_WIDTH = 600;

/** Wide enough for the list and the roll rail side by side. */
const RAIL_WIDTH = 660;

/**
 * The book's own marks. `[+]` and `[−]` are what the PSG prints, so they are notation rather than
 * language and `css/mothership.css` draws them from these classes; a plain roll is the absence of a
 * mark, and keeps the empty column so the three labels align.
 */
const ICONS: Readonly<Record<Advantage, string>> = {
  advantage: 'roll-mark roll-mark-advantage',
  none: 'roll-mark',
  disadvantage: 'roll-mark roll-mark-disadvantage',
};

const LABELS: Readonly<Record<Advantage, string>> = {
  advantage: 'Mothership.Advantage',
  none: 'Mothership.Normal',
  disadvantage: 'Mothership.Disadvantage',
};

/** Normal leads: it is the roll nobody has to think about, and the one Enter fires. */
const ORDER: readonly Advantage[] = ['none', 'advantage', 'disadvantage'];

/** The class `css/mothership.css` paints the preselected button with. */
const PRESELECT = 'condition-preselect';

/**
 * The three roll-type buttons. Normal is the default, so a window opened and dismissed with Enter
 * rolls the plain roll. A condition that names this roll takes that default and preselects the
 * button it argues for instead, which DialogV2 autofocuses — a default, never a decision (§34).
 */
function advantageButtons<V, T>(
  preselect: Advantage | null,
  answer: (advantage: Advantage, value: V) => T,
): DialogButton<V, T>[] {
  const fallback = preselect ?? 'none';
  return ORDER.map((advantage) => ({
    action: advantage,
    label: localize(LABELS[advantage]),
    icon: ICONS[advantage],
    ...(advantage === fallback ? { default: true } : {}),
    ...(preselect === advantage ? { class: PRESELECT } : {}),
    answer: (value: V) => answer(advantage, value),
  }));
}

function nextButton<V, T>(answer: (value: V) => T): DialogButton<V, T> {
  return {
    action: 'next',
    label: localize('Mothership.Next'),
    icon: 'fas fa-chevron-circle-right',
    answer,
  };
}

interface StatRow {
  readonly key: StatKey;
  readonly label: string;
  readonly example: string;
}

/** The four stats a Skill Check can be rolled against, as the dialog lists them. */
const ATTRIBUTES: readonly StatRow[] = [
  { key: 'strength', label: 'Mothership.Strength', example: 'Mothership.StrengthSkillExample' },
  { key: 'speed', label: 'Mothership.Speed', example: 'Mothership.SpeedSkillExample' },
  { key: 'intellect', label: 'Mothership.Intellect', example: 'Mothership.IntellectSkillExample' },
  { key: 'combat', label: 'Mothership.Combat', example: 'Mothership.CombatSkillExample' },
];

/** The keys the Stat picker offers, so a caller can price them before it asks. */
export const ATTRIBUTE_KEYS: readonly StatKey[] = ATTRIBUTES.map((row) => row.key);

/** PSG 22's three Saves. The same picker, a different list — the hotbar's Save macro asks with it. */
const SAVES: readonly StatRow[] = [
  { key: 'sanity', label: 'Mothership.Sanity', example: 'Mothership.SanitySaveExample' },
  { key: 'fear', label: 'Mothership.Fear', example: 'Mothership.FearSaveExample' },
  { key: 'body', label: 'Mothership.Body', example: 'Mothership.BodySaveExample' },
];

export interface ChosenAttribute {
  readonly stat: StatKey;
  readonly advantage: Advantage;
}

export interface AttributePrompt {
  /** Whether the roll type is still open; when it is not, one Next button closes the window. */
  readonly advantage: boolean;
  /**
   * What each Stat is worth on this actor — `value + mod`, the number `d100Check` rolls under. A
   * Save asked before its actor is settled has none, and the window states no total rather than
   * a wrong one.
   */
  readonly values?: Readonly<Record<string, number>>;
  /** The Skill already chosen, when the click that opened this window was a Skill's. */
  readonly skill?: SkillRow | null;
}

interface StatPromptText {
  readonly title: string;
  readonly heading: string;
  readonly intro: string;
}

/** The Stat and Save examples run to 125 characters, which is three lines in this window. */
const STAT_DESCRIPTION_LINES = 3;

async function pickStat(
  rows: readonly StatRow[],
  text: StatPromptText,
  prompt: AttributePrompt,
): Promise<ChosenAttribute | null> {
  const values = prompt.values ?? {};
  const skill = prompt.skill ?? null;
  const props = {
    heading: text.heading,
    intro: text.intro,
    options: rows.map((entry) => ({
      key: entry.key,
      label: localize(entry.label),
      value: values[entry.key] === undefined ? '' : String(values[entry.key]),
      amount: values[entry.key],
      description: localize(entry.example),
    })),
    picks: 'stat',
    fixed: skill === null ? null : { label: skill.name, amount: skill.bonus },
    lines: STAT_DESCRIPTION_LINES,
  };

  return await svelteDialog<string, ChosenAttribute, typeof props>({
    component: CheckPrompt,
    props,
    title: text.title,
    initial: rows[0].key,
    width: RAIL_WIDTH,
    rail: true,
    buttons: prompt.advantage
      ? advantageButtons(null, (advantage, stat) => ({ stat: stat as StatKey, advantage }))
      : [nextButton((stat: string) => ({ stat: stat as StatKey, advantage: 'none' as Advantage }))],
  });
}

export async function chooseAttribute(options: AttributePrompt): Promise<ChosenAttribute | null> {
  const skill = options.skill ?? null;
  return await pickStat(
    ATTRIBUTES,
    {
      title: localize('Mothership.ChooseAStat'),
      heading: localize('Mothership.AgainstWhichStat'),
      // The window can name what was clicked, which the paragraph it replaces never could.
      intro:
        skill === null
          ? localize('Mothership.AddASkillNext')
          : format('Mothership.SkillAppliesToStat', { skill: skill.name, bonus: skill.bonus }),
    },
    options,
  );
}

/** Which Save to roll. Legacy asked with 40 lines of hand-written HTML inside a macro document. */
export async function chooseSave(): Promise<ChosenAttribute | null> {
  return await pickStat(
    SAVES,
    {
      title: localize('Mothership.ChooseASave'),
      heading: localize('Mothership.SelectASave'),
      intro: localize('Mothership.FailedSaveCostsStress'),
    },
    { advantage: true },
  );
}

/** A skill as the prompt lists it, and as a check reads it back. */
export interface SkillRow {
  readonly id: string;
  readonly name: string;
  readonly img: string;
  readonly bonus: number;
  readonly description: string;
  /** The word the book gives the bonus — `Trained`, `Expert`, `Master` — or null for a rank it does not name. */
  readonly rank: string | null;
}

export interface ChosenSkill {
  readonly skill: SkillRow | null;
  readonly advantage: Advantage;
}

export interface SkillPrompt {
  readonly title: string;
  readonly skills: readonly SkillRow[];
  readonly note: string;
  readonly preselect: Advantage | null;
  readonly advantage: boolean;
  /** The skill the dialog opens with checked — a default, never a decision (§34). */
  readonly defaultSkill: SkillRow | null;
  /** The Stat this check is rolled against, and the number it contributes to the total. */
  readonly stat: { readonly label: string; readonly amount: number };
}

/** The row that adds nothing. An empty key, because no skill can hold one. */
const NO_SKILL = '';

/** Every skill description the book ships fits two lines here; the longest is 114 characters. */
const SKILL_DESCRIPTION_LINES = 2;

export async function chooseSkill(options: SkillPrompt): Promise<ChosenSkill | null> {
  const skills = await Promise.all(
    options.skills.map(async (skill) => ({ ...skill, description: await enrich(skill.description) })),
  );
  const chosen = (key: string): SkillRow | null =>
    options.skills.find((skill) => skill.id === key) ?? null;

  const props = {
    heading: localize('Mothership.AddASkill'),
    intro: localize('Mothership.ARelevantSkillRaises'),
    options: [
      {
        key: NO_SKILL,
        label: localize('Mothership.NoSkill'),
        amount: 0,
        description: localize('Mothership.NoSkillExplanation'),
        muted: true,
      },
      ...skills.map((skill) => ({
        key: skill.id,
        label: skill.name,
        note: skill.rank === null ? '' : localize(`Mothership.SkillRank${skill.rank}`),
        value: `+${skill.bonus}`,
        amount: skill.bonus,
        description: skill.description,
      })),
    ],
    picks: 'skill',
    fixed: options.stat,
    lines: SKILL_DESCRIPTION_LINES,
    note: options.note,
  };

  return await svelteDialog<string, ChosenSkill, typeof props>({
    component: CheckPrompt,
    props,
    title: options.title,
    initial: options.defaultSkill?.id ?? NO_SKILL,
    width: RAIL_WIDTH,
    rail: true,
    buttons: options.advantage
      ? advantageButtons(options.preselect, (advantage, key) => ({ skill: chosen(key), advantage }))
      : [nextButton((key: string) => ({ skill: chosen(key), advantage: 'none' as Advantage }))],
  });
}

export interface AdvantagePrompt {
  /** The name of what is being rolled — a stat's roll label, or the table's own name (audit F2). */
  readonly title: string;
  readonly note: string;
  readonly preselect: Advantage | null;
  /** The dice about to be rolled, when they are worth naming: a table's own die. */
  readonly die?: string;
}

export async function chooseAdvantage(options: AdvantagePrompt): Promise<Advantage | null> {
  return await svelteDialog<null, Advantage, { note: string; die: string }>({
    component: ChooseAdvantage,
    props: { note: options.note, die: options.die ?? '' },
    title: options.title,
    initial: null,
    width: DIALOG_WIDTH,
    buttons: advantageButtons(options.preselect, (advantage) => advantage),
  });
}

/** Whether to reload. Legacy's version resolved nothing at all and reloaded from its own callback. */
export async function askReload(): Promise<boolean> {
  const answer = await svelteDialog<null, boolean, { message: string }>({
    component: ReloadPrompt,
    props: { message: localize('Mothership.OutOfAmmoNeedReload') },
    title: localize('Mothership.WeaponIssue'),
    initial: null,
    buttons: [
      { action: 'reload', label: localize('Mothership.Reload'), icon: 'fas fa-check', answer: () => true },
      { action: 'cancel', label: localize('Mothership.Cancel'), icon: 'fas fa-times', answer: () => false },
    ],
  });
  return answer === true;
}

export async function outOfAmmo(): Promise<void> {
  await svelteDialog<null, null, { message: string }>({
    component: ReloadPrompt,
    props: { message: localize('Mothership.OutOfAmmo') },
    title: localize('Mothership.WeaponIssue'),
    initial: null,
    buttons: [{ action: 'ok', label: localize('Mothership.OK'), icon: 'fas fa-check', answer: () => null }],
  });
}

const COVER_LABELS: Readonly<Record<Cover, { readonly label: string; readonly examples: string }>> = {
  none: { label: 'Mothership.NoCover', examples: 'Mothership.UnprotectedOutInTheOpen' },
  insignificant: { label: 'Mothership.InsignificantCover', examples: 'Mothership.WoodFurnitureDoorsShields' },
  light: { label: 'Mothership.LightCover', examples: 'Mothership.TreesBulkheadWallMetalFurniture' },
  heavy: { label: 'Mothership.HeavyCover', examples: 'Mothership.AirlockDoorsCementBeamsShips' },
};

export interface CoverPromptArmor {
  readonly armorPoints: number;
  readonly damageReduction: number;
}

export async function chooseCover(current: Cover, armor: CoverPromptArmor): Promise<Cover | null> {
  const options = COVER_KEYS.map((key) => ({
    key,
    label: localize(COVER_LABELS[key].label),
    examples: localize(COVER_LABELS[key].examples),
  }));
  const props = { options, ...armor };

  return await svelteDialog<Cover, Cover, typeof props>({
    component: CoverPrompt,
    props,
    title: localize('Mothership.Cover'),
    initial: current,
    width: DIALOG_WIDTH,
    buttons: [
      { action: 'ok', label: localize('Mothership.OK'), icon: 'fas fa-check', answer: (cover: Cover) => cover },
    ],
  });
}

/** Which way the Stress prompt runs. One procedure, one argument — never two functions. */
export type StressDirection = 'gain' | 'relieve';

interface StressPromptText {
  readonly title: string;
  readonly image: string;
  readonly body: string;
  readonly label: string;
  readonly icons: readonly [one: string, two: string, dice: string];
  readonly sign: 1 | -1;
}

const STRESS_PROMPTS: Readonly<Record<StressDirection, StressPromptText>> = {
  gain: {
    title: 'Mothership.GainStress',
    image: 'images/icons/ui/macros/gain_stress.png',
    body: 'Mothership.WhatGainingStressIs',
    label: 'Mothership.GainNStress',
    icons: ['fas fa-angle-up', 'fas fa-angle-double-up', 'fas fa-arrow-circle-up'],
    sign: 1,
  },
  relieve: {
    title: 'Mothership.RelieveStress',
    image: 'images/icons/ui/macros/relieve_stress.png',
    body: 'Mothership.WhatRelievingStressIs',
    label: 'Mothership.RelieveNStress',
    icons: ['fas fa-angle-down', 'fas fa-angle-double-down', 'fas fa-arrow-circle-down'],
    sign: -1,
  },
};

/** PSG 20 — Stress moves one at a time, two at a time, or on the die the fiction names. */
const STRESS_STEPS = ['1', '2', '1d5'] as const;

/**
 * How much Stress, and whether it is rolled for. The answer is an `Amount` because that is what
 * `modify` takes: the prompt states the change, and the mutation engine remains the one place a
 * change is applied.
 */
export async function chooseStress(direction: StressDirection): Promise<Amount | null> {
  const text = STRESS_PROMPTS[direction];
  const heading = localize(text.title);
  const props = {
    image: asset(text.image),
    heading,
    body: localize(text.body),
    prompt: `${localize('Mothership.SelectYourModification')}:`,
  };

  return await svelteDialog<null, Amount, typeof props>({
    component: AmountPromptBody,
    props,
    title: heading,
    initial: null,
    width: DIALOG_WIDTH,
    buttons: STRESS_STEPS.map((step, index) => ({
      action: step,
      label: format(text.label, { amount: step }),
      icon: text.icons[index],
      answer: (): Amount =>
        step === '1d5'
          ? { kind: 'roll', dice: text.sign < 0 ? `-${step}` : step }
          : { kind: 'amount', amount: Number(step) * text.sign },
    })),
  });
}

export interface ChosenWound {
  readonly key: TableKey;
  readonly advantage: Advantage;
}

/** The shipped icon filenames keep the `&` the table keys spell as a dash. */
const WOUND_ICONS: Readonly<Record<string, string>> = {
  bleeding: 'wounds_bleeding.png',
  'blunt-force': 'wounds_blunt_force.png',
  'fire-explosives': 'wounds_fire_&_explosives.png',
  'gore-massive': 'wounds_gore_&_massive.png',
  gunshot: 'wounds_gunshot.png',
};

/** The table the prompt opens on, the way the legacy Wound Roll dialog opened on it. */
const DEFAULT_WOUND: TableKey = 'blunt-force';

/**
 * Which Wound table, and how to roll it. Legacy's version hard-coded the five table ids into a
 * macro's command string, where no reference check could see them (audit C2) — these are the keys
 * `tables/` resolves, so a GM's re-pointed table is honoured here too.
 */
export async function chooseWound(): Promise<ChosenWound | null> {
  const tables = WOUND_TABLE_KEYS.map((key) => ({
    key,
    label: localize(`Mothership.Table.${key}`),
    img: asset(`images/icons/ui/rolltables/${WOUND_ICONS[key]}`),
  }));
  const props = {
    image: asset('images/icons/ui/macros/wound_roll.png'),
    heading: localize('Mothership.WoundRoll'),
    body: localize('Mothership.WhatAWoundRollIs'),
    tables,
  };

  return await svelteDialog<TableKey, ChosenWound, typeof props>({
    component: WoundTable,
    props,
    title: localize('Mothership.WoundRoll'),
    initial: DEFAULT_WOUND,
    width: DIALOG_WIDTH,
    buttons: advantageButtons(null, (advantage, key) => ({ key, advantage })),
  });
}

/** Nothing to run the macro on. The window says which setting decides that, and who can change it. */
export async function noCharacter(target: string): Promise<void> {
  await svelteDialog<null, null, { target: string }>({
    component: NoCharacter,
    props: { target },
    title: localize('Mothership.Errors.NoCharacterTitle'),
    initial: null,
    buttons: [{ action: 'ok', label: localize('Mothership.OK'), icon: 'fas fa-check', answer: () => null }],
  });
}
