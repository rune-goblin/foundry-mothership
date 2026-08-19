// @vitest-environment jsdom
//
// Audit F6: five of legacy's dialogs wrapped DialogV2 in `new Promise(resolve => …)` and never
// called `resolve` from any button, so every `await` on them parked for good. The proof that they
// are gone is a test, not a review note: each prompt below is awaited, on a button and on a
// dismissal, and every one of them comes back.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';

import ChooseAdvantage from '../module/dialogs/ChooseAdvantage.svelte';
import CheckPrompt from '../module/dialogs/CheckPrompt.svelte';
import Cover from '../module/dialogs/Cover.svelte';
import NoCharacter from '../module/dialogs/NoCharacter.svelte';
import Reload from '../module/dialogs/Reload.svelte';
import {
  askReload,
  chooseAdvantage,
  chooseAttribute,
  chooseCover,
  chooseSave,
  chooseSkill,
  chooseStress,
  chooseWound,
  noCharacter,
  outOfAmmo,
} from '../module/dialogs/prompts.ts';
import { svelteDialog } from '../module/dialogs/svelte-dialog.ts';
import {
  clearFoundryStubs,
  installChat,
  installDialogV2,
  installI18n,
  type OpenDialog,
} from './foundry-stubs.ts';

let opened: OpenDialog[] = [];

beforeEach(() => {
  installI18n({
    'Mothership.Advantage': 'Advantage',
    'Mothership.Normal': 'Normal',
    'Mothership.Disadvantage': 'Disadvantage',
    'Mothership.Next': 'Next',
    'Mothership.OK': 'OK',
    'Mothership.Cancel': 'Cancel',
    'Mothership.Reload': 'Reload',
    'Mothership.Cover': 'Cover',
    'Mothership.ChooseAStat': 'Choose a Stat',
    'Mothership.ChooseASave': 'Choose a Save',
    'Mothership.GainStress': 'Gain Stress',
    'Mothership.RelieveStress': 'Relieve Stress',
    'Mothership.WoundRoll': 'Wound Roll',
    'Mothership.SelectYourRollType': 'Select your roll type',
    'Mothership.SelectASave': 'Select a Save',
    'Mothership.Strength': 'Strength',
    'Mothership.Speed': 'Speed',
    'Mothership.Intellect': 'Intellect',
    'Mothership.Combat': 'Combat',
    'Mothership.AddASkill': 'Add a Skill?',
    'Mothership.AgainstWhichStat': 'Against which Stat?',
    'Mothership.ARelevantSkillRaises': 'A relevant Skill raises the number you roll under.',
    'Mothership.AddASkillNext': 'You can add a Skill on the next screen.',
    'Mothership.FailedSaveCostsStress': 'Fail a Save and you gain 1 Stress.',
    'Mothership.SkillAppliesToStat': '<strong>{skill} +{bonus}</strong> applies to whichever Stat suits the task.',
    'Mothership.RollUnder': 'Roll under:',
    'Mothership.CheckWorking': '{stat} {statValue} + {skill} {skillValue}',
    'Mothership.CheckWorkingNoSkill': '{stat} {statValue}, no Skill',
    'Mothership.NoSkill': 'No Skill',
    'Mothership.NoSkillExplanation': 'Rolling on the raw Stat.',
    'Mothership.SkillRankTrained': 'Trained',
    'Mothership.SkillRankExpert': 'Expert',
    'Mothership.SkillRankMaster': 'Master',
    'Mothership.OutOfAmmoNeedReload': 'Out of ammo, you need to reload',
    'Mothership.OutOfAmmo': 'Out of ammo',
    'Mothership.Errors.NoCharacterTitle': 'No Character Selected',
    'Mothership.Errors.NoCharacterSelected': 'Assign a character.',
    'Mothership.Errors.NoTokenSelected': 'Select a token.',
  });
  installChat();
  opened = installDialogV2();
});

afterEach(() => {
  document.body.replaceChildren();
  clearFoundryStubs();
});

const only = (): OpenDialog => {
  expect(opened).toHaveLength(1);
  return opened[0];
};

/** A prompt that enriches its rows first opens a turn later, so let the microtasks drain. */
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe('svelteDialog', () => {
  const props = { note: '', die: '' };

  it('mounts the component once, however often the dialog renders', async () => {
    const answer = svelteDialog<null, string, typeof props>({
      component: ChooseAdvantage,
      props,
      title: 'Body Save',
      initial: null,
      buttons: [{ action: 'ok', label: 'OK', answer: () => 'ok' }],
    });

    expect(only().element.querySelectorAll('.macro_prompt')).toHaveLength(1);
    await only().press('ok');
    await answer;
  });

  it('resolves with the answer the button gives', async () => {
    const answer = svelteDialog<null, string, typeof props>({
      component: ChooseAdvantage,
      props,
      title: 'Body Save',
      initial: null,
      buttons: [
        { action: 'yes', label: 'Yes', answer: () => 'yes' },
        { action: 'no', label: 'No', answer: () => 'no' },
      ],
    });

    await only().press('no');
    await expect(answer).resolves.toBe('no');
  });

  it('resolves null when the dialog is dismissed', async () => {
    const answer = svelteDialog<null, string, typeof props>({
      component: ChooseAdvantage,
      props,
      title: 'Body Save',
      initial: null,
      buttons: [{ action: 'ok', label: 'OK', answer: () => 'ok' }],
    });

    only().dismiss();
    await expect(answer).resolves.toBeNull();
  });

  // A button may answer with nothing meaningful; that is still an answer, not a dismissal.
  it('keeps an answer of null distinct from a dismissal', async () => {
    const dismissed = vi.fn();
    const answer = svelteDialog<null, null, typeof props>({
      component: ChooseAdvantage,
      props,
      title: 'Body Save',
      initial: null,
      buttons: [{ action: 'ok', label: 'OK', answer: () => null }],
    });

    await only().press('ok');
    await expect(answer).resolves.toBeNull();
    expect(dismissed).not.toHaveBeenCalled();
  });

  it('unmounts the component on the way out, either way', async () => {
    const answer = svelteDialog<null, string, typeof props>({
      component: ChooseAdvantage,
      props,
      title: 'Body Save',
      initial: null,
      buttons: [{ action: 'ok', label: 'OK', answer: () => 'ok' }],
    });
    const { element } = only();

    await only().press('ok');
    await answer;
    expect(element.querySelector('.macro_prompt')).toBeNull();

    const second = svelteDialog<null, string, typeof props>({
      component: ChooseAdvantage,
      props,
      title: 'Body Save',
      initial: null,
      buttons: [{ action: 'ok', label: 'OK', answer: () => 'ok' }],
    });
    const dismissedElement = opened[1].element;
    opened[1].dismiss();
    await second;
    expect(dismissedElement.querySelector('.macro_prompt')).toBeNull();
  });

  // ApplicationV2 may re-render a dialog into a fresh content node. Mounting once and never
  // again would leave the component on the detached one and the window empty.
  it('re-mounts when a render replaces the node it is mounted in', async () => {
    const answer = svelteDialog<null, string, typeof props>({
      component: ChooseAdvantage,
      props,
      title: 'Body Save',
      initial: null,
      buttons: [{ action: 'ok', label: 'OK', answer: () => 'ok' }],
    });

    const { element } = only();
    const first = element.querySelector('.mothership-dialog-root')!;
    element.replaceChildren();
    const second = document.createElement('div');
    second.className = 'mothership-dialog-root';
    element.append(second);
    only().render();

    expect(first.querySelector('.macro_prompt')).toBeNull();
    expect(second.querySelector('.macro_prompt')).not.toBeNull();

    await only().press('ok');
    await answer;
    expect(second.querySelector('.macro_prompt')).toBeNull();
  });

  it('carries what the user picked into the answer', async () => {
    const props = {
      heading: 'Against which Stat?',
      options: [
        { key: 'strength', label: 'Strength', amount: 30, description: 'Lifting' },
        { key: 'speed', label: 'Speed', amount: 45, description: 'Running' },
      ],
      picks: 'stat',
    };
    const answer = svelteDialog<string, string, typeof props>({
      component: CheckPrompt,
      props,
      title: 'Choose a Stat',
      initial: 'strength',
      buttons: [{ action: 'next', label: 'Next', answer: (stat) => stat }],
    });

    only().element.querySelector<HTMLButtonElement>('[data-choice="speed"]')!.click();
    flushSync();
    await only().press('next');

    await expect(answer).resolves.toBe('speed');
  });

  // The rail is the dialog's own footer stood on end, so the only thing that switches it on is a
  // class on the frame. Without it the same buttons lie along the foot, as every other dialog's do.
  it('asks for the rail class only when the prompt wants the rail', async () => {
    const props = { note: '', die: '' };
    const plain = svelteDialog<null, string, typeof props>({
      component: ChooseAdvantage,
      props,
      title: 'Body Save',
      initial: null,
      buttons: [{ action: 'ok', label: 'OK', answer: () => 'ok' }],
    });
    expect(only().classes).not.toContain('macro-popup-rail');
    await only().press('ok');
    await plain;

    const railed = svelteDialog<null, string, typeof props>({
      component: ChooseAdvantage,
      props,
      title: 'Body Save',
      initial: null,
      rail: true,
      buttons: [{ action: 'ok', label: 'OK', answer: () => 'ok' }],
    });
    expect(opened[1].classes).toContain('macro-popup-rail');
    opened[1].dismiss();
    await railed;
  });
});

describe('the prompts', () => {
  it('chooseAdvantage answers with the button pressed, and preselects nothing by default', async () => {
    const answer = chooseAdvantage({ title: 'Body Save', note: '', preselect: null });

    expect(only().title).toBe('Body Save');
    // Normal leads and is the default, so Enter on an untouched window rolls the plain roll.
    expect(only().buttons.map((button) => button.action)).toEqual(['none', 'advantage', 'disadvantage']);
    expect(only().buttons.filter((button) => button.default === true).map((button) => button.action)).toEqual([
      'none',
    ]);
    expect(only().buttons.some((button) => button.class === 'condition-preselect')).toBe(false);

    await only().press('disadvantage');
    await expect(answer).resolves.toBe('disadvantage');
  });

  // §34 — the condition names the roll, and the dialog opens on the button it argues for.
  it('chooseAdvantage opens on the button a condition preselects, and says why', async () => {
    const answer = chooseAdvantage({
      title: 'Rest Save',
      note: 'Nightmares: this roll is at [-].',
      preselect: 'disadvantage',
    });

    // The condition takes the default off Normal rather than adding a second one.
    const preselected = only().buttons.filter((button) => button.default === true);
    expect(preselected).toHaveLength(1);
    expect(preselected[0]).toMatchObject({ action: 'disadvantage', class: 'condition-preselect' });
    expect(only().element.querySelector('.condition-modifier')?.textContent).toContain('Nightmares');

    only().dismiss();
    await expect(answer).resolves.toBeNull();
  });

  const ATHLETICS = {
    id: 'sk1',
    name: 'Athletics',
    img: 'sk1.png',
    bonus: 10,
    description: '<p>Running.</p>',
    rank: 'Trained',
  };
  const SPEED = { label: 'Speed', amount: 45 };

  it('chooseSkill answers with the skill and the modifier together', async () => {
    const answer = chooseSkill({
      title: 'Body Save',
      skills: [ATHLETICS],
      note: '',
      preselect: null,
      advantage: true,
      defaultSkill: null,
      stat: SPEED,
    });
    await settle();

    only().element.querySelector<HTMLButtonElement>('[data-choice="sk1"]')!.click();
    flushSync();
    await only().press('advantage');

    await expect(answer).resolves.toEqual({ skill: ATHLETICS, advantage: 'advantage' });
  });

  // The window is about a number, so it states it: the Stat it opened on, and what the chosen
  // Skill does to it. `d100Check` totals the same two.
  it('chooseSkill totals the roll it is about to make', async () => {
    const answer = chooseSkill({
      title: 'Body Save',
      skills: [ATHLETICS],
      note: '',
      preselect: null,
      advantage: true,
      defaultSkill: null,
      stat: SPEED,
    });
    await settle();

    const { element } = only();
    expect(element.querySelector('.check-readout-total')?.textContent).toBe('45');
    expect(element.querySelector('.check-sum-working')?.textContent).toBe('Speed 45, no Skill');

    element.querySelector<HTMLButtonElement>('[data-choice="sk1"]')!.click();
    flushSync();
    expect(element.querySelector('.check-readout-total')?.textContent).toBe('55');
    expect(element.querySelector('.check-sum-working')?.textContent).toBe('Speed 45 + Athletics 10');

    only().dismiss();
    await expect(answer).resolves.toBeNull();
  });

  it('chooseSkill opens on the skill it was given, and answers with no skill for the empty row', async () => {
    const answer = chooseSkill({
      title: 'Body Save',
      skills: [ATHLETICS],
      note: '',
      preselect: null,
      advantage: true,
      defaultSkill: ATHLETICS,
      stat: SPEED,
    });
    await settle();

    expect(only().element.querySelector('[data-choice="sk1"]')?.getAttribute('aria-checked')).toBe('true');

    only().element.querySelector<HTMLButtonElement>('[data-choice=""]')!.click();
    flushSync();
    await only().press('none');

    await expect(answer).resolves.toEqual({ skill: null, advantage: 'none' });
  });

  it('chooseSkill offers only Next when the modifier is already settled', async () => {
    const answer = chooseSkill({
      title: 'Body Save',
      skills: [],
      note: '',
      preselect: null,
      advantage: false,
      defaultSkill: null,
      stat: SPEED,
    });
    await settle();

    expect(only().buttons.map((button) => button.action)).toEqual(['next']);
    await only().press('next');
    await expect(answer).resolves.toEqual({ skill: null, advantage: 'none' });
  });

  it('chooseAttribute answers with the stat and the modifier', async () => {
    const answer = chooseAttribute({ advantage: true });

    only().element.querySelector<HTMLButtonElement>('[data-choice="combat"]')!.click();
    flushSync();
    await only().press('advantage');

    await expect(answer).resolves.toEqual({ stat: 'combat', advantage: 'advantage' });
  });

  // The inverse window: the Skill is known, so it names it and adds it to whichever Stat is chosen.
  it('chooseAttribute names the skill that opened it and totals against each stat', async () => {
    const answer = chooseAttribute({
      advantage: true,
      values: { strength: 30, speed: 45, intellect: 35, combat: 40 },
      skill: ATHLETICS,
    });

    const { element } = only();
    expect(element.querySelector('.check-intro')?.textContent).toContain('Athletics +10');
    expect(element.querySelector('.check-readout-total')?.textContent).toBe('40');
    expect(element.querySelector('.check-sum-working')?.textContent).toBe('Strength 30 + Athletics 10');

    element.querySelector<HTMLButtonElement>('[data-choice="speed"]')!.click();
    flushSync();
    expect(element.querySelector('.check-readout-total')?.textContent).toBe('55');

    only().dismiss();
    await expect(answer).resolves.toBeNull();
  });

  it('chooseSave offers the three Saves, not the four Stats', async () => {
    const answer = chooseSave();

    expect(only().title).toBe('Choose a Save');
    expect([...only().element.querySelectorAll('[data-choice]')].map((node) => node.getAttribute('data-choice'))).toEqual(
      ['sanity', 'fear', 'body'],
    );

    only().element.querySelector<HTMLButtonElement>('[data-choice="body"]')!.click();
    flushSync();
    await only().press('disadvantage');

    await expect(answer).resolves.toEqual({ stat: 'body', advantage: 'disadvantage' });
  });

  // A Save is asked before its actor is settled, so no Stat has a number yet. Saying nothing beats
  // saying zero.
  it('chooseSave states no total, having no actor to total against', async () => {
    const answer = chooseSave();

    expect(only().element.querySelector('.check-readout')).toBeNull();
    expect(only().element.querySelector('.check-sum')).toBeNull();

    only().dismiss();
    await expect(answer).resolves.toBeNull();
  });

  // The two directions are one procedure: the sign is the argument, never a second function.
  it.each([
    ['gain', 'Gain Stress', { kind: 'amount', amount: 2 }, { kind: 'roll', dice: '1d5' }],
    ['relieve', 'Relieve Stress', { kind: 'amount', amount: -2 }, { kind: 'roll', dice: '-1d5' }],
  ] as const)('chooseStress answers %s with a flat amount or dice', async (direction, title, flat, dice) => {
    const flatAnswer = chooseStress(direction);
    expect(only().title).toBe(title);
    expect(only().buttons.map((button) => button.action)).toEqual(['1', '2', '1d5']);
    await only().press('2');
    await expect(flatAnswer).resolves.toEqual(flat);

    opened.length = 0;
    const rolled = chooseStress(direction);
    await only().press('1d5');
    await expect(rolled).resolves.toEqual(dice);

    opened.length = 0;
    const dismissed = chooseStress(direction);
    only().dismiss();
    await expect(dismissed).resolves.toBeNull();
  });

  it('chooseWound answers with the table key and the modifier, and carries no document id', async () => {
    const answer = chooseWound();

    expect([...only().element.querySelectorAll('input[name="wound_table"]')].map((node) => node.id)).toEqual([
      'wound-bleeding',
      'wound-blunt-force',
      'wound-fire-explosives',
      'wound-gore-massive',
      'wound-gunshot',
    ]);
    // Two of the five shipped filenames keep an `&` the table key spells as a dash.
    for (const img of only().element.querySelectorAll('img')) {
      expect(img.getAttribute('src')).not.toContain('undefined');
    }

    // Legacy's Wound Roll dialog opened on Blunt Force; nothing about the key order says so.
    expect(only().element.querySelector<HTMLInputElement>('#wound-blunt-force')!.checked).toBe(true);

    only().element.querySelector<HTMLInputElement>('#wound-gunshot')!.click();
    flushSync();
    await only().press('advantage');

    await expect(answer).resolves.toEqual({ key: 'gunshot', advantage: 'advantage' });
  });

  it('askReload answers true, false, and false again when dismissed', async () => {
    const reload = askReload();
    await only().press('reload');
    await expect(reload).resolves.toBe(true);

    opened.length = 0;
    const cancel = askReload();
    await only().press('cancel');
    await expect(cancel).resolves.toBe(false);

    opened.length = 0;
    const dismissed = askReload();
    only().dismiss();
    await expect(dismissed).resolves.toBe(false);
  });

  it('outOfAmmo comes back from its one button, and from a dismissal', async () => {
    const acknowledged = outOfAmmo();
    expect(only().element.textContent).toContain('Out of ammo');
    await only().press('ok');
    await expect(acknowledged).resolves.toBeUndefined();

    opened.length = 0;
    const dismissed = outOfAmmo();
    only().dismiss();
    await expect(dismissed).resolves.toBeUndefined();
  });

  it('chooseCover answers with the cover picked, and null when dismissed', async () => {
    const answer = chooseCover('light', { armorPoints: 4, damageReduction: 1 });

    expect(only().element.querySelector<HTMLInputElement>('#cover-light')!.checked).toBe(true);
    only().element.querySelector<HTMLInputElement>('#cover-heavy')!.click();
    flushSync();
    await only().press('ok');
    await expect(answer).resolves.toBe('heavy');

    opened.length = 0;
    const dismissed = chooseCover('none', { armorPoints: 0, damageReduction: 0 });
    only().dismiss();
    await expect(dismissed).resolves.toBeNull();
  });

  it('noCharacter says which target the setting names, and resolves either way', async () => {
    const acknowledged = noCharacter('token');
    expect(only().element.textContent).toContain('Select a token.');
    await only().press('ok');
    await expect(acknowledged).resolves.toBeUndefined();

    opened.length = 0;
    const dismissed = noCharacter('character');
    expect(only().element.textContent).toContain('Assign a character.');
    only().dismiss();
    await expect(dismissed).resolves.toBeUndefined();
  });
});

describe('the components themselves', () => {
  const mounted: Record<string, unknown>[] = [];

  afterEach(() => {
    while (mounted.length > 0) unmount(mounted.pop()!);
  });

  const render = (component: never, props: Record<string, unknown>): HTMLElement => {
    const target = document.createElement('div');
    document.body.append(target);
    mounted.push(mount(component, { target, props }) as Record<string, unknown>);
    flushSync();
    return target;
  };

  const rows = [
    { key: '', label: 'No Skill', amount: 0, description: 'Rolling on the raw Stat.', muted: true },
    {
      key: 'sk1',
      label: 'Hacking',
      note: 'Expert',
      value: '+15',
      amount: 15,
      description: '<em>Computers.</em>',
    },
  ];

  it('CheckPrompt lists the rows as data, description enriched and escaped by the compiler', () => {
    const changes: unknown[] = [];
    const target = render(CheckPrompt as never, {
      heading: 'Add a Skill?',
      options: rows,
      value: '',
      onchange: (key: unknown) => changes.push(key),
      picks: 'skill',
      fixed: { label: 'Speed', amount: 45 },
      note: 'Anxious: this roll is at [-].',
    });

    const row = target.querySelector<HTMLButtonElement>('[data-choice="sk1"]')!;
    expect(row.querySelector('.choice-value')?.textContent).toBe('+15');
    expect(row.querySelector('.choice-note')?.textContent).toBe('Expert');
    expect(row.querySelector('em')?.textContent).toBe('Computers.');
    expect(target.querySelector('.condition-modifier')?.textContent).toContain('Anxious');

    row.click();
    flushSync();
    expect(changes).toEqual(['sk1']);
  });

  // Only the chosen row prints its description, so the name is written once and the sum beneath has
  // nothing to do but add up.
  it('CheckPrompt gives its description to the chosen row alone', () => {
    const target = render(CheckPrompt as never, {
      heading: 'Add a Skill?',
      options: rows,
      value: 'sk1',
      onchange: () => {},
      picks: 'skill',
      fixed: { label: 'Speed', amount: 45 },
    });

    const checked = [...target.querySelectorAll('[data-choice]')].filter(
      (row) => row.getAttribute('aria-checked') === 'true',
    );
    expect(checked.map((row) => row.getAttribute('data-choice'))).toEqual(['sk1']);
    expect(target.querySelector('.check-sum-working')?.textContent).toBe('Speed 45 + Hacking 15');
    expect(target.querySelector('.check-readout-total')?.textContent).toBe('60');
  });

  // The slot is a fixed number of lines whether the chosen row needs them or not, so the rows below
  // never move as the selection travels.
  it('CheckPrompt reserves the description slot the caller asked for', () => {
    const target = render(CheckPrompt as never, {
      heading: 'Against which Stat?',
      options: rows,
      value: '',
      onchange: () => {},
      picks: 'stat',
      lines: 3,
    });

    expect(target.querySelector<HTMLElement>('.choice-list')!.style.getPropertyValue(
      '--choice-list-description-lines',
    )).toBe('3');
  });

  it('Cover shows each option’s bonus beside the actor’s own armour', () => {
    const target = render(Cover as never, {
      options: [
        { key: 'none', label: 'No Cover', examples: 'Out in the open' },
        { key: 'heavy', label: 'Heavy Cover', examples: 'Airlock doors' },
      ],
      armorPoints: 4,
      damageReduction: 1,
      value: 'none',
      onchange: () => {},
    });

    expect([...target.querySelectorAll('.whiteText')].map((node) => node.textContent)).toEqual([
      '4',
      '1',
      '4',
      '1',
    ]);
    expect([...target.querySelectorAll('.highlightText')].map((node) => node.textContent)).toEqual([
      ' 20',
      ' 5',
    ]);
  });

  it('Reload is the message it was given', () => {
    const target = render(Reload as never, { message: 'Out of ammo' });
    expect(target.querySelector('.macro_prompt')?.textContent).toBe('Out of ammo');
  });

  it('NoCharacter falls back to the character explanation for an unknown target', () => {
    const target = render(NoCharacter as never, { target: 'nonsense' });
    expect(target.querySelector('.macro_prompt')?.textContent).toContain('Assign a character.');
  });

  it('ChooseAdvantage names the die when it was given one', () => {
    const target = render(ChooseAdvantage as never, { note: '', die: '1d10' });
    expect(target.querySelector('.macro_prompt')?.textContent).toContain('1d10');
  });
});
