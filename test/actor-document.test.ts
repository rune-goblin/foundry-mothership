import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CheckActor } from '../module/checks/actor.ts';
import type { MothershipActor as ActorClass } from '../module/documents/actor.ts';
import type { GrantDocument } from '../module/mutation/items.ts';
import {
  clearFoundryStubs,
  installChat,
  installI18n,
  installNotifications,
  installRoll,
  type ChatLog,
  type Notifications,
} from './foundry-stubs.ts';

/**
 * What the document does itself. The roll methods are one line each and are pinned by the
 * dispatch they build (`test/actor-rolls.test.ts`); here is everything with a consequence — the
 * mutation, the grant, the card, and the three legacy-named methods world macros call directly.
 */

const prompts = vi.hoisted(() => ({
  chooseAdvantage: vi.fn(),
  chooseAttribute: vi.fn(),
  chooseSkill: vi.fn(),
  askReload: vi.fn(),
  outOfAmmo: vi.fn(),
  chooseCover: vi.fn(),
  noCharacter: vi.fn(),
}));

vi.mock('../module/dialogs/prompts.ts', () => prompts);

const { MothershipActor } = await import('../module/documents/actor.ts');

/** The services take the document by its structural surface; the class has to satisfy it. */
type Assert<T extends true> = T;
export type ActorIsCheckActor = Assert<ActorClass extends CheckActor ? true : false>;

interface FakeItem {
  id: string | null;
  name: string;
  img: string;
  type: string;
  system: Record<string, unknown>;
  updates: Record<string, unknown>[];
  update(data: Record<string, unknown>): Promise<unknown>;
  toChat(): object;
}

function item(overrides: Partial<FakeItem> & { id: string; type: string }): FakeItem {
  const fake: FakeItem = {
    name: 'Thing',
    img: 'thing.png',
    system: {},
    updates: [],
    ...overrides,
    update: async (data) => {
      fake.updates.push(data);
      return data;
    },
    toChat: () => ({
      itemId: fake.id,
      name: fake.name,
      img: fake.img,
      type: fake.type,
      description: String(fake.system.description ?? ''),
      roll: null,
    }),
  };
  return fake;
}

interface Fake {
  readonly actor: InstanceType<typeof MothershipActor>;
  readonly updates: Record<string, unknown>[];
  readonly created: object[][];
}

function actorOf(items: FakeItem[] = [], overrides: Record<string, unknown> = {}): Fake {
  const updates: Record<string, unknown>[] = [];
  const created: object[][] = [];
  const system = {
    health: { value: 9, min: 0, max: 10, label: 'Health' },
    hits: { value: 0, min: 0, max: 2, label: 'Wounds' },
    other: { stress: { value: 4, min: 2, max: 20, label: 'Stress' } },
    class: { value: '' },
    stats: {
      armor: { value: 0, mod: 7, damageReduction: 2, cover: 'light', label: 'Armor' },
      body: { value: 30, mod: 0, min: 0, max: 99, label: 'Body', rollLabel: 'Body Save' },
    },
    ...overrides,
  };

  const collection = {
    [Symbol.iterator]: () => items[Symbol.iterator](),
    get: (id: string) => items.find((entry) => entry.id === id),
  };

  const actor = Object.assign(new MothershipActor(), {
    id: 'actor1',
    name: 'Sarah',
    img: 'sarah.png',
    type: 'character',
    system,
    items: collection,
    token: null,
    toObject: () => ({ system: JSON.parse(JSON.stringify(system)) as typeof system }),
    update: async (data: Record<string, unknown>) => {
      updates.push(data);
      for (const [path, value] of Object.entries(data)) {
        const segments = path.split('.').slice(1);
        const leaf = segments.pop() as string;
        const pod = segments.reduce<Record<string, unknown>>(
          (node, key) => node[key] as Record<string, unknown>,
          system as unknown as Record<string, unknown>,
        );
        pod[leaf] = value;
      }
      return data;
    },
    createEmbeddedDocuments: async (_type: string, data: readonly object[]) => {
      created.push([...data]);
      return data;
    },
  });

  return { actor, updates, created };
}

let chat: ChatLog;
let notifications: Notifications;

beforeEach(() => {
  for (const prompt of Object.values(prompts)) prompt.mockReset();
  installI18n({
    'Mosh.Chat.FieldChanged': '{field} {direction} from {from} to {to}.',
    'Mosh.Chat.Increased': 'increased',
    'Mosh.Chat.Decreased': 'decreased',
    'Mosh.Severity': 'Severity',
    'Mosh.Quantity': 'Quantity',
    'Mosh.YouLearnThisSkill': 'You learn this skill',
    'Mosh.YouAddThisToYourInventory': 'You add this to your inventory.',
    'Mosh.YouAddAnotherOfThisToYourInventory': 'You add another one of these to your inventory.',
    'Mosh.item.condition.add.human': 'A new affliction.',
    'Mosh.item.condition.increase.human': 'It worsens.',
    'Mosh.attribute.health.decrease.human': 'You wince from the pain.',
  });
  chat = installChat();
  notifications = installNotifications();
});

afterEach(clearFoundryStubs);

const cardData = (index = 0) => chat.cards[index].data as Record<string, unknown>;

describe('modify', () => {
  it('writes the change and posts one card', async () => {
    const { actor, updates } = actorOf();

    const result = await actor.modify('system.other.stress.value', { kind: 'amount', amount: 2 });

    expect(result.field.to).toBe(6);
    expect(updates).toEqual([{ 'system.other.stress.value': 6 }]);
    expect(chat.cards).toHaveLength(1);
    expect(chat.cards[0].template).toContain('modifyActor');
  });

  it('rolls the amount when the caller states dice, and shows the dice on the card', async () => {
    installRoll([{ faces: 10, result: 4 }]);
    const { actor, updates } = actorOf();

    const result = await actor.modify('system.health.value', { kind: 'roll', dice: '-1d10' });

    expect(result.amount).toBe(4);
    expect(updates).toEqual([{ 'system.health.value': 10 }]);
    expect(cardData().modRollString).toBe('-1d10');
    expect(cardData().parsedRollResult).not.toBeNull();
  });

  it('stays silent when the caller asks for no message', async () => {
    const { actor, updates } = actorOf();

    await actor.modify('system.other.stress.value', { kind: 'amount', amount: 1 }, { message: false });

    expect(updates).toHaveLength(1);
    expect(chat.cards).toEqual([]);
  });
});

describe('applyItem', () => {
  const source = (type: string, name = 'Bleeding'): GrantDocument => ({
    name,
    img: 'condition.png',
    type,
    system: { severity: 1 },
    toObject: () => ({ name, img: 'condition.png', type, system: { severity: 1 } }),
  });

  it('raises the severity of a condition the actor already carries', async () => {
    const held = item({ id: 'c1', type: 'condition', name: 'Bleeding', system: { severity: 2 } });
    const { actor, created } = actorOf([held]);

    const result = await actor.applyItem(source('condition'), 3);

    expect(result.change).toEqual({ created: false, counted: 'severity', from: 2, to: 5 });
    expect(held.updates).toEqual([{ 'system.severity': 5 }]);
    expect(created).toEqual([]);
    expect(cardData().flavorText).toBe('It worsens. Severity increased from <strong>2</strong> to <strong>5</strong>.');
  });

  it('creates the condition with its severity already set, in one write', async () => {
    const { actor, created } = actorOf();

    const result = await actor.applyItem(source('condition'), 2);

    expect(result.change).toEqual({ created: true, counted: 'severity', from: 0, to: 2 });
    expect(created).toEqual([[{ name: 'Bleeding', img: 'condition.png', type: 'condition', system: { severity: 2 } }]]);
  });

  it('raises the quantity of gear the actor already carries', async () => {
    const held = item({ id: 'g1', type: 'item', name: 'Ration', system: { quantity: 4 } });
    const { actor } = actorOf([held]);

    const result = await actor.applyItem(source('item', 'Ration'), 2);

    expect(result.change).toEqual({ created: false, counted: 'quantity', from: 4, to: 6 });
    expect(held.updates).toEqual([{ 'system.quantity': 6 }]);
    expect(cardData().flavorText).toBe('Quantity increased from <strong>4</strong> to <strong>6</strong>.');
  });

  it('adds another copy of a weapon rather than counting it', async () => {
    const held = item({ id: 'w1', type: 'weapon', name: 'Revolver' });
    const { actor, created } = actorOf([held]);

    const result = await actor.applyItem(source('weapon', 'Revolver'), 1);

    expect(result.change).toEqual({ created: false, counted: null, from: 0, to: 0 });
    expect(held.updates).toEqual([]);
    expect(created).toHaveLength(1);
    expect(cardData().flavorText).toBe('You add another one of these to your inventory.');
  });

  it('says a skill is learned, not carried', async () => {
    const { actor } = actorOf();

    await actor.applyItem(source('skill', 'Rimwise'), 1);

    expect(cardData().flavorText).toBe('You learn this skill');
  });
});

describe('printDescription', () => {
  it('posts the item’s own card', async () => {
    const gear = item({ id: 'g1', type: 'item', name: 'Rebreather', system: { description: '<p>Air.</p>' } });
    const { actor } = actorOf([gear]);

    await actor.printDescription('g1');

    expect(chat.cards[0].template).toContain('itemRoll');
    expect((cardData().item as Record<string, unknown>).name).toBe('Rebreather');
  });

  // Legacy cloned the item through duplicate(), which drops the `id` accessor, then asked for
  // `item.id` — so every gear hotbar macro threw instead of posting (audit RC3).
  it('reports a missing item instead of throwing', async () => {
    const { actor } = actorOf();

    await expect(actor.printDescription('nope')).resolves.toBeNull();
    expect(notifications.errors).toHaveLength(1);
    expect(chat.cards).toEqual([]);
  });
});

describe('chooseCover', () => {
  it('offers the armour the actor is wearing and stores the answer', async () => {
    prompts.chooseCover.mockResolvedValue('heavy');
    const { actor, updates } = actorOf();

    await expect(actor.chooseCover()).resolves.toBe('heavy');
    expect(prompts.chooseCover).toHaveBeenCalledWith('light', { armorPoints: 7, damageReduction: 2 });
    expect(updates).toEqual([{ 'system.stats.armor.cover': 'heavy' }]);
  });

  it('writes nothing when the window is dismissed', async () => {
    prompts.chooseCover.mockResolvedValue(null);
    const { actor, updates } = actorOf();

    await expect(actor.chooseCover()).resolves.toBeNull();
    expect(updates).toEqual([]);
  });
});

describe('takeBleedingDamage', () => {
  it('costs the total severity of every Bleeding condition, in one write', async () => {
    const items = [
      item({ id: 'c1', type: 'condition', name: 'Bleeding', system: { severity: 2 } }),
      item({ id: 'c2', type: 'condition', name: 'Bleeding', system: { severity: 1 } }),
      item({ id: 'c3', type: 'condition', name: 'Frightened', system: { severity: 5 } }),
    ];
    const { actor, updates } = actorOf(items);

    await actor.takeBleedingDamage();

    expect(updates).toEqual([{ 'system.health.value': 6 }]);
  });

  // The card's image used to be hand-written HTML pointing at systems/foundry-mothership/… , a
  // path that stopped existing at the rename (audit F4).
  it('posts a card whose art is under the system’s real id', async () => {
    const { actor } = actorOf([item({ id: 'c1', type: 'condition', name: 'Bleeding', system: { severity: 1 } })]);

    await actor.takeBleedingDamage();

    expect(cardData().msgImgPath).toBe('systems/mothershiprpg/images/icons/ui/attributes/health.png');
  });
});

describe('modifyActor — the legacy signature', () => {
  it('takes a flat value where one is given', async () => {
    const { actor, updates } = actorOf();

    await actor.modifyActor('system.other.stress.value', -1, null, true);

    expect(updates).toEqual([{ 'system.other.stress.value': 3 }]);
    expect(chat.cards).toHaveLength(1);
  });

  it('rolls the string when the value is null, as every shipped macro passes it', async () => {
    // The stub totals the results it is handed; Foundry's own arithmetic is what makes -1d10
    // negative, which is the number `mutate` is given either way.
    const rolls = installRoll([{ faces: 10, result: -3 }]);
    const { actor, updates } = actorOf();

    await actor.modifyActor('system.health.value', null, '-1d10', true);

    expect(rolls.formulas).toEqual(['-1d10']);
    expect(updates).toEqual([{ 'system.health.value': 6 }]);
  });

  it('keeps its four positional arguments', () => {
    expect(MothershipActor.prototype.modifyActor).toHaveLength(4);
  });
});
