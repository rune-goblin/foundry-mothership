// @vitest-environment jsdom
//
// The last three modules that built dialog markup by concatenating HTML strings (audit U10):
// the generator's three pickers, the actor sheet's new-skill prompt, and the class sheet's
// stat-option prompt. They are Svelte components in `DialogV2.wait` now, so what each one answers
// is testable outside Foundry — none of it was before.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { promptAddItem, promptNewSkill } from '../module/ui/actor/items.js';
import { promptStatOption } from '../module/ui/class/stat-option.js';
import { pickBonusOption, pickSkills, pickStat } from '../module/ui/generator/dialogs.js';
import {
  clearFoundryStubs,
  installDialogV2,
  installI18n,
  installNotifications,
  installPacks,
  type Notifications,
  type OpenDialog,
} from './foundry-stubs.ts';

let opened: OpenDialog[] = [];
let notifications: Notifications;

beforeEach(() => {
  installI18n({
    'Mothership.Speed': 'Speed',
    'Mothership.Strength': 'Strength',
    'Mothership.SkillRankTrained': 'Trained',
    'Mothership.SkillRankExpert': 'Expert',
    'Mothership.classNewStatOptionEmptyError': 'You must select at least two stat or saves',
    'Mothership.NewSkill': 'New Skill',
  });
  notifications = installNotifications();
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

const select = (id: string, value: string): void => {
  const node = only().element.querySelector<HTMLSelectElement>(`#${id}`)!;
  node.value = value;
  node.dispatchEvent(new Event('change', { bubbles: true }));
};

const type = (id: string, value: string): void => {
  const node = only().element.querySelector<HTMLInputElement>(`#${id}`)!;
  node.value = value;
  node.dispatchEvent(new Event('input', { bubbles: true }));
};

const check = (id: string): void => {
  only().element.querySelector<HTMLInputElement>(`#${id}`)!.click();
};

const CATALOG = [
  { uuid: 'sk-linguistics', name: 'Linguistics', rank: 'Trained', prerequisites: [] },
  { uuid: 'sk-mathematics', name: 'Mathematics', rank: 'Trained', prerequisites: [] },
  { uuid: 'sk-xenobiology', name: 'Xenobiology', rank: 'Expert', prerequisites: ['sk-linguistics'] },
];

describe('pickSkills', () => {
  it('offers one dropdown per rank the pick draws from, broadest first', async () => {
    const answer = pickSkills('expert_full_set', CATALOG, []);

    expect([...only().element.querySelectorAll('select')].map((node) => node.id)).toEqual([
      'skill-Expert',
      'skill-Trained',
    ]);
    expect(
      [...only().element.querySelectorAll('#skill-Trained option')].map((node) => node.textContent),
    ).toEqual(['---', 'Linguistics', 'Mathematics']);

    only().dismiss();
    await answer;
  });

  it('answers with the chosen uuids, in the order the dropdowns are stacked', async () => {
    const answer = pickSkills('expert_full_set', CATALOG, []);

    select('skill-Trained', 'sk-mathematics');
    select('skill-Expert', 'sk-xenobiology');
    await only().press('save');

    await expect(answer).resolves.toEqual(['sk-xenobiology', 'sk-mathematics']);
  });

  it('answers with nothing when every dropdown is left on ---', async () => {
    const answer = pickSkills('trained', CATALOG, []);

    await only().press('save');

    await expect(answer).resolves.toEqual([]);
  });

  // Legacy's version never resolved at all on a closed dialog, so the generator's await parked.
  it('answers with nothing when the dialog is dismissed', async () => {
    const answer = pickSkills('trained', CATALOG, []);

    only().dismiss();

    await expect(answer).resolves.toEqual([]);
  });

  it('lists an owned skill disabled rather than dropping it', async () => {
    const answer = pickSkills('trained', CATALOG, ['sk-linguistics']);

    const options = [...only().element.querySelectorAll<HTMLOptionElement>('#skill-Trained option')];
    expect(options.filter((option) => option.disabled).map((option) => option.value)).toEqual([
      'sk-linguistics',
    ]);

    only().dismiss();
    await answer;
  });
});

describe('pickBonusOption', () => {
  const packages = [
    { name: 'Marine A', master: 0, expert: 0, trained: 2, fromListNames: [] },
    { name: 'Marine B', master: 0, expert: 1, trained: 0, fromListNames: ['Rimwise'] },
  ];

  it('shows what each package contains and answers with the one pressed', async () => {
    const answer = pickBonusOption(packages);

    expect([...only().element.querySelectorAll('li')].map((node) => node.textContent)).toEqual([
      'Trained: 2',
      'Expert: 1',
      'Rimwise',
    ]);
    expect(only().buttons.map((button) => button.action)).toEqual(['option-0', 'option-1']);

    await only().press('option-1');

    await expect(answer).resolves.toBe(packages[1]);
  });

  it('answers null when the dialog is dismissed', async () => {
    const answer = pickBonusOption(packages);

    only().dismiss();

    await expect(answer).resolves.toBeNull();
  });
});

describe('pickStat', () => {
  it('names each stat the adjustment may be spent on, in the player’s language', async () => {
    const answer = pickStat({ modification: -10, stats: ['strength', 'speed'] });

    expect(only().element.textContent).toContain('(-10)');
    expect(only().buttons.map((button) => [button.action, button.label])).toEqual([
      ['strength', 'Strength'],
      ['speed', 'Speed'],
    ]);

    await only().press('speed');

    await expect(answer).resolves.toBe('speed');
  });

  it('answers null when the dialog is dismissed', async () => {
    const answer = pickStat({ modification: 5, stats: ['strength', 'speed'] });

    only().dismiss();

    await expect(answer).resolves.toBeNull();
  });
});

describe('promptNewSkill', () => {
  interface Created {
    readonly created: object[][];
    readonly actor: { createEmbeddedDocuments(type: string, data: object[]): Promise<unknown> };
  }

  const actorOf = (): Created => {
    const created: object[][] = [];
    return {
      created,
      actor: {
        createEmbeddedDocuments: async (_type: string, data: object[]) => {
          created.push(data);
          return data;
        },
      },
    };
  };

  // The bonus is `rules.ts`'s: `ui/actor/items.js` used to carry a second copy of the table
  // (audit U5), which is exactly how the two could have disagreed.
  it('creates the skill with the bonus its rank is worth', async () => {
    const { actor, created } = actorOf();
    const done = promptNewSkill(actor);

    type('name', 'Zero-G');
    select('rank', 'Expert');
    await only().press('create');
    await done;

    expect(created).toEqual([
      [{ name: 'Zero-G', type: 'skill', system: { rank: 'Expert', bonus: 15 } }],
    ]);
  });

  it('creates a Trained skill when the rank is left alone', async () => {
    const { actor, created } = actorOf();
    const done = promptNewSkill(actor);

    await only().press('create');
    await done;

    expect(created).toEqual([
      [{ name: 'New Skill', type: 'skill', system: { rank: 'Trained', bonus: 10 } }],
    ]);
  });

  it('creates nothing on cancel, and nothing on a dismissal', async () => {
    const { actor, created } = actorOf();

    const cancelled = promptNewSkill(actor);
    await only().press('cancel');
    await expect(cancelled).resolves.toBeNull();

    opened.length = 0;
    const dismissed = promptNewSkill(actor);
    only().dismiss();
    await expect(dismissed).resolves.toBeNull();
    expect(created).toEqual([]);
  });
});

describe('promptAddItem', () => {
  interface Created {
    readonly created: object[][];
    readonly actor: {
      items: object[];
      createEmbeddedDocuments(type: string, data: object[]): Promise<unknown>;
    };
  }

  const actorOf = (items: object[] = []): Created => {
    const created: object[][] = [];
    return {
      created,
      actor: {
        items,
        createEmbeddedDocuments: async (_type: string, data: object[]) => {
          created.push(data);
          return data;
        },
      },
    };
  };

  const packDoc = (id: string, name: string, type: string, system: object) => ({
    id,
    name,
    img: `icons/${id}.png`,
    uuid: `Compendium.mothershiprpg.test.Item.${id}`,
    system,
    toObject: () => ({ name, type, img: `icons/${id}.png`, system }),
  });

  // Deliberately out of order: Expert first, Trained names reversed. The Expert skill lists two
  // prerequisites because that is how the PSG tree reads — converging arrows are alternatives.
  const skillDocs = [
    packDoc('sk-x', 'Xenobotany', 'skill', {
      rank: 'Expert',
      bonus: 15,
      prerequisite_ids: [
        'Compendium.mothershiprpg.test.Item.sk-b',
        'Compendium.mothershiprpg.test.Item.sk-a',
      ],
    }),
    packDoc('sk-b', 'Botany', 'skill', { rank: 'Trained', bonus: 10 }),
    packDoc('sk-a', 'Archaeology', 'skill', { rank: 'Trained', bonus: 10 }),
  ];

  const weaponDocs = [
    packDoc('wp-r', 'Revolver', 'weapon', { damage: '1d10', range: 'close' }),
    packDoc('wp-l', 'Laser Cutter', 'weapon', { damage: '1d100', range: 'long' }),
  ];

  // The dialog opens only after the pack answers, one microtask later than a sync opener.
  const settle = () => new Promise((resolve) => setTimeout(resolve));

  const radios = (): string[] =>
    [...only().element.querySelectorAll<HTMLInputElement>('input[type=radio]')].map(
      (node) => node.id,
    );

  it('orders skills weakest rank first, alphabetically inside a rank', async () => {
    installPacks({ 'mothershiprpg.skills_1e': skillDocs });
    const done = promptAddItem(actorOf().actor, 'skill');
    await settle();

    expect(radios()).toEqual(['pick-sk-a', 'pick-sk-b', 'pick-sk-x']);

    only().dismiss();
    await done;
  });

  it('bars a skill whose prerequisite the actor lacks, until the toggle lifts enforcement', async () => {
    installPacks({ 'mothershiprpg.skills_1e': skillDocs });
    const { actor, created } = actorOf();
    const done = promptAddItem(actor, 'skill');
    await settle();

    const radio = (id: string) =>
      only().element.querySelector<HTMLInputElement>(`#pick-${id}`)!;
    expect(radio('sk-x').disabled).toBe(true);
    expect(radio('sk-b').disabled).toBe(false);

    check('pick-enforce');
    await settle();
    expect(radio('sk-x').disabled).toBe(false);

    check('pick-sk-x');
    await only().press('add');
    await done;

    expect(created).toEqual([[skillDocs[0].toObject()]]);
  });

  // PSG 22 — 13 of the tree's skills list several prerequisites, and every one is any-of:
  // owning a single skill on the list unlocks it. The book has no all-of case.
  it.each(['Botany', 'Archaeology'])(
    'offers a skill with enforcement on when the actor owns any one prerequisite (%s)',
    async (owned) => {
      installPacks({ 'mothershiprpg.skills_1e': skillDocs });
      const { actor } = actorOf([{ type: 'skill', name: owned }]);
      const done = promptAddItem(actor, 'skill');
      await settle();

      expect(
        only().element.querySelector<HTMLInputElement>('#pick-sk-x')!.disabled,
      ).toBe(false);

      only().dismiss();
      await done;
    },
  );

  it('drops a barred pick when enforcement is turned back on', async () => {
    installPacks({ 'mothershiprpg.skills_1e': skillDocs });
    const { actor, created } = actorOf();
    const done = promptAddItem(actor, 'skill');
    await settle();

    check('pick-enforce');
    await settle();
    check('pick-sk-x');
    check('pick-enforce');
    await settle();

    await only().press('add');
    await expect(done).resolves.toBeNull();
    expect(created).toEqual([]);
  });

  it('narrows the table as the filter is typed, case-insensitively', async () => {
    installPacks({ 'mothershiprpg.weapons_1e': weaponDocs });
    const done = promptAddItem(actorOf().actor, 'weapon');
    await settle();

    type('pick-filter', 'laser');
    await settle();
    expect(radios()).toEqual(['pick-wp-l']);

    type('pick-filter', '');
    await settle();
    expect(radios()).toEqual(['pick-wp-l', 'pick-wp-r']);

    only().dismiss();
    await done;
  });

  it('adds a copy of the picked document on Add', async () => {
    installPacks({ 'mothershiprpg.weapons_1e': weaponDocs });
    const { actor, created } = actorOf();
    const done = promptAddItem(actor, 'weapon');
    await settle();

    check('pick-wp-r');
    await only().press('add');
    await done;

    expect(created).toEqual([
      [
        {
          name: 'Revolver',
          type: 'weapon',
          img: 'icons/wp-r.png',
          system: { damage: '1d10', range: 'close' },
        },
      ],
    ]);
  });

  it('adds nothing on Add with no pick, on cancel, and on a dismissal', async () => {
    installPacks({ 'mothershiprpg.skills_1e': skillDocs });
    const { actor, created } = actorOf();

    const unpicked = promptAddItem(actor, 'skill');
    await settle();
    await only().press('add');
    await expect(unpicked).resolves.toBeNull();

    opened.length = 0;
    const cancelled = promptAddItem(actor, 'skill');
    await settle();
    await only().press('cancel');
    await expect(cancelled).resolves.toBeNull();

    opened.length = 0;
    const dismissed = promptAddItem(actor, 'skill');
    await settle();
    only().dismiss();
    await expect(dismissed).resolves.toBeNull();

    expect(created).toEqual([]);
  });

  it('lists a name-only table for conditions, and offers no Custom button', async () => {
    installPacks({
      'mothershiprpg.conditions_1e': [
        packDoc('cn-b', 'Bleeding', 'condition', {}),
        packDoc('cn-a', 'Anxious', 'condition', {}),
      ],
    });
    const { actor, created } = actorOf();
    const done = promptAddItem(actor, 'condition');
    await settle();

    expect(radios()).toEqual(['pick-cn-a', 'pick-cn-b']);
    expect(only().buttons.map((button) => button.action)).toEqual(['add', 'cancel']);

    check('pick-cn-b');
    await only().press('add');
    await done;

    expect(created).toEqual([[packDoc('cn-b', 'Bleeding', 'condition', {}).toObject()]]);
  });

  it('falls straight back to the blank flow when the pack is missing', async () => {
    installPacks({});
    const { actor } = actorOf();
    const pending = promptAddItem(actor, 'skill');
    await settle();

    expect(only().element.querySelector('#name')).not.toBeNull();
    only().dismiss();
    await expect(pending).resolves.toBeNull();
  });
});

describe('promptStatOption', () => {
  // Ticked in the other order, because the entry lists them the way the class sheet does.
  it('answers with the value and the stats it may be spent on', async () => {
    const answer = promptStatOption();

    type('modification', '-10');
    check('speed');
    check('strength');
    await only().press('create');

    await expect(answer).resolves.toEqual({ modification: -10, stats: ['strength', 'speed'] });
  });

  // The class schema stores the modification as a number; an input's value is a string.
  it('answers with a number, and with zero for a blank', async () => {
    const answer = promptStatOption();

    check('strength');
    check('fear');
    await only().press('create');

    await expect(answer).resolves.toEqual({ modification: 0, stats: ['strength', 'fear'] });
  });

  it('refuses an entry naming fewer than two stats, and says why', async () => {
    const answer = promptStatOption();

    check('strength');
    await only().press('create');

    await expect(answer).resolves.toBeNull();
    expect(notifications.errors).toEqual(['You must select at least two stat or saves']);
  });

  it('answers null on cancel and on a dismissal', async () => {
    const cancelled = promptStatOption();
    await only().press('cancel');
    await expect(cancelled).resolves.toBeNull();

    opened.length = 0;
    const dismissed = promptStatOption();
    only().dismiss();
    await expect(dismissed).resolves.toBeNull();
    expect(notifications.errors).toEqual([]);
  });
});
