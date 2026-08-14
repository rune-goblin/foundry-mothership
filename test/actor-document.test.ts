import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CheckActor } from '../module/checks/actor.ts';
import type { MothershipActor as ActorClass } from '../module/documents/actor.ts';
import type { MothershipItem as ItemClass } from '../module/documents/item.ts';
import type { GrantDocument } from '../module/mutation/items.ts';
import { XP_PIPS } from '../module/rules.ts';
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
const { MothershipItem } = await import('../module/documents/item.ts');

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
  reload(): Promise<unknown>;
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
    // The real method, so the magazine arithmetic under test is the shipped one.
    reload: () => MothershipItem.prototype.reload.call(fake as unknown as ItemClass),
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
    // Mimics Foundry's own `createEmbeddedDocuments`: a supplied `_id` is discarded unless the
    // caller passes `{keepId: true}` — the option `grantItem` relies on to keep a Condition's
    // compendium id alive onto the actor.
    createEmbeddedDocuments: async (
      _type: string,
      data: readonly object[],
      options: { keepId?: boolean } = {},
    ) => {
      const written = data.map((entry) => {
        const record = { ...(entry as Record<string, unknown>) };
        if (!options.keepId) delete record._id;
        return record;
      });
      created.push(written);
      return written;
    },
  });

  return { actor, updates, created };
}

let chat: ChatLog;
let notifications: Notifications;

beforeEach(() => {
  for (const prompt of Object.values(prompts)) prompt.mockReset();
  installI18n({
    'Mothership.Chat.FieldChanged': '{field} {direction} from {from} to {to}.',
    'Mothership.Chat.Increased': 'increased',
    'Mothership.Chat.Decreased': 'decreased',
    'Mothership.Severity': 'Severity',
    'Mothership.Quantity': 'Quantity',
    'Mothership.YouLearnThisSkill': 'You learn this skill',
    'Mothership.YouAddThisToYourInventory': 'You add this to your inventory.',
    'Mothership.YouAddAnotherOfThisToYourInventory': 'You add another one of these to your inventory.',
    'Mothership.item.condition.add.human': 'A new affliction.',
    'Mothership.item.condition.increase.human': 'It worsens.',
    'Mothership.attribute.health.decrease.human': 'You wince from the pain.',
  });
  chat = installChat();
  notifications = installNotifications();
});

afterEach(clearFoundryStubs);

const cardData = (index = 0) => chat.cards[index].data as Record<string, unknown>;

// The rules the sheets used to hold themselves (audit U5): a swarm's dice, the swarm toggle's
// rewrite, and the XP track's bounds. None of them were reachable from a test while they lived in
// a component, and the XP clamp was wrong by one the whole time (U14).
describe('the creature rules', () => {
  const swarming = (enabled: boolean, damage = '1d10') =>
    actorOf([item({ id: 'w1', type: 'weapon', name: 'Mandibles', system: { damage } })], {
      hits: { value: 1, min: 0, max: 4, label: 'Wounds' },
      stats: { combat: { value: 30, label: 'Combat' } },
      swarm: { enabled, combat: { value: 10 } },
    });

  describe('swarmDamage', () => {
    it('rolls one weapon’s dice per Wound the swarm has left', () => {
      expect(swarming(true).actor.swarmDamage('w1')).toBe('3d10');
    });

    it('keeps whatever the damage says after the dice', () => {
      expect(swarming(true, '2d10+3').actor.swarmDamage('w1')).toBe('6d10+3');
    });

    it('leaves a weapon whose damage names no dice alone', () => {
      // AppV1 indexed the failed match and threw.
      expect(swarming(true, 'as the scalpel').actor.swarmDamage('w1')).toBeNull();
    });

    it('answers nothing at all for a creature that is not a swarm', () => {
      expect(swarming(false).actor.swarmDamage('w1')).toBeNull();
    });

    it('answers nothing for a weapon this creature does not hold', () => {
      expect(swarming(true).actor.swarmDamage('nope')).toBeNull();
    });
  });

  describe('setSwarm', () => {
    it('stashes the creature’s own Combat and stores the multiplied one', async () => {
      const { actor, updates } = swarming(false);

      await actor.setSwarm(true);

      expect(updates).toEqual([
        {
          'system.swarm.enabled': true,
          'system.stats.combat.value': 90,
          'system.swarm.combat.value': 30,
        },
      ]);
    });

    it('puts the stash back and clears it', async () => {
      const { actor, updates } = swarming(true);

      await actor.setSwarm(false);

      expect(updates).toEqual([
        {
          'system.swarm.enabled': false,
          'system.stats.combat.value': 10,
          'system.swarm.combat.value': 0,
        },
      ]);
    });

    // Derivation multiplies Combat in `system` itself, so stashing what is there would stash the
    // product — the mutation engine reads `toObject()` for the same reason (divergence R1-4).
    it('stashes the stored Combat, not the derived one', async () => {
      const { actor, updates } = swarming(false);
      Object.assign(actor, {
        toObject: () => ({
          system: { hits: { value: 1, max: 4 }, stats: { combat: { value: 7 } }, swarm: {} },
        }),
      });

      await actor.setSwarm(true);

      expect(updates[0]['system.swarm.combat.value']).toBe(7);
      expect(updates[0]['system.stats.combat.value']).toBe(21);
    });
  });

  describe('stepXp', () => {
    const trained = (value: number) => actorOf([], { xp: { value, selectedSkill: '' } });

    it('steps up and down one pip at a time', async () => {
      const { actor, updates } = trained(3);

      await actor.stepXp(1);
      await actor.stepXp(-1);

      expect(updates).toEqual([{ 'system.xp.value': 4 }, { 'system.xp.value': 3 }]);
    });

    // U14: both sheets clamped at 16 over a 15-pip track, so the sixteenth click stored a state
    // nothing could draw and the next right-click appeared to do nothing.
    it('stops at the end of the track the sheets draw', async () => {
      const { actor, updates } = trained(XP_PIPS);

      await actor.stepXp(1);

      expect(updates).toEqual([{ 'system.xp.value': XP_PIPS }]);
    });

    it('never goes below zero', async () => {
      const { actor, updates } = trained(0);

      await actor.stepXp(-1);

      expect(updates).toEqual([{ 'system.xp.value': 0 }]);
    });
  });
});

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

  // The compendium id is what lets a later reader (`checks/actions.ts`'s `severityOf`) match this
  // item by identity rather than by name alone — `grantItem` has to ask `createEmbeddedDocuments`
  // to keep it, or Foundry mints a fresh one and the id half of `isCondition` never matches again.
  it('keeps the compendium id a granted condition arrives with', async () => {
    const withId: GrantDocument = {
      id: 'pxtF1NfletmoFFGV',
      name: 'Bleeding',
      img: 'condition.png',
      type: 'condition',
      system: { severity: 1 },
      toObject: () => ({
        _id: 'pxtF1NfletmoFFGV',
        name: 'Bleeding',
        img: 'condition.png',
        type: 'condition',
        system: { severity: 1 },
      }),
    };
    const { actor, created } = actorOf();

    await actor.applyItem(withId, 2);

    expect(created).toEqual([
      [{ _id: 'pxtF1NfletmoFFGV', name: 'Bleeding', img: 'condition.png', type: 'condition', system: { severity: 2 } }],
    ]);
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
    const revolver: GrantDocument = {
      ...source('weapon', 'Revolver'),
      toObject: () => ({ _id: 'w1', name: 'Revolver', img: 'condition.png', type: 'weapon', system: {} }),
    };

    const result = await actor.applyItem(revolver, 1);

    expect(result.change).toEqual({ created: false, counted: null, from: 0, to: 0 });
    expect(held.updates).toEqual([]);
    expect(created).toHaveLength(1);
    // The second copy must mint its own id — keeping 'w1' would collide with the held copy.
    expect((created[0][0] as { _id?: string })._id).toBeUndefined();
    expect(cardData().flavorText).toBe('You add another one of these to your inventory.');
  });

  it('says a skill is learned, not carried', async () => {
    const { actor } = actorOf();

    await actor.applyItem(source('skill', 'Rimwise'), 1);

    expect(cardData().flavorText).toBe('You learn this skill');
  });

  // The generator hands out a class, a loadout, two table results and a skill list in one pass;
  // a card apiece would bury the rolls that produced them (R7).
  it('grants without a card when the caller asks for none', async () => {
    const { actor, created } = actorOf();

    await actor.applyItem(source('item', 'Ration'), 1, { message: false });

    expect(created).toHaveLength(1);
    expect(chat.cards).toEqual([]);
  });
});

// The generator's loadout rows are UUIDs and a macro names a Condition by id, so the grant has to
// resolve as well as apply. It is the same verb: only where the document comes from differs.
describe('applyItemRef', () => {
  const ration: GrantDocument = {
    name: 'Ration',
    img: 'ration.png',
    type: 'item',
    system: { quantity: 1 },
    toObject: () => ({ name: 'Ration', img: 'ration.png', type: 'item', system: { quantity: 1 } }),
  };

  it('resolves the reference and grants what it names', async () => {
    (globalThis as Record<string, unknown>).game = { items: { get: () => ration }, packs: [] };
    const { actor, created } = actorOf();

    const result = await actor.applyItemRef('abcdefghijklmnop', 2);

    expect(result?.change).toEqual({ created: true, counted: 'quantity', from: 0, to: 2 });
    expect(created).toHaveLength(1);
  });

  it('carries the silence through to the grant it resolves', async () => {
    (globalThis as Record<string, unknown>).game = { items: { get: () => ration }, packs: [] };
    const { actor, created } = actorOf();

    await actor.applyItemRef('abcdefghijklmnop', 1, { message: false });

    expect(created).toHaveLength(1);
    expect(chat.cards).toEqual([]);
  });

  it('reports a reference that resolves to nothing instead of granting', async () => {
    (globalThis as Record<string, unknown>).game = { items: { get: () => undefined }, packs: [] };
    const { actor, created } = actorOf();

    await expect(actor.applyItemRef('abcdefghijklmnop')).resolves.toBeNull();
    expect(notifications.errors).toHaveLength(1);
    expect(created).toEqual([]);
  });
});

describe('reloadWeapon', () => {
  it('refills the magazine from the rounds carried and posts the card', async () => {
    const smg = item({
      id: 'w1',
      type: 'weapon',
      name: 'SMG',
      system: { useAmmo: true, ammo: 10, shots: 6, curShots: 2, shotsPerFire: 1 },
    });
    const { actor } = actorOf([smg]);

    const outcome = await actor.reloadWeapon('w1');

    expect(outcome?.status).toBe('reloaded');
    expect(smg.updates).toEqual([{ 'system.curShots': 6, 'system.ammo': 6 }]);
    expect(chat.cards[0].template).toContain('reload');
  });

  it('reports an id this actor does not hold', async () => {
    const { actor } = actorOf();

    await expect(actor.reloadWeapon('nope')).resolves.toBeNull();
    expect(notifications.errors).toHaveLength(1);
    expect(chat.cards).toEqual([]);
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

// The Bleeding document's real id (content/ids.json) — the id `grantItem`'s `{keepId: true}`
// carries onto an embedded item when this system grants one. `isCondition` (module/conditions.ts)
// also matches by the exact canonical name alone, which is the only identity a condition dragged
// straight from the compendium onto a sheet keeps — that path never touches `grantItem` at all,
// so it never receives this id and mints a fresh one instead.
const BLEEDING_ID = 'pxtF1NfletmoFFGV';

describe('takeBleedingDamage', () => {
  it('costs the severity of the Bleeding condition, and nothing another condition carries', async () => {
    const items = [
      item({ id: BLEEDING_ID, type: 'condition', name: 'Bleeding', system: { severity: 3 } }),
      item({ id: 'c3', type: 'condition', name: 'Frightened', system: { severity: 5 } }),
    ];
    const { actor, updates } = actorOf(items);

    await actor.takeBleedingDamage();

    expect(updates).toEqual([{ 'system.health.value': 6 }]);
  });

  // The sheet-drop path: a fresh, unrelated id — nothing this system ever minted — carried on an
  // item whose name is still the exact one the compendium gave it.
  it('costs the severity of a Bleeding condition dragged onto the sheet, with a fresh id', async () => {
    const items = [item({ id: 'aFreshDragAndDropId01', type: 'condition', name: 'Bleeding', system: { severity: 3 } })];
    const { actor, updates } = actorOf(items);

    await actor.takeBleedingDamage();

    expect(updates).toEqual([{ 'system.health.value': 6 }]);
  });

  // The card's image used to be hand-written HTML pointing at systems/foundry-mothership/… , a
  // path that stopped existing at the rename (audit F4).
  it('posts a card whose art is under the system’s real id', async () => {
    const { actor } = actorOf([item({ id: BLEEDING_ID, type: 'condition', name: 'Bleeding', system: { severity: 1 } })]);

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
