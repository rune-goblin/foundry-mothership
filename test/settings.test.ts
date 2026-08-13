import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { MACRO_TARGET_DEFAULT } from '../module/api/api.ts';
import { SETTING_DEFAULTS } from '../module/checks/settings.ts';
import { registerSettings, SETTINGS, choiceKey, settingKey, MENU_KEY } from '../module/settings.ts';
import { tableSettings } from '../module/tables/tables.ts';
import { clearFoundryStubs } from './foundry-stubs.ts';

type Globals = Record<string, unknown>;
const globals = globalThis as unknown as Globals;

interface Registration {
  readonly key: string;
  readonly data: Record<string, unknown>;
}

let registered: Registration[];
let menus: Registration[];

beforeEach(() => {
  registered = [];
  menus = [];
  globals.game = {
    settings: {
      register: (_namespace: string, key: string, data: Record<string, unknown>) =>
        registered.push({ key, data }),
      registerMenu: (_namespace: string, key: string, data: Record<string, unknown>) =>
        menus.push({ key, data }),
    },
  };
});

afterEach(clearFoundryStubs);

const of = (key: string): Record<string, unknown> =>
  registered.find((entry) => entry.key === key)?.data ?? {};

const namespaces = (): string[] => {
  const seen: string[] = [];
  globals.game = {
    settings: {
      register: (namespace: string) => seen.push(namespace),
      registerMenu: (namespace: string) => seen.push(namespace),
    },
  };
  registerSettings(class {});
  return [...new Set(seen)];
};

describe('the settings the GM sees', () => {
  beforeEach(() => registerSettings(class {}));

  // The keys are the compatibility surface: a world that has already chosen keeps its choices.
  it('registers the six visible settings under the names the old registration used', () => {
    expect(registered.filter((entry) => entry.data.config === true).map((entry) => entry.key)).toEqual([
      'macroTarget',
      'critDamage',
      'damageDiceTheme',
      'panicDieTheme',
      'hideWeight',
      'autoStress',
    ]);
  });

  it('names every one of them with a key, so the translation can reach them', () => {
    for (const definition of SETTINGS) {
      expect(of(definition.key).name).toBe(`Mosh.Settings.${definition.key}.Name`);
      expect(of(definition.key).hint).toBe(`Mosh.Settings.${definition.key}.Hint`);
    }
  });

  it('labels every choice with a key too', () => {
    expect(of('macroTarget').choices).toEqual({
      character: choiceKey('macroTarget', 'character'),
      token: choiceKey('macroTarget', 'token'),
    });
    expect(Object.keys(of('critDamage').choices as object)).toEqual([
      'advantage',
      'doubleDamage',
      'doubleDice',
      'maxDamage',
      'weaponValue',
      'none',
    ]);
  });

  /**
   * `macroTarget` answers "whose sheet do my macros act on", which is a per-player preference.
   * World-scoped, the dialog that tells a *player* to change it pointed at a door only the GM
   * could open (audit RC14).
   */
  it('scopes the macro target to the client and everything else to the world', () => {
    expect(of('macroTarget').scope).toBe('client');
    for (const key of ['critDamage', 'damageDiceTheme', 'panicDieTheme', 'hideWeight', 'autoStress']) {
      expect(of(key).scope).toBe('world');
    }
  });

  it('takes every default from the module that reads the setting', () => {
    expect(of('macroTarget').default).toBe(MACRO_TARGET_DEFAULT);
    expect(of('critDamage').default).toBe(SETTING_DEFAULTS.critDamage);
    expect(of('damageDiceTheme').default).toBe(SETTING_DEFAULTS.damageDiceTheme);
    expect(of('panicDieTheme').default).toBe(SETTING_DEFAULTS.panicDieTheme);
    expect(of('autoStress').default).toBe(SETTING_DEFAULTS.autoStress);
  });

  it('registers each one with the constructor Foundry expects for its type', () => {
    expect(of('macroTarget').type).toBe(String);
    expect(of('autoStress').type).toBe(Boolean);
  });
});

describe('the hidden table settings', () => {
  beforeEach(() => registerSettings(class {}));

  // Their defaults are document ids the content pipeline minted; `test/tables.test.ts` holds
  // those to content/ids.json, so a re-minted id fails CI rather than panic rolls (audit RC13).
  it('registers the seven table ids from the table definitions', () => {
    const hidden = registered.filter((entry) => entry.data.config === false);

    expect(hidden.map((entry) => entry.key)).toEqual(tableSettings().map((table) => table.setting));
    expect(hidden.map((entry) => entry.data.default)).toEqual(tableSettings().map((table) => table.default));
    for (const entry of hidden) expect(entry.data.scope).toBe('world');
  });
});

describe('the rolltable menu', () => {
  it('opens the window it is handed, with keys for its three strings', () => {
    class Chooser {}
    registerSettings(Chooser);

    expect(menus).toHaveLength(1);
    expect(menus[0].key).toBe(MENU_KEY);
    expect(menus[0].data.type).toBe(Chooser);
    expect(menus[0].data.name).toBe(settingKey(MENU_KEY, 'Name'));
    expect(menus[0].data.label).toBe(settingKey(MENU_KEY, 'Label'));
    expect(menus[0].data.hint).toBe(settingKey(MENU_KEY, 'Hint'));
  });

  // The window is the UI layer's; this module knows only that it was passed one.
  it('registers no menu when it is given no window', () => {
    registerSettings();
    expect(menus).toEqual([]);
    expect(registered.length).toBeGreaterThan(0);
  });
});

it('registers everything under the one namespace that identifies the package', () => {
  expect(namespaces()).toEqual(['mothershiprpg']);
});

it('does nothing at all outside Foundry', () => {
  delete globals.game;
  expect(() => registerSettings(class {})).not.toThrow();
});

it('registers no log-only onChange handlers', () => {
  registerSettings(class {});
  expect(registered.filter((entry) => entry.data.onChange !== undefined)).toEqual([]);
});
