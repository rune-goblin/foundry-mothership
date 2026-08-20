import { MACRO_TARGET_CHOICES, MACRO_TARGET_DEFAULT, MACRO_TARGET_KEY } from './api/api.ts';
import { SYSTEM_ID } from './chat/cards.ts';
import { CRIT_DAMAGE_CHOICES, SETTING_DEFAULTS } from './checks/settings.ts';
import { tableSettings } from './tables/tables.ts';

export type SettingScope = 'world' | 'client';

export interface SettingDefinition {
  readonly key: string;
  readonly scope: SettingScope;
  readonly type: 'string' | 'boolean';
  readonly default: string | boolean;
  /** The values a dropdown offers; each is labelled by its own key. */
  readonly choices?: readonly string[];
}

/** The item list hides the weight column by default — the mechanic is optional (PSG 26). */
export const HIDE_WEIGHT_DEFAULT = true;

export const SETTINGS: readonly SettingDefinition[] = [
  {
    // Client-scoped, unlike the rest: it's a per-player preference (whose sheet a player's
    // macros act on), not a world rule.
    key: MACRO_TARGET_KEY,
    scope: 'client',
    type: 'string',
    default: MACRO_TARGET_DEFAULT,
    choices: MACRO_TARGET_CHOICES,
  },
  {
    key: 'critDamage',
    scope: 'world',
    type: 'string',
    default: SETTING_DEFAULTS.critDamage,
    choices: CRIT_DAMAGE_CHOICES,
  },
  { key: 'damageDiceTheme', scope: 'world', type: 'string', default: SETTING_DEFAULTS.damageDiceTheme },
  { key: 'panicDieTheme', scope: 'world', type: 'string', default: SETTING_DEFAULTS.panicDieTheme },
  { key: 'hideWeight', scope: 'world', type: 'boolean', default: HIDE_WEIGHT_DEFAULT },
  { key: 'autoStress', scope: 'world', type: 'boolean', default: SETTING_DEFAULTS.autoStress },
  {
    key: 'autoRollDamagePlayers',
    scope: 'world',
    type: 'boolean',
    default: SETTING_DEFAULTS.autoRollDamagePlayers,
  },
  {
    key: 'autoRollDamageCreatures',
    scope: 'world',
    type: 'boolean',
    default: SETTING_DEFAULTS.autoRollDamageCreatures,
  },
];

/** The menu that opens the rolltable chooser; the window itself is the UI layer's. */
export const MENU_KEY = 'rolltableSelector';

export function settingKey(key: string, part: 'Name' | 'Hint' | 'Label'): string {
  return `Mothership.Settings.${key}.${part}`;
}

export function choiceKey(key: string, choice: string): string {
  return `Mothership.Settings.${key}.Choices.${choice}`;
}

function labelled(definition: SettingDefinition): Record<string, string> | undefined {
  if (definition.choices === undefined) return undefined;
  return Object.fromEntries(definition.choices.map((choice) => [choice, choiceKey(definition.key, choice)]));
}

const CONSTRUCTORS = { string: String, boolean: Boolean } as const;

interface SettingsRegistrar {
  register(namespace: string, key: string, data: object): unknown;
  registerMenu(namespace: string, key: string, data: object): unknown;
}

declare const game: { readonly settings?: SettingsRegistrar } | undefined;

/** The window class the menu opens. `init.ts` passes it: this module imports no UI. */
export type MenuApplication = new (...args: never[]) => object;

export function registerSettings(menu: MenuApplication | null = null): void {
  if (typeof game === 'undefined') return;
  const settings = game?.settings;
  if (settings === undefined) return;

  for (const definition of SETTINGS) {
    settings.register(SYSTEM_ID, definition.key, {
      name: settingKey(definition.key, 'Name'),
      hint: settingKey(definition.key, 'Hint'),
      scope: definition.scope,
      config: true,
      type: CONSTRUCTORS[definition.type],
      default: definition.default,
      ...(definition.choices === undefined ? {} : { choices: labelled(definition) }),
    });
  }

  if (menu !== null) {
    settings.registerMenu(SYSTEM_ID, MENU_KEY, {
      name: settingKey(MENU_KEY, 'Name'),
      label: settingKey(MENU_KEY, 'Label'),
      hint: settingKey(MENU_KEY, 'Hint'),
      icon: 'fa-solid fa-list',
      type: menu,
    });
  }

  // The seven table ids: not shown in the settings window, because the menu above edits them.
  for (const table of tableSettings()) {
    settings.register(SYSTEM_ID, table.setting, {
      scope: 'world',
      config: false,
      type: String,
      default: table.default,
    });
  }
}
