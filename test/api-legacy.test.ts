import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearDeprecations } from '../module/debug.ts';
import { TABLES } from '../module/tables/tables.ts';
import {
  clearFoundryStubs,
  installChat,
  installI18n,
  installNotifications,
  installSettings,
  type Notifications,
} from './foundry-stubs.ts';

/**
 * The shim, pinned. What a world already holds is the contract: macros users imported into their
 * hotbars call these seven names with these positional arguments, and nothing about the new API
 * is allowed to change that. Every signature's arity is asserted here so the shim cannot drift.
 */

const prompts = vi.hoisted(() => ({
  chooseAdvantage: vi.fn(),
  chooseAttribute: vi.fn(),
  chooseSkill: vi.fn(),
  askReload: vi.fn(),
  outOfAmmo: vi.fn(),
  chooseCover: vi.fn(),
  noCharacter: vi.fn(async () => undefined),
}));

vi.mock('../module/dialogs/prompts.ts', () => prompts);

const legacy = await import('../module/api/legacy.ts');

type Globals = Record<string, unknown>;
const globals = globalThis as unknown as Globals;

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

interface FakeActor {
  readonly name: string;
  readonly calls: string[];
  [method: string]: unknown;
}

function actor(items: object[] = []): FakeActor {
  const calls: string[] = [];
  const fake: FakeActor = { name: 'Sarah', calls, items };
  for (const method of METHODS) {
    fake[method] = vi.fn(async (...args: unknown[]) => {
      calls.push(method);
      return args;
    });
  }
  return fake;
}

let sarah: FakeActor;
let notifications: Notifications;

beforeEach(() => {
  clearDeprecations();
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  for (const prompt of Object.values(prompts)) prompt.mockClear();
  installI18n({});
  installSettings({ macroTarget: 'character' });
  installChat();
  notifications = installNotifications();
  sarah = actor();
  (globals.game as Globals).user = { id: 'user1', character: sarah };
});

afterEach(() => {
  vi.restoreAllMocks();
  clearFoundryStubs();
});

/** The surface as `mosh.js` published it: the exact names, in the exact arities. */
const SURFACE: readonly [keyof typeof legacy.LEGACY_API, number][] = [
  ['rollItemMacro', 1],
  ['rollStatMacro', 0],
  ['initRollTable', 7],
  ['initRollCheck', 6],
  ['initModifyActor', 4],
  ['initModifyItem', 2],
  ['noCharSelected', 0],
];

describe('the legacy surface', () => {
  it('publishes exactly the seven functions an imported macro can call', () => {
    expect(Object.keys(legacy.LEGACY_API).sort()).toEqual(SURFACE.map(([name]) => name).sort());
  });

  it.each(SURFACE)('%s keeps its %i positional arguments', (name, arity) => {
    expect(legacy.LEGACY_API[name]).toHaveLength(arity);
  });

  it('says once, per name, that the caller should move on', async () => {
    const warn = vi.spyOn(console, 'warn');

    await legacy.initModifyActor('system.other.stress.value', 1, null, true);
    await legacy.initModifyActor('system.other.stress.value', 1, null, true);

    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('initModifyActor');
  });
});

describe('initRollCheck', () => {
  it('rolls the stat a macro names, at the modifier its roll string states', async () => {
    await legacy.initRollCheck('1d100 [-]', 'low', 'body', null, null, null);

    expect(sarah.rollStat).toHaveBeenCalledWith('body', { advantage: 'disadvantage' });
  });

  it('leaves the modifier to the dialog when the macro states no roll string', async () => {
    await legacy.initRollCheck(null, 'low', 'body', null, null, null);

    expect(sarah.rollStat).toHaveBeenCalledWith('body', { advantage: null });
  });

  // `restSave` and `damage` were never stats: legacy read the same parameter three ways (F14).
  it('reads restSave as the Rest Save it is', async () => {
    await legacy.initRollCheck('1d100 [+]', 'low', 'restSave', null, null, null);

    expect(sarah.rollRestSave).toHaveBeenCalledWith({ advantage: 'advantage' });
    expect(sarah.rollStat).not.toHaveBeenCalled();
  });

  it('reads damage as a damage roll on the weapon it was handed', async () => {
    await legacy.initRollCheck(null, null, 'damage', null, null, { _id: 'wpn1' });

    expect(sarah.rollWeapon).toHaveBeenCalledWith('wpn1', { roll: 'damage', advantage: null });
  });

  it('attacks with a weapon when one is passed and damage is not asked for', async () => {
    await legacy.initRollCheck(null, 'low', 'combat', null, null, { _id: 'wpn1' });

    expect(sarah.rollWeapon).toHaveBeenCalledWith('wpn1', { advantage: null });
  });

  it('finds a skill by the name a macro knows it as', async () => {
    sarah = actor([{ id: 's1', type: 'skill', name: 'Rimwise' }]);
    (globals.game as Globals).user = { id: 'user1', character: sarah };

    await legacy.initRollCheck(null, null, null, 'Rimwise', 15, null);

    expect(sarah.rollSkill).toHaveBeenCalledWith('s1', { advantage: null });
  });

  // Legacy would have looked the word up as a stat and thrown; there is one message instead, and
  // it is not repeated once per selected token.
  it('says so once when the macro names something that is not a stat', async () => {
    installSettings({ macroTarget: 'token' });

    await legacy.initRollCheck('1d100', 'low', 'charisma', null, null, null);

    expect(notifications.warnings).toHaveLength(1);
    expect(sarah.rollStat).not.toHaveBeenCalled();
  });

  it('asks which stat when the macro names nothing at all', async () => {
    await legacy.initRollCheck(null, null, null, null, null, null);

    expect(sarah.promptCheck).toHaveBeenCalledWith({ advantage: null });
  });
});

describe('initRollTable', () => {
  it('maps a shipped table id onto the key that names it', async () => {
    await legacy.initRollTable(TABLES.gunshot.id, '1d10 [-]', 'low', true, false, null, null);

    expect(sarah.rollTable).toHaveBeenCalledWith('gunshot', { advantage: 'disadvantage' });
  });

  it('follows the GM’s own choice of document for a table', async () => {
    installSettings({ macroTarget: 'character', table1eWoundGunshot: 'someOtherId' });

    await legacy.initRollTable('someOtherId', '1d10', 'low', true, false, null, null);

    expect(sarah.rollTable).toHaveBeenCalledWith('gunshot', { advantage: 'none' });
  });

  // Legacy's one table sentinel: an id argument that was not an id (audit F2).
  it('reads the panicCheck sentinel as a Panic Check', async () => {
    await legacy.initRollTable('panicCheck', '[+]', null, false, false, null, null);

    expect(sarah.rollPanic).toHaveBeenCalledWith({ advantage: 'advantage' });
    expect(sarah.rollTable).not.toHaveBeenCalled();
  });

  it('reports a table it has no rules for instead of rolling something else', async () => {
    await legacy.initRollTable('unknownTableId', '1d10', 'low', true, false, null, null);

    expect(sarah.rollTable).not.toHaveBeenCalled();
    expect(notifications.errors).toHaveLength(1);
  });
});

describe('initModifyActor', () => {
  it('passes a flat value straight through', async () => {
    await legacy.initModifyActor('system.hits.value', -1, null, true);

    expect(sarah.modify).toHaveBeenCalledWith(
      'system.hits.value',
      { kind: 'amount', amount: -1 },
      { message: true },
    );
  });

  it('passes the roll string when the value is null, as the shipped macros do', async () => {
    await legacy.initModifyActor('system.stats.body.value', null, '-1d10', true);

    expect(sarah.modify).toHaveBeenCalledWith(
      'system.stats.body.value',
      { kind: 'roll', dice: '-1d10' },
      { message: true },
    );
  });

  // Legacy read `if (modValue)`, so a zero meant "no value given" and it fell through to the roll
  // string — which, with no roll string either, reached `new Roll(undefined)`.
  it('falls through to the roll string on a zero, and changes nothing when neither is given', async () => {
    await legacy.initModifyActor('system.health.value', 0, '1d5', true);
    await legacy.initModifyActor('system.health.value', 0, null, true);

    expect(sarah.modify).toHaveBeenNthCalledWith(
      1,
      'system.health.value',
      { kind: 'roll', dice: '1d5' },
      { message: true },
    );
    expect(sarah.modify).toHaveBeenNthCalledWith(
      2,
      'system.health.value',
      { kind: 'amount', amount: 0 },
      { message: true },
    );
  });

  it('honours a macro asking for no chat message', async () => {
    await legacy.initModifyActor('system.health.value', -1, null, false);

    expect(sarah.modify).toHaveBeenCalledWith(
      'system.health.value',
      { kind: 'amount', amount: -1 },
      { message: false },
    );
  });
});

describe('initModifyItem', () => {
  it('gives the actor the document the id names', async () => {
    const document = { name: 'Bleeding', img: 'b.png', type: 'condition', system: {}, toObject: () => ({}) };
    globals.game = { ...(globals.game as Globals), items: { get: () => document } };

    await legacy.initModifyItem('pxtF1NfletmoFFGV', 3);

    expect(sarah.applyItem).toHaveBeenCalledWith(document, 3);
  });
});

describe('the two entry points that were broken', () => {
  // RC3/RC4: every gear, armour, ability and condition hotbar macro threw.
  it('rollItemMacro posts the card its item asked for', async () => {
    sarah = actor([{ id: 'g1', type: 'item', name: 'Rebreather' }]);
    (globals.game as Globals).user = { id: 'user1', character: sarah };

    await legacy.rollItemMacro('Rebreather');

    expect(sarah.printDescription).toHaveBeenCalledWith('g1');
  });

  // RC5: it called a method defined nowhere, so it threw for anyone who tried it.
  it('rollStatMacro opens the stat picker', async () => {
    await legacy.rollStatMacro();

    expect(sarah.promptCheck).toHaveBeenCalled();
  });
});

describe('noCharSelected', () => {
  it('opens the same window the resolver opens, naming the same setting', async () => {
    installSettings({ macroTarget: 'token' });

    await legacy.noCharSelected();

    expect(prompts.noCharacter).toHaveBeenCalledWith('token');
  });
});
