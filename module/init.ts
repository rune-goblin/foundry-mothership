/**
 * Boot. Hooks and registration, nothing else: this module imports downward and exports only the
 * handlers it registers, so importing it is what wires the system up and nothing else can pull a
 * registration in by accident. Legacy's entry was the boot script, the public API, a dialog, a
 * document resolver and a number formatter at once, and `actor.js` imported it back — a cycle that
 * worked by hoisting accident (audit RC7).
 *
 * Nothing here decides anything about the game. Every handler is a call into a service.
 */

import { compare } from './compare.js';
import { ACTOR_MODELS } from './data/actor-models.js';
import { ITEM_MODELS } from './data/item-models.js';
import { MothershipCharacterSheet } from './ui/actor/CharacterSheetApp.js';
import { MothershipCreatureSheet } from './ui/creature/CreatureSheetApp.js';
import { MothershipClassSheet } from './ui/class/ClassSheetApp.js';
import { MothershipItemSheet } from './ui/item/ItemSheetApp.js';
import { MothershipSkillSheet } from './ui/skill/SkillSheetApp.js';
import { RolltableConfigApp } from './ui/settings/RolltableConfigApp.js';

import { NEW_API, registerActions } from './api/api.ts';
import { LEGACY_API } from './api/legacy.ts';
import { bindChatActions, guardCardActions } from './chat/actions.ts';
import { ownsCard, SYSTEM_ID, type CardMessage } from './chat/cards.ts';
import { registerEnrichers } from './chat/enrichers.ts';
import { SETTING_DEFAULTS } from './checks/settings.ts';
import { debug } from './debug.ts';
import { CHARACTER, CREATURE, MothershipActor } from './documents/actor.ts';
import { MothershipItem } from './documents/item.ts';
import { localize } from './i18n.ts';
import { lookup } from './lookup.ts';
import { registerSettings } from './settings.ts';

declare const Hooks: {
  once(hook: string, handler: (...args: never[]) => unknown): unknown;
  on(hook: string, handler: (...args: never[]) => unknown): unknown;
};

declare const CONFIG: Record<string, Record<string, unknown>>;

declare const CONST: {
  readonly TOKEN_DISPOSITIONS: Record<'HOSTILE' | 'NEUTRAL' | 'FRIENDLY', number>;
  readonly TOKEN_DISPLAY_MODES: Record<'OWNER_HOVER', number>;
};

declare const Handlebars: { registerHelper(name: string, helper: unknown): unknown };

declare const foundry: {
  readonly documents: {
    readonly collections: {
      readonly Actors: SheetRegistry;
      readonly Items: SheetRegistry;
    };
  };
  readonly appv1?: { readonly sheets: { readonly ActorSheet: unknown; readonly ItemSheet: unknown } };
};

declare const game: {
  readonly macros?: { find(predicate: (macro: MacroDocument) => boolean): MacroDocument | undefined };
  readonly user?: { assignHotbarMacro(macro: unknown, slot: number): unknown };
} & Record<string, unknown>;

declare const Macro: { create(data: object): Promise<MacroDocument | undefined> };

declare const ui: { readonly notifications?: { warn(message: string): unknown } } | undefined;

interface SheetRegistry {
  registerSheet(namespace: string, sheet: unknown, options: object): unknown;
  unregisterSheet(namespace: string, sheet: unknown): unknown;
}

interface MacroDocument {
  readonly name: string;
  readonly command?: string;
}

/** PSG 24 — everything is settled on the percentile die, initiative included. */
const INITIATIVE = { formula: '1d100', decimals: 2 };

/**
 * The token bars a new actor gets. `TokenDocument#getBarAttribute` resolves the path against
 * `actor.system`, so these are bare — the old hook wrote `system.health` with a comment claiming
 * the opposite, and every actor created since has had two dead bars (audit RC1).
 */
export const TOKEN_BARS = { bar1: 'health', bar2: 'hits' } as const;

/** The three Dice So Nice colorsets, named by the settings that select them (audit RC15). */
export const DICE_COLORSETS = [
  {
    name: 'roll',
    description: 'Mothership.Dice.Roll',
    foreground: '#FFFFFF',
    background: '#262626',
    material: 'none',
  },
  {
    name: SETTING_DEFAULTS.damageDiceTheme,
    description: 'Mothership.Dice.Damage',
    foreground: '#FFFFFF',
    background: '#cc2828',
    material: 'none',
  },
  {
    name: SETTING_DEFAULTS.panicDieTheme,
    description: 'Mothership.Dice.Panic',
    foreground: '#000000',
    background: '#FFF200',
    material: 'metal',
  },
] as const;

const DICE_CATEGORY = 'Mothership';

interface Dice3d {
  addColorset(colorset: object): unknown;
}

function registerDocuments(): void {
  CONFIG.Combat.initiative = INITIATIVE;
  CONFIG.Actor.documentClass = MothershipActor;
  CONFIG.Item.documentClass = MothershipItem;
  // A registered DataModel takes precedence over template.json, which v16 removes.
  CONFIG.Actor.dataModels = ACTOR_MODELS;
  CONFIG.Item.dataModels = ITEM_MODELS;
}

function registerSheets(): void {
  const { Actors, Items } = foundry.documents.collections;

  // The v1 namespace is deprecated for removal in v16, when dereferencing it would kill boot.
  const v1 = foundry.appv1;
  if (v1 !== undefined) {
    Actors.unregisterSheet('core', v1.sheets.ActorSheet);
    Items.unregisterSheet('core', v1.sheets.ItemSheet);
  }

  Actors.registerSheet(SYSTEM_ID, MothershipCharacterSheet, { types: [CHARACTER], makeDefault: true });
  Actors.registerSheet(SYSTEM_ID, MothershipCreatureSheet, { types: [CREATURE], makeDefault: true });
  Items.registerSheet(SYSTEM_ID, MothershipClassSheet, { types: ['class'], makeDefault: true });
  Items.registerSheet(SYSTEM_ID, MothershipSkillSheet, { types: ['skill'], makeDefault: true });
  Items.registerSheet(SYSTEM_ID, MothershipItemSheet, {
    types: ['item', 'weapon', 'armor', 'ability', 'condition'],
    makeDefault: true,
  });
}

export function onInit(): void {
  game[SYSTEM_ID] = { ...NEW_API, ...LEGACY_API };
  registerSettings(RolltableConfigApp);
  registerDocuments();
  registerSheets();
  registerEnrichers();
  registerActions();
  // The chat cards are the one place Handlebars survives, and `compare` is the one helper they use.
  Handlebars.registerHelper('compare', compare);
  debug('init', 'registered');
}

/** Late, so a module that wants the drop first can register earlier. */
export function onReady(): void {
  Hooks.on('hotbarDrop', onHotbarDrop as (...args: never[]) => unknown);
}

export function onDiceSoNiceReady(dice3d: Dice3d): void {
  for (const colorset of DICE_COLORSETS) {
    dice3d.addColorset({
      ...colorset,
      description: localize(colorset.description),
      category: DICE_CATEGORY,
      outline: 'none',
      texture: 'none',
      font: 'Arial',
    });
  }
}

interface CreatedActor {
  readonly name?: string;
  updateSource(data: Record<string, unknown>): unknown;
}

export function onPreCreateActor(document: CreatedActor, createData: { type?: string; name?: string }): void {
  const type = createData?.type;
  const { HOSTILE, NEUTRAL, FRIENDLY } = CONST.TOKEN_DISPOSITIONS;
  const character = type === CHARACTER;

  document.updateSource({
    'prototypeToken.bar1.attribute': TOKEN_BARS.bar1,
    'prototypeToken.bar2.attribute': TOKEN_BARS.bar2,
    'prototypeToken.displayName': CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
    'prototypeToken.displayBars': CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
    'prototypeToken.disposition': type === CREATURE ? HOSTILE : character ? FRIENDLY : NEUTRAL,
    'prototypeToken.name': createData?.name ?? document.name ?? '',
    ...(character
      ? {
          'prototypeToken.actorLink': true,
          // `vision` was replaced by this in v10; the schema discarded the old key silently (RC1).
          'prototypeToken.sight.enabled': true,
        }
      : {}),
  });
}

/**
 * Per **message**, not per chat log. Foundry renders a card twice — the sidebar's copy, and a
 * second one `#postNotification` puts in the notification element over the canvas, which is not
 * inside the log. A listener on the log left every button in that copy dead, and that copy is what
 * a player with a collapsed sidebar clicks. Binding twice adds nothing: it is the same function.
 */
export function onRenderChatMessage(message: CardMessage, element: HTMLElement): void {
  bindChatActions(element);
  guardCardActions(element, ownsCard(message, game?.user));
}

interface DropData {
  readonly type?: string;
  readonly uuid?: string;
}

export function onHotbarDrop(_bar: unknown, data: DropData, slot: number): boolean | undefined {
  if (data?.type !== 'Item') return undefined;
  void createItemMacro(data, slot);
  return false;
}

interface DroppedItem {
  readonly name: string;
  readonly img: string;
}

/**
 * The macro a dropped item becomes. Legacy rebuilt the actor by splitting the UUID on dots and
 * assuming an `Actor.<id>.Item.<id>` shape — a token actor's item threw — and placed its "you can
 * only do this with owned items" warning after the expression that had already thrown (audit RC4).
 */
export async function createItemMacro(data: DropData, slot: number): Promise<void> {
  const found = await lookup<DroppedItem>(data.uuid ?? '', 'Item');
  if (!found.found) {
    if (typeof ui !== 'undefined') ui?.notifications?.warn(localize('Mothership.Errors.ItemMacroNotOwned'));
    return;
  }

  const item = found.document;
  const command = `game.${SYSTEM_ID}.rollItem(${JSON.stringify(item.name)});`;
  const existing = game.macros?.find((macro) => macro.name === item.name && macro.command === command);
  const macro =
    existing ??
    (await Macro.create({
      name: item.name,
      type: 'script',
      img: item.img,
      command,
      flags: { [SYSTEM_ID]: { itemMacro: true } },
    }));

  if (macro !== undefined) game.user?.assignHotbarMacro(macro, slot);
}

Hooks.once('init', onInit);
Hooks.once('ready', onReady);
Hooks.once('diceSoNiceReady', onDiceSoNiceReady as (...args: never[]) => unknown);
Hooks.on('preCreateActor', onPreCreateActor as (...args: never[]) => unknown);
Hooks.on('renderChatMessageHTML', onRenderChatMessage as (...args: never[]) => unknown);
