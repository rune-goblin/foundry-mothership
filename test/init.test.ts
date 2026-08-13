import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { compare } from '../module/compare.js';
import { SETTING_DEFAULTS } from '../module/checks/settings.ts';
import { clearChatActions } from '../module/chat/actions.ts';

/**
 * Boot. `init.ts` self-registers when it is imported — that is its whole job — so this spec
 * installs the globals first, imports it once, and then drives each handler by hand.
 *
 * The sheets and the DataModels are stubbed: they are registered here, not written here, and
 * both reach for `foundry.*` the moment they load.
 */

type Globals = Record<string, unknown>;
const globals = globalThis as unknown as Globals;

const spies = vi.hoisted(() => {
  const order: string[] = [];
  return {
    order,
    registerSettings: vi.fn(() => order.push('settings')),
    registerEnrichers: vi.fn(() => order.push('enrichers')),
    registerActions: vi.fn(() => order.push('actions')),
  };
});

vi.mock('../module/settings.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../module/settings.ts')>()),
  registerSettings: spies.registerSettings,
}));

vi.mock('../module/chat/enrichers.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../module/chat/enrichers.ts')>()),
  registerEnrichers: spies.registerEnrichers,
}));

vi.mock('../module/api/api.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../module/api/api.ts')>()),
  registerActions: spies.registerActions,
}));

vi.mock('../module/data/actor-models.js', () => ({ ACTOR_MODELS: { character: class {} } }));
vi.mock('../module/data/item-models.js', () => ({ ITEM_MODELS: { item: class {} } }));
vi.mock('../module/ui/actor/CharacterSheetApp.js', () => ({ MoshCharacterSheet: class {} }));
vi.mock('../module/ui/creature/CreatureSheetApp.js', () => ({ MoshCreatureSheet: class {} }));
vi.mock('../module/ui/class/ClassSheetApp.js', () => ({ MoshClassSheet: class {} }));
vi.mock('../module/ui/item/ItemSheetApp.js', () => ({ MoshItemSheet: class {} }));
vi.mock('../module/ui/skill/SkillSheetApp.js', () => ({ MoshSkillSheet: class {} }));
vi.mock('../module/ui/settings/RolltableConfigApp.js', () => ({ RolltableConfigApp: class {} }));

interface HookRegistration {
  readonly hook: string;
  readonly handler: (...args: never[]) => unknown;
}

const once: HookRegistration[] = [];
const on: HookRegistration[] = [];
const sheets: { registered: string[]; unregistered: string[] } = { registered: [], unregistered: [] };
const helpers: string[] = [];
let api: Record<string, unknown> | undefined;

globals.Hooks = {
  once: (hook: string, handler: (...args: never[]) => unknown) => once.push({ hook, handler }),
  on: (hook: string, handler: (...args: never[]) => unknown) => on.push({ hook, handler }),
};

const config: Record<string, Record<string, unknown>> = {
  Combat: {},
  Actor: {},
  Item: {},
  TextEditor: { enrichers: [] },
};
Object.defineProperty(config.Actor, 'documentClass', {
  set: (value: unknown) => {
    spies.order.push('documents');
    config.Actor.stored = value;
  },
  get: () => config.Actor.stored,
  configurable: true,
});
globals.CONFIG = config;

globals.CONST = {
  TOKEN_DISPOSITIONS: { HOSTILE: -1, NEUTRAL: 0, FRIENDLY: 1 },
  TOKEN_DISPLAY_MODES: { OWNER_HOVER: 20 },
};

globals.Handlebars = {
  registerHelper: (name: string, helper: unknown) => {
    spies.order.push('helper');
    helpers.push(name);
    (globals.Handlebars as Globals)[name] = helper;
  },
};

const registry = (target: string[], removed: string[]) => ({
  registerSheet: (_namespace: string, sheet: { name: string }) => target.push(sheet.name),
  unregisterSheet: (_namespace: string, sheet: string) => removed.push(sheet),
});

globals.foundry = {
  documents: {
    collections: {
      Actors: registry(sheets.registered, sheets.unregistered),
      Items: registry(sheets.registered, sheets.unregistered),
    },
  },
  appv1: { sheets: { ActorSheet: 'v1 ActorSheet', ItemSheet: 'v1 ItemSheet' } },
  utils: { fromUuid: async () => null },
};

const game: Globals = { settings: { register: () => undefined, registerMenu: () => undefined } };
Object.defineProperty(game, 'mothershiprpg', {
  set: (value: Record<string, unknown>) => {
    spies.order.push('api');
    api = value;
  },
  get: () => api,
  configurable: true,
});
globals.game = game;

const init = await import('../module/init.ts');

beforeEach(() => {
  spies.order.length = 0;
  sheets.registered.length = 0;
  sheets.unregistered.length = 0;
  helpers.length = 0;
  config.TextEditor.enrichers = [];
  for (const spy of [spies.registerSettings, spies.registerEnrichers, spies.registerActions]) spy.mockClear();
});

afterEach(clearChatActions);

describe('the hooks it claims when imported', () => {
  it('registers each hook exactly once, and only the ones it handles', () => {
    expect(once.map((entry) => entry.hook)).toEqual(['init', 'ready', 'diceSoNiceReady']);
    expect(on.map((entry) => entry.hook)).toEqual(['preCreateActor', 'renderChatLog']);
  });

  it('registers the handlers it exports, so a spec drives the same code Foundry does', () => {
    expect(once[0].handler).toBe(init.onInit);
    expect(on[0].handler).toBe(init.onPreCreateActor);
  });
});

describe('init', () => {
  it('registers in the order everything downstream depends on', () => {
    init.onInit();

    expect(spies.order).toEqual([
      'api',
      'settings',
      'documents',
      'enrichers',
      'actions',
      'helper',
    ]);
  });

  it('publishes the new verbs and the legacy shim on one object', () => {
    init.onInit();

    expect(typeof (api ?? {}).rollStat).toBe('function');
    expect(typeof (api ?? {}).initRollCheck).toBe('function');
    expect((api ?? {}).MothershipActor).toBeDefined();
  });

  it('makes the five sheets the defaults and lets the v1 ones go', () => {
    init.onInit();

    expect(sheets.registered).toEqual([
      'MoshCharacterSheet',
      'MoshCreatureSheet',
      'MoshClassSheet',
      'MoshSkillSheet',
      'MoshItemSheet',
    ]);
    expect(sheets.unregistered).toEqual(['v1 ActorSheet', 'v1 ItemSheet']);
  });

  // RC2: the v1 namespace is deprecated for removal in v16, when dereferencing it kills boot.
  it('survives a Foundry with no appv1 namespace left', () => {
    const withV1 = globals.foundry as Globals;
    delete withV1.appv1;

    expect(() => init.onInit()).not.toThrow();
    expect(sheets.registered).toHaveLength(5);

    withV1.appv1 = { sheets: { ActorSheet: 'v1 ActorSheet', ItemSheet: 'v1 ItemSheet' } };
  });

  it('registers the one Handlebars helper the chat cards use, and no dead ones', () => {
    init.onInit();

    expect(helpers).toEqual(['compare']);
    expect((globals.Handlebars as Globals).compare).toBe(compare);
  });

  it('sets initiative and both document classes from the new documents', () => {
    init.onInit();

    expect(config.Combat.initiative).toEqual({ formula: '1d100', decimals: 2 });
    expect(config.Actor.documentClass).toBe((api ?? {}).MothershipActor);
    expect(config.Item.documentClass).toBe((api ?? {}).MothershipItem);
    expect(config.Actor.dataModels).toBeDefined();
    expect(config.Item.dataModels).toBeDefined();
  });
});

describe('a newly created actor', () => {
  const created = (data: { type?: string; name?: string }) => {
    const changes: Record<string, unknown>[] = [];
    init.onPreCreateActor({ name: data.name, updateSource: (change) => changes.push(change) }, data);
    return Object.assign({}, ...changes) as Record<string, unknown>;
  };

  /**
   * `TokenDocument#getBarAttribute` resolves its path against `actor.system` — verified against
   * the installed Foundry, which calls `getProperty(this.actor.system, attribute)`. The old hook
   * wrote `system.health`, with a comment claiming the opposite (audit RC1).
   */
  it('gets bars that point at fields that exist', () => {
    const token = created({ type: 'character', name: 'Sarah' });

    expect(token['prototypeToken.bar1.attribute']).toBe('health');
    expect(token['prototypeToken.bar2.attribute']).toBe('hits');
  });

  // `vision` was replaced by `sight.enabled` in v10; the schema discarded the old key silently.
  it('gives a character vision, a link to its token, and a friendly disposition', () => {
    const token = created({ type: 'character', name: 'Sarah' });

    expect(token['prototypeToken.sight.enabled']).toBe(true);
    expect(token['prototypeToken.vision']).toBeUndefined();
    expect(token['prototypeToken.actorLink']).toBe(true);
    expect(token['prototypeToken.disposition']).toBe(1);
  });

  it('leaves a creature hostile, unlinked and sightless', () => {
    const token = created({ type: 'creature', name: 'Thing' });

    expect(token['prototypeToken.disposition']).toBe(-1);
    expect(token['prototypeToken.actorLink']).toBeUndefined();
    expect(token['prototypeToken.sight.enabled']).toBeUndefined();
  });

  it('names the token after the actor', () => {
    expect(created({ type: 'character', name: 'Sarah' })['prototypeToken.name']).toBe('Sarah');
  });

  it('writes its defaults in one update', () => {
    const changes: Record<string, unknown>[] = [];
    init.onPreCreateActor({ name: 'Sarah', updateSource: (change) => changes.push(change) }, {
      type: 'character',
      name: 'Sarah',
    });

    expect(changes).toHaveLength(1);
  });
});

describe('the dice colorsets', () => {
  it('are added by one hook, from one list', () => {
    const added: { name: string; category: string }[] = [];
    init.onDiceSoNiceReady({ addColorset: (colorset) => added.push(colorset as never) });

    expect(added).toHaveLength(3);
    expect(added.every((colorset) => colorset.category === 'Mothership')).toBe(true);
  });

  // The colorset names couple to the two theme settings' defaults by magic string (audit RC15).
  it('are named by the settings that select them', () => {
    expect(init.DICE_COLORSETS.map((colorset) => colorset.name)).toEqual([
      'roll',
      SETTING_DEFAULTS.damageDiceTheme,
      SETTING_DEFAULTS.panicDieTheme,
    ]);
  });

  it('describe themselves with keys the translation can reach', () => {
    for (const colorset of init.DICE_COLORSETS) expect(colorset.description).toMatch(/^Mosh\./);
  });
});

describe('dropping an item on the hotbar', () => {
  beforeEach(() => {
    globals.game = { ...game, macros: { find: () => undefined }, user: { assignHotbarMacro: vi.fn() } };
  });

  it('claims the drop only for items', () => {
    expect(init.onHotbarDrop(null, { type: 'Item', uuid: 'Actor.a.Item.b' }, 1)).toBe(false);
    expect(init.onHotbarDrop(null, { type: 'Macro' }, 1)).toBeUndefined();
  });

  /**
   * Legacy rebuilt the actor by splitting the UUID on dots and assuming `Actor.<id>.Item.<id>`,
   * which a token actor's item is not, and placed its warning after the expression that had
   * already thrown (audit RC4).
   */
  it('resolves the drop by UUID and writes a macro calling the new API', async () => {
    const item = { name: 'Revolver', img: 'revolver.png', documentName: 'Item' };
    (globals.foundry as Globals).utils = { fromUuid: async () => item };
    const created: Record<string, unknown>[] = [];
    globals.Macro = { create: async (data: Record<string, unknown>) => (created.push(data), data) };

    await init.createItemMacro({ type: 'Item', uuid: 'Scene.s.Token.t.Actor.a.Item.b' }, 3);

    expect(created).toHaveLength(1);
    expect(created[0].command).toBe('game.mothershiprpg.rollItem("Revolver");');
    expect(created[0].flags).toEqual({ mothershiprpg: { itemMacro: true } });
  });

  it('warns instead of throwing when the drop resolves to nothing', async () => {
    (globals.foundry as Globals).utils = { fromUuid: async () => null };
    const warnings: string[] = [];
    globals.ui = { notifications: { warn: (message: string) => warnings.push(message) } };
    globals.Macro = { create: async () => undefined };

    await init.createItemMacro({ type: 'Item', uuid: 'nothing' }, 1);

    expect(warnings).toEqual(['Mosh.Errors.ItemMacroNotOwned']);
  });
});

describe('the chat log', () => {
  it('binds the delegated action listener to whatever the log rendered into', () => {
    const listeners: string[] = [];
    init.onRenderChatLog(null, { addEventListener: (type: string) => listeners.push(type) } as never);

    expect(listeners).toEqual(['click']);
  });
});

describe('ready', () => {
  it('registers the hotbar drop late, so a module can claim it first', () => {
    init.onReady();

    expect(on.at(-1)?.hook).toBe('hotbarDrop');
  });
});
