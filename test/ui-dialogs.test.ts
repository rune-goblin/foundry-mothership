// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { promptAddItem, promptNewSkill } from '../module/ui/actor/items.js';
import { promptStatOption } from '../module/ui/class/stat-option.js';
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

const select = (selector: string, value: string): void => {
  const node = only().element.querySelector<HTMLSelectElement>(selector)!;
  node.value = value;
  node.dispatchEvent(new Event('change', { bubbles: true }));
};

const type = (selector: string, value: string): void => {
  const node = only().element.querySelector<HTMLInputElement>(selector)!;
  node.value = value;
  node.dispatchEvent(new Event('input', { bubbles: true }));
};

const check = (selector: string): void => {
  only().element.querySelector<HTMLElement>(selector)!.click();
};

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

  // The bonus comes from rules.ts, not a second copy of the table that could disagree with it.
  it('creates the skill with the bonus its rank is worth', async () => {
    const { actor, created } = actorOf();
    const done = promptNewSkill(actor);

    type('#name', 'Zero-G');
    select('#rank', 'Expert');
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
    [...only().element.querySelectorAll<HTMLElement>('[data-choice]')].map(
      (node) => node.dataset.choice!,
    );

  it('orders skills weakest rank first, alphabetically inside a rank', async () => {
    installPacks({ 'mothershiprpg.skills_1e': skillDocs });
    const done = promptAddItem(actorOf().actor, 'skill');
    await settle();

    expect(radios()).toEqual(['sk-a', 'sk-b', 'sk-x']);

    only().dismiss();
    await done;
  });

  it('bars a skill whose prerequisite the actor lacks, until the toggle lifts enforcement', async () => {
    installPacks({ 'mothershiprpg.skills_1e': skillDocs });
    const { actor, created } = actorOf();
    const done = promptAddItem(actor, 'skill');
    await settle();

    const radio = (id: string) =>
      only().element.querySelector<HTMLInputElement>(`[data-choice="${id}"] .choice-input`)!;
    expect(radio('sk-x').disabled).toBe(true);
    expect(radio('sk-b').disabled).toBe(false);

    check('#pick-enforce');
    await settle();
    expect(radio('sk-x').disabled).toBe(false);

    check('[data-choice="sk-x"]');
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
        only().element.querySelector<HTMLInputElement>('[data-choice="sk-x"] .choice-input')!.disabled,
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

    check('#pick-enforce');
    await settle();
    check('[data-choice="sk-x"]');
    check('#pick-enforce');
    await settle();

    await only().press('add');
    await expect(done).resolves.toBeNull();
    expect(created).toEqual([]);
  });

  it('narrows the table as the filter is typed, case-insensitively', async () => {
    installPacks({ 'mothershiprpg.weapons_1e': weaponDocs });
    const done = promptAddItem(actorOf().actor, 'weapon');
    await settle();

    type('#choice-filter', 'laser');
    await settle();
    expect(radios()).toEqual(['wp-l']);

    type('#choice-filter', '');
    await settle();
    expect(radios()).toEqual(['wp-l', 'wp-r']);

    only().dismiss();
    await done;
  });

  it('adds a copy of the picked document on Add', async () => {
    installPacks({ 'mothershiprpg.weapons_1e': weaponDocs });
    const { actor, created } = actorOf();
    const done = promptAddItem(actor, 'weapon');
    await settle();

    check('[data-choice="wp-r"]');
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

    expect(radios()).toEqual(['cn-a', 'cn-b']);
    expect(only().buttons.map((button) => button.action)).toEqual(['add', 'cancel']);

    check('[data-choice="cn-b"]');
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

    type('#modification', '-10');
    check('#speed');
    check('#strength');
    await only().press('create');

    await expect(answer).resolves.toEqual({ modification: -10, stats: ['strength', 'speed'] });
  });

  // The class schema stores the modification as a number; an input's value is a string.
  it('answers with a number, and with zero for a blank', async () => {
    const answer = promptStatOption();

    check('#strength');
    check('#fear');
    await only().press('create');

    await expect(answer).resolves.toEqual({ modification: 0, stats: ['strength', 'fear'] });
  });

  it('refuses an entry naming fewer than two stats, and says why', async () => {
    const answer = promptStatOption();

    check('#strength');
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
