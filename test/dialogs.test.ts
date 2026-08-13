// @vitest-environment jsdom
//
// Audit F6: five of legacy's dialogs wrapped DialogV2 in `new Promise(resolve => …)` and never
// called `resolve` from any button, so every `await` on them parked for good. The proof that they
// are gone is a test, not a review note: each prompt below is awaited, on a button and on a
// dismissal, and every one of them comes back.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';

import ChooseAdvantage from '../module/dialogs/ChooseAdvantage.svelte';
import ChooseAttribute from '../module/dialogs/ChooseAttribute.svelte';
import ChooseSkill from '../module/dialogs/ChooseSkill.svelte';
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
import { clearFoundryStubs, installChat, installI18n } from './foundry-stubs.ts';

type Globals = Record<string, unknown>;

interface DialogButton {
  action: string;
  label: string;
  icon?: string;
  class?: string;
  default?: boolean;
  callback: () => unknown;
}

interface OpenDialog {
  readonly title: string;
  readonly buttons: DialogButton[];
  readonly element: HTMLElement;
  press(action: string): Promise<void>;
  dismiss(): void;
}

let opened: OpenDialog[] = [];

/**
 * DialogV2's own semantics, as `wait` implements them: a button's callback result is the answer,
 * a dismissal answers whatever `close` returned — `null` when it returned nothing.
 */
function installDialogV2(): void {
  const globals = globalThis as Globals;
  const foundry = (globals.foundry ?? {}) as Record<string, Record<string, unknown>>;
  foundry.applications = {
    ...(foundry.applications ?? {}),
    api: {
      DialogV2: {
        wait: (config: {
          window: { title: string };
          content: string;
          buttons: DialogButton[];
          render?: (event: unknown, dialog: { element: HTMLElement }) => void;
          close?: (event: unknown, dialog: { element: HTMLElement }) => unknown;
        }) =>
          new Promise((resolve) => {
            const element = document.createElement('div');
            element.innerHTML = config.content;
            document.body.append(element);
            const dialog = { element };

            const finish = (result: unknown): void => {
              const closed = config.close?.({}, dialog);
              resolve(result === undefined ? (closed ?? null) : result);
            };

            opened.push({
              title: config.window.title,
              buttons: config.buttons,
              element,
              press: async (action: string) => {
                const button = config.buttons.find((entry) => entry.action === action);
                if (button === undefined) throw new Error(`no button ${action}`);
                finish(await button.callback());
              },
              dismiss: () => finish(undefined),
            });

            config.render?.({}, dialog);
            // ApplicationV2 renders more than once over a dialog's life.
            config.render?.({}, dialog);
          }),
      },
    },
  };
  globals.foundry = foundry;
}

beforeEach(() => {
  opened = [];
  installI18n({
    'Mosh.Advantage': 'Advantage',
    'Mosh.Normal': 'Normal',
    'Mosh.Disadvantage': 'Disadvantage',
    'Mosh.Next': 'Next',
    'Mosh.OK': 'OK',
    'Mosh.Cancel': 'Cancel',
    'Mosh.Reload': 'Reload',
    'Mosh.Cover': 'Cover',
    'Mosh.ChooseAStat': 'Choose a Stat',
    'Mosh.ChooseASave': 'Choose a Save',
    'Mosh.GainStress': 'Gain Stress',
    'Mosh.RelieveStress': 'Relieve Stress',
    'Mosh.WoundRoll': 'Wound Roll',
    'Mosh.SelectYourRollType': 'Select your roll type',
    'Mosh.OutOfAmmoNeedReload': 'Out of ammo, you need to reload',
    'Mosh.OutOfAmmo': 'Out of ammo',
    'Mosh.Errors.NoCharacterTitle': 'No Character Selected',
    'Mosh.Errors.NoCharacterSelected': 'Assign a character.',
    'Mosh.Errors.NoTokenSelected': 'Select a token.',
  });
  installChat();
  installDialogV2();
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

  it('carries what the user picked into the answer', async () => {
    const answer = svelteDialog<string, string, { stats: { key: string; label: string; example: string; img: string }[] }>({
      component: ChooseAttribute,
      props: {
        stats: [
          { key: 'strength', label: 'Strength', example: 'Lifting', img: 'str.png' },
          { key: 'speed', label: 'Speed', example: 'Running', img: 'spd.png' },
        ],
      },
      title: 'Choose a Stat',
      initial: 'strength',
      buttons: [{ action: 'next', label: 'Next', answer: (stat) => stat }],
    });

    const input = only().element.querySelector<HTMLInputElement>('#stat-speed')!;
    input.click();
    flushSync();
    await only().press('next');

    await expect(answer).resolves.toBe('speed');
  });
});

describe('the prompts', () => {
  it('chooseAdvantage answers with the button pressed, and preselects nothing by default', async () => {
    const answer = chooseAdvantage({ title: 'Body Save', note: '', preselect: null });

    expect(only().title).toBe('Body Save');
    expect(only().buttons.map((button) => button.action)).toEqual(['advantage', 'none', 'disadvantage']);
    expect(only().buttons.some((button) => button.default === true)).toBe(false);

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

    const preselected = only().buttons.filter((button) => button.default === true);
    expect(preselected).toHaveLength(1);
    expect(preselected[0]).toMatchObject({ action: 'disadvantage', class: 'condition-preselect' });
    expect(only().element.querySelector('.condition-modifier')?.textContent).toContain('Nightmares');

    only().dismiss();
    await expect(answer).resolves.toBeNull();
  });

  it('chooseSkill answers with the skill and the modifier together', async () => {
    const answer = chooseSkill({
      title: 'Body Save',
      skills: [{ id: 'sk1', name: 'Athletics', img: 'sk1.png', bonus: 10, description: '<p>Running.</p>' }],
      note: '',
      preselect: null,
      advantage: true,
    });
    await settle();

    only().element.querySelector<HTMLInputElement>('#skill-sk1')!.click();
    flushSync();
    await only().press('advantage');

    await expect(answer).resolves.toEqual({
      skill: { id: 'sk1', name: 'Athletics', img: 'sk1.png', bonus: 10, description: 'enriched:<p>Running.</p>' },
      advantage: 'advantage',
    });
  });

  it('chooseSkill offers only Next when the modifier is already settled', async () => {
    const answer = chooseSkill({ title: 'Body Save', skills: [], note: '', preselect: null, advantage: false });
    await settle();

    expect(only().buttons.map((button) => button.action)).toEqual(['next']);
    await only().press('next');
    await expect(answer).resolves.toEqual({ skill: null, advantage: 'none' });
  });

  it('chooseAttribute answers with the stat and the modifier', async () => {
    const answer = chooseAttribute({ advantage: true });

    only().element.querySelector<HTMLInputElement>('#stat-combat')!.click();
    flushSync();
    await only().press('advantage');

    await expect(answer).resolves.toEqual({ stat: 'combat', advantage: 'advantage' });
  });

  it('chooseSave offers the three Saves, not the four Stats', async () => {
    const answer = chooseSave();

    expect(only().title).toBe('Choose a Save');
    expect([...only().element.querySelectorAll('input[name="stat"]')].map((node) => node.id)).toEqual([
      'stat-sanity',
      'stat-fear',
      'stat-body',
    ]);

    only().element.querySelector<HTMLInputElement>('#stat-body')!.click();
    flushSync();
    await only().press('disadvantage');

    await expect(answer).resolves.toEqual({ stat: 'body', advantage: 'disadvantage' });
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

    opened = [];
    const rolled = chooseStress(direction);
    await only().press('1d5');
    await expect(rolled).resolves.toEqual(dice);

    opened = [];
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

    only().element.querySelector<HTMLInputElement>('#wound-gunshot')!.click();
    flushSync();
    await only().press('advantage');

    await expect(answer).resolves.toEqual({ key: 'gunshot', advantage: 'advantage' });
  });

  it('askReload answers true, false, and false again when dismissed', async () => {
    const reload = askReload();
    await only().press('reload');
    await expect(reload).resolves.toBe(true);

    opened = [];
    const cancel = askReload();
    await only().press('cancel');
    await expect(cancel).resolves.toBe(false);

    opened = [];
    const dismissed = askReload();
    only().dismiss();
    await expect(dismissed).resolves.toBe(false);
  });

  it('outOfAmmo comes back from its one button, and from a dismissal', async () => {
    const acknowledged = outOfAmmo();
    expect(only().element.textContent).toContain('Out of ammo');
    await only().press('ok');
    await expect(acknowledged).resolves.toBeUndefined();

    opened = [];
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

    opened = [];
    const dismissed = chooseCover('none', { armorPoints: 0, damageReduction: 0 });
    only().dismiss();
    await expect(dismissed).resolves.toBeNull();
  });

  it('noCharacter says which target the setting names, and resolves either way', async () => {
    const acknowledged = noCharacter('token');
    expect(only().element.textContent).toContain('Select a token.');
    await only().press('ok');
    await expect(acknowledged).resolves.toBeUndefined();

    opened = [];
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

  it('ChooseSkill lists the rows as data, description enriched and escaped by the compiler', () => {
    const changes: unknown[] = [];
    const skills = [
      { id: 'sk1', name: 'Hacking', img: 'sk1.png', bonus: 15, description: '<em>Computers.</em>' },
    ];
    const target = render(ChooseSkill as never, {
      skills,
      note: 'Anxious: this roll is at [-].',
      prompt: true,
      value: null,
      onchange: (skill: unknown) => changes.push(skill),
    });

    expect(target.querySelector('#skill-none')).not.toBeNull();
    const row = target.querySelector<HTMLInputElement>('#skill-sk1')!;
    expect(row.getAttribute('value')).toBe('15');
    expect(row.closest('label')!.querySelector('em')?.textContent).toBe('Computers.');
    expect(target.querySelector('.condition-modifier')?.textContent).toContain('Anxious');

    row.click();
    flushSync();
    expect(changes).toEqual([skills[0]]);
  });

  it('ChooseSkill shows no skill list at all when the actor holds none', () => {
    const target = render(ChooseSkill as never, { skills: [], prompt: false, value: null, onchange: () => {} });

    expect(target.querySelector('#skill-none')).toBeNull();
    expect(target.querySelector('.macro_prompt')).toBeNull();
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
