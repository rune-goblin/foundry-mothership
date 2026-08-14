import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearChatActions, runChatAction } from '../module/chat/actions.ts';
import { parseAction, type ChatAction } from '../module/chat/enrichers.ts';
import {
  clearFoundryStubs,
  installChat,
  installI18n,
  installNotifications,
  installSettings,
  type Notifications,
} from './foundry-stubs.ts';

/**
 * The public API, and the one question every entry point asks first: who is this for. Legacy
 * repeated that block at five call sites and the shipped content restated it thirteen times more
 * (audit RC6, F24) — copies that had already drifted apart.
 */

const prompts = vi.hoisted(() => ({
  chooseAdvantage: vi.fn(),
  chooseAttribute: vi.fn(),
  chooseSkill: vi.fn(),
  askReload: vi.fn(),
  outOfAmmo: vi.fn(),
  chooseCover: vi.fn(),
  chooseSave: vi.fn(),
  chooseStress: vi.fn(),
  chooseWound: vi.fn(),
  noCharacter: vi.fn(async () => undefined),
}));

vi.mock('../module/dialogs/prompts.ts', () => prompts);

const api = await import('../module/api/api.ts');

type Globals = Record<string, unknown>;
const globals = globalThis as unknown as Globals;

interface FakeActor {
  readonly name: string;
  readonly calls: string[];
  [method: string]: unknown;
}

const METHODS = [
  'rollStat',
  'promptCheck',
  'rollSkill',
  'rollWeapon',
  'rollPanic',
  'rollRestSave',
  'rollTable',
  'modify',
  'applyItem',
  'printDescription',
] as const;

function actor(name: string, items: object[] = []): FakeActor {
  const calls: string[] = [];
  const fake: FakeActor = { name, calls, items };
  for (const method of METHODS) {
    fake[method] = vi.fn(async (...args: unknown[]) => {
      calls.push(method);
      return args;
    });
  }
  return fake;
}

function assign(character: FakeActor | null): void {
  (globals.game as Globals).user = { id: 'user1', character };
}

function control(actors: FakeActor[]): void {
  globals.canvas = { tokens: { controlled: actors.map((entry) => ({ actor: entry })) } };
}

let notifications: Notifications;

beforeEach(() => {
  prompts.noCharacter.mockClear();
  installI18n({ 'Mothership.Errors.NoItemNamed': '{actor} has no item named {name}.' });
  installSettings({ macroTarget: 'character' });
  installChat();
  notifications = installNotifications();
  assign(null);
  control([]);
});

afterEach(() => {
  clearChatActions();
  clearFoundryStubs();
  delete globals.canvas;
});

describe('forTargetActors', () => {
  it('runs against the player’s assigned character', async () => {
    const sarah = actor('Sarah');
    assign(sarah);

    await expect(api.forTargetActors((target) => target.name)).resolves.toEqual(['Sarah']);
    expect(prompts.noCharacter).not.toHaveBeenCalled();
  });

  it('runs against every controlled token when macros are aimed at tokens', async () => {
    installSettings({ macroTarget: 'token' });
    control([actor('One'), actor('Two')]);

    await expect(api.forTargetActors((target) => target.name)).resolves.toEqual(['One', 'Two']);
  });

  it('ignores the assigned character in token mode, and the tokens in character mode', async () => {
    const sarah = actor('Sarah');
    assign(sarah);
    control([actor('Token')]);

    await expect(api.forTargetActors((target) => target.name)).resolves.toEqual(['Sarah']);
    installSettings({ macroTarget: 'token' });
    await expect(api.forTargetActors((target) => target.name)).resolves.toEqual(['Token']);
  });

  // The window names the setting that decides this and how to satisfy it (divergence R3-3); it
  // is not a warning about a world setting the player cannot reach (audit RC14).
  it('opens the prompt and does nothing when no character is assigned', async () => {
    const ran = vi.fn();

    await expect(api.forTargetActors(ran)).resolves.toEqual([]);
    expect(ran).not.toHaveBeenCalled();
    expect(prompts.noCharacter).toHaveBeenCalledWith('character');
  });

  it('names the token setting in the prompt when that is what is selected', async () => {
    installSettings({ macroTarget: 'token' });

    await expect(api.forTargetActors(vi.fn())).resolves.toEqual([]);
    expect(prompts.noCharacter).toHaveBeenCalledWith('token');
  });

  it('falls back to the character when the setting holds nothing it knows', async () => {
    installSettings({});
    expect(api.macroTarget()).toBe('character');
  });

  // Legacy fired the calls off inside a forEach without awaiting any of them, so a failure
  // surfaced only as an unhandled rejection (audit RC12).
  it('awaits each actor before starting the next', async () => {
    installSettings({ macroTarget: 'token' });
    control([actor('One'), actor('Two')]);
    const order: string[] = [];

    await api.forTargetActors(async (target) => {
      order.push(`start ${target.name}`);
      await Promise.resolve();
      order.push(`end ${target.name}`);
    });

    expect(order).toEqual(['start One', 'end One', 'start Two', 'end Two']);
  });
});

describe('the verbs', () => {
  const DELEGATIONS: readonly [keyof typeof api.NEW_API, string, readonly unknown[]][] = [
    ['rollStat', 'rollStat', ['body', {}]],
    ['promptCheck', 'promptCheck', [{}]],
    ['rollSkill', 'rollSkill', ['skill1', {}]],
    ['rollWeapon', 'rollWeapon', ['wpn1', {}]],
    ['rollPanic', 'rollPanic', [{}]],
    ['rollRestSave', 'rollRestSave', [{}]],
    ['rollTable', 'rollTable', ['gunshot', {}]],
    ['modify', 'modify', ['system.other.stress.value', { kind: 'amount', amount: 1 }]],
  ];

  it.each(DELEGATIONS)('%s hands its arguments to every target', async (verb, method, args) => {
    const sarah = actor('Sarah');
    assign(sarah);

    await (api.NEW_API[verb] as (...call: unknown[]) => Promise<unknown>)(...args);

    expect(sarah[method]).toHaveBeenCalledWith(...args);
  });

  // The four hotbar macros whose argument is the player's: each is one prompt, then the verb
  // above it — no dialog of their own any more (divergence R4b-1's last clause).
  describe('the verbs that ask first', () => {
    it('promptStress applies the amount the prompt answered with', async () => {
      const sarah = actor('Sarah');
      assign(sarah);
      prompts.chooseStress.mockResolvedValue({ kind: 'amount', amount: -2 });

      await api.promptStress('relieve');

      expect(prompts.chooseStress).toHaveBeenCalledWith('relieve');
      expect(sarah.modify).toHaveBeenCalledWith('system.other.stress.value', { kind: 'amount', amount: -2 });
    });

    it('promptSave rolls the Save the prompt answered with', async () => {
      const sarah = actor('Sarah');
      assign(sarah);
      prompts.chooseSave.mockResolvedValue({ stat: 'fear', advantage: 'advantage' });

      await api.promptSave();

      expect(sarah.rollStat).toHaveBeenCalledWith('fear', { advantage: 'advantage' });
    });

    it('promptWound rolls the table the prompt answered with', async () => {
      const sarah = actor('Sarah');
      assign(sarah);
      prompts.chooseWound.mockResolvedValue({ key: 'gunshot', advantage: 'none' });

      await api.promptWound();

      expect(sarah.rollTable).toHaveBeenCalledWith('gunshot', { advantage: 'none' });
    });

    it('does nothing at all when the prompt is dismissed', async () => {
      const sarah = actor('Sarah');
      assign(sarah);
      prompts.chooseStress.mockResolvedValue(null);
      prompts.chooseSave.mockResolvedValue(null);
      prompts.chooseWound.mockResolvedValue(null);

      await expect(api.promptStress('gain')).resolves.toEqual([]);
      await expect(api.promptSave()).resolves.toEqual([]);
      await expect(api.promptWound()).resolves.toEqual([]);
      expect(sarah.calls).toEqual([]);
    });
  });

  it('publishes exactly the surface the content and the sheets call', () => {
    expect(Object.keys(api.NEW_API).sort()).toEqual(
      [
        'MothershipActor',
        'MothershipItem',
        'applyCondition',
        'forTargetActors',
        'modify',
        'promptCheck',
        'promptSave',
        'promptStress',
        'promptWound',
        'rollItem',
        'rollPanic',
        'rollRestSave',
        'rollSkill',
        'rollStat',
        'rollTable',
        'rollWeapon',
        'targetActors',
      ].sort(),
    );
  });
});

describe('rollItem', () => {
  const item = (id: string, type: string, name: string) => ({ id, type, name });

  it('attacks with a weapon, rolls a skill, and describes anything else', async () => {
    const sarah = actor('Sarah', [
      item('w1', 'weapon', 'Revolver'),
      item('s1', 'skill', 'Rimwise'),
      item('g1', 'item', 'Rebreather'),
    ]);
    assign(sarah);

    await api.rollItem('Revolver');
    await api.rollItem('Rimwise');
    await api.rollItem('Rebreather');

    expect(sarah.calls).toEqual(['rollWeapon', 'rollSkill', 'printDescription']);
    expect(sarah.rollWeapon).toHaveBeenCalledWith('w1');
  });

  // Legacy dereferenced the item before the guard that was meant to catch its absence, so the
  // designed warning was unreachable and the user got a stack trace (audit RC4).
  it('warns before it dereferences anything, when no such item is carried', async () => {
    const sarah = actor('Sarah');
    assign(sarah);

    await expect(api.rollItem('Nothing')).resolves.toEqual([null]);
    expect(notifications.warnings).toEqual(['Sarah has no item named Nothing.']);
  });
});

describe('applyCondition', () => {
  it('resolves the reference before it touches an actor, and says so when it cannot', async () => {
    const sarah = actor('Sarah');
    assign(sarah);

    await expect(api.applyCondition('coward', 1)).resolves.toEqual([]);
    expect(sarah.calls).toEqual([]);
    expect(notifications.errors).toHaveLength(1);
  });

  it('gives the resolved document to every target', async () => {
    const document = { name: 'Bleeding', img: 'b.png', type: 'condition', system: {}, toObject: () => ({}) };
    globals.game = { ...(globals.game as Globals), items: { get: () => document } };
    const sarah = actor('Sarah');
    assign(sarah);

    await api.applyCondition('pxtF1NfletmoFFGV', 2);

    expect(sarah.applyItem).toHaveBeenCalledWith(document, 2);
  });

  it('resolves an unmapped slug as the bare id an old macro already passes', () => {
    expect(api.conditionRef('anything')).toBe('anything');
  });
});

describe('registerActions', () => {
  const action = (text: string): ChatAction => {
    const parsed = parseAction(text);
    if (!parsed.ok) throw new Error(text);
    return parsed.action;
  };

  it('claims the apply verb the enrichers already render', async () => {
    const sarah = actor('Sarah');
    assign(sarah);
    api.registerActions();

    await runChatAction(action('@Apply[coward]'), {
      event: null as unknown as MouseEvent,
      button: null as unknown as HTMLElement,
    });

    // Nothing resolved the slug, so the miss is reported rather than swallowed.
    expect(notifications.errors).toHaveLength(1);
    expect(notifications.warnings).toEqual([]);
  });
});
