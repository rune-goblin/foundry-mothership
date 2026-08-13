/**
 * The prompts the system asks, each a typed function returning what the user answered — or `null`
 * when they closed the window. Nothing here decides anything: `checks/` asks only for what it is
 * missing, and every one of these resolves exactly once (audit F6).
 */

import { asset } from '../chat/cards.ts';
import { enrich } from '../enrich.ts';
import { localize } from '../i18n.ts';
import type { Advantage, StatKey } from '../rolls/spec.ts';
import { COVER_KEYS, type Cover } from '../rules.ts';
import ChooseAdvantage from './ChooseAdvantage.svelte';
import ChooseAttribute from './ChooseAttribute.svelte';
import ChooseSkill from './ChooseSkill.svelte';
import CoverPrompt from './Cover.svelte';
import NoCharacter from './NoCharacter.svelte';
import ReloadPrompt from './Reload.svelte';
import { svelteDialog, type DialogButton } from './svelte-dialog.ts';

const DIALOG_WIDTH = 600;

const ICONS: Readonly<Record<Advantage, string>> = {
  advantage: 'fas fa-angle-double-up',
  none: 'fas fa-minus',
  disadvantage: 'fas fa-angle-double-down',
};

const LABELS: Readonly<Record<Advantage, string>> = {
  advantage: 'Mosh.Advantage',
  none: 'Mosh.Normal',
  disadvantage: 'Mosh.Disadvantage',
};

const ORDER: readonly Advantage[] = ['advantage', 'none', 'disadvantage'];

/** The class `css/mosh.css` paints the preselected button with. */
const PRESELECT = 'condition-preselect';

/**
 * The three roll-type buttons. A condition that names this roll preselects the button it argues
 * for, which DialogV2 autofocuses — a default, never a decision (§34).
 */
function advantageButtons<V, T>(
  preselect: Advantage | null,
  answer: (advantage: Advantage, value: V) => T,
): DialogButton<V, T>[] {
  return ORDER.map((advantage) => ({
    action: advantage,
    label: localize(LABELS[advantage]),
    icon: ICONS[advantage],
    ...(preselect === advantage ? { default: true, class: PRESELECT } : {}),
    answer: (value: V) => answer(advantage, value),
  }));
}

function nextButton<V, T>(answer: (value: V) => T): DialogButton<V, T> {
  return {
    action: 'next',
    label: localize('Mosh.Next'),
    icon: 'fas fa-chevron-circle-right',
    answer,
  };
}

/** The four stats a Skill Check can be rolled against, as the dialog lists them. */
const ATTRIBUTES: readonly { readonly key: StatKey; readonly label: string; readonly example: string }[] = [
  { key: 'strength', label: 'Mosh.Strength', example: 'Mosh.StrengthSkillExample' },
  { key: 'speed', label: 'Mosh.Speed', example: 'Mosh.SpeedSkillExample' },
  { key: 'intellect', label: 'Mosh.Intellect', example: 'Mosh.IntellectSkillExample' },
  { key: 'combat', label: 'Mosh.Combat', example: 'Mosh.CombatSkillExample' },
];

export interface ChosenAttribute {
  readonly stat: StatKey;
  readonly advantage: Advantage;
}

export interface AttributePrompt {
  /** Whether the roll type is still open; when it is not, one Next button closes the window. */
  readonly advantage: boolean;
}

export async function chooseAttribute(options: AttributePrompt): Promise<ChosenAttribute | null> {
  const stats = ATTRIBUTES.map((entry) => ({
    key: entry.key,
    label: localize(entry.label),
    example: localize(entry.example),
    img: asset(`images/icons/ui/attributes/${entry.key}.png`),
  }));

  return await svelteDialog<StatKey, ChosenAttribute, { stats: typeof stats }>({
    component: ChooseAttribute,
    props: { stats },
    title: localize('Mosh.ChooseAStat'),
    initial: ATTRIBUTES[0].key,
    width: DIALOG_WIDTH,
    buttons: options.advantage
      ? advantageButtons(null, (advantage, stat) => ({ stat, advantage }))
      : [nextButton((stat: StatKey) => ({ stat, advantage: 'none' as Advantage }))],
  });
}

/** A skill as the prompt lists it, and as a check reads it back. */
export interface SkillRow {
  readonly id: string;
  readonly name: string;
  readonly img: string;
  readonly bonus: number;
  readonly description: string;
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
}

export async function chooseSkill(options: SkillPrompt): Promise<ChosenSkill | null> {
  const skills = await Promise.all(
    options.skills.map(async (skill) => ({ ...skill, description: await enrich(skill.description) })),
  );
  const props = { skills, note: options.note, prompt: options.advantage };

  return await svelteDialog<SkillRow | null, ChosenSkill, typeof props>({
    component: ChooseSkill,
    props,
    title: options.title,
    initial: null,
    width: DIALOG_WIDTH,
    buttons: options.advantage
      ? advantageButtons(options.preselect, (advantage, skill) => ({ skill, advantage }))
      : [nextButton((skill: SkillRow | null) => ({ skill, advantage: 'none' as Advantage }))],
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
    props: { message: localize('Mosh.OutOfAmmoNeedReload') },
    title: localize('Mosh.WeaponIssue'),
    initial: null,
    buttons: [
      { action: 'reload', label: localize('Mosh.Reload'), icon: 'fas fa-check', answer: () => true },
      { action: 'cancel', label: localize('Mosh.Cancel'), icon: 'fas fa-times', answer: () => false },
    ],
  });
  return answer === true;
}

export async function outOfAmmo(): Promise<void> {
  await svelteDialog<null, null, { message: string }>({
    component: ReloadPrompt,
    props: { message: localize('Mosh.OutOfAmmo') },
    title: localize('Mosh.WeaponIssue'),
    initial: null,
    buttons: [{ action: 'ok', label: localize('Mosh.OK'), icon: 'fas fa-check', answer: () => null }],
  });
}

const COVER_LABELS: Readonly<Record<Cover, { readonly label: string; readonly examples: string }>> = {
  none: { label: 'Mosh.NoCover', examples: 'Mosh.UnprotectedOutInTheOpen' },
  insignificant: { label: 'Mosh.InsignificantCover', examples: 'Mosh.WoodFurnitureDoorsShields' },
  light: { label: 'Mosh.LightCover', examples: 'Mosh.TreesBulkheadWallMetalFurniture' },
  heavy: { label: 'Mosh.HeavyCover', examples: 'Mosh.AirlockDoorsCementBeamsShips' },
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
    title: localize('Mosh.Cover'),
    initial: current,
    width: DIALOG_WIDTH,
    buttons: [
      { action: 'ok', label: localize('Mosh.OK'), icon: 'fas fa-check', answer: (cover: Cover) => cover },
    ],
  });
}

/** Nothing to run the macro on. The window says which setting decides that, and who can change it. */
export async function noCharacter(target: string): Promise<void> {
  await svelteDialog<null, null, { target: string }>({
    component: NoCharacter,
    props: { target },
    title: localize('Mosh.Errors.NoCharacterTitle'),
    initial: null,
    buttons: [{ action: 'ok', label: localize('Mosh.OK'), icon: 'fas fa-check', answer: () => null }],
  });
}
