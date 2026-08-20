// Installers merge into the same game/foundry globals, so a spec can install only
// the pieces its flow touches without one installer wiping another.

type Globals = Record<string, unknown>;

export interface RolledDie {
  readonly faces: number;
  readonly result: number;
}

function branch(root: Globals, key: string): Globals {
  if (typeof root[key] !== 'object' || root[key] === null) root[key] = {};
  return root[key] as Globals;
}

function gameStub(): Globals {
  return branch(globalThis as Globals, 'game');
}

function foundryStub(): Globals {
  return branch(globalThis as Globals, 'foundry');
}

/** Mimics `game.i18n.format`'s `{key}` substitution. */
function interpolate(template: string, data: Record<string, string | number>): string {
  return Object.entries(data).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

export function installI18n(entries: Record<string, string> = {}): void {
  gameStub().i18n = {
    localize: (key: string) => entries[key] ?? key,
    format: (key: string, data: Record<string, string | number>) => interpolate(entries[key] ?? key, data),
    has: (key: string) => Object.hasOwn(entries, key),
  };
  gameStub().user = { id: 'user1' };
}

export function installSettings(values: Record<string, unknown>): void {
  gameStub().settings = { get: (_namespace: string, key: string) => values[key] };
}

export interface RollLog {
  readonly formulas: string[];
  readonly messages: object[];
}

// Total must match Foundry's kh/kl arithmetic: a pool keeps one die, so summing
// them all would make `{1d100,1d100}kl` report 130 instead of the kept die.
export function installRoll(dice: readonly RolledDie[]): RollLog {
  const log: RollLog = { formulas: [], messages: [] };
  const results = dice.map((die) => die.result);

  const total = (formula: string): number => {
    if (results.length === 0) return 0;
    const keep = /\}k(h|l)/.exec(formula);
    if (keep === null) return results.reduce((sum, result) => sum + result, 0);
    return keep[1] === 'h' ? Math.max(...results) : Math.min(...results);
  };

  (globalThis as Globals).Roll = class {
    #formula: string;

    constructor(formula: string) {
      this.#formula = formula;
      log.formulas.push(formula);
    }

    async evaluate() {
      const formula = this.#formula;
      return {
        total: total(formula),
        dice: dice.map((die) => ({ faces: die.faces, results: [{ result: die.result }] })),
        toMessage: async (data: object) => {
          log.messages.push(data);
          return data;
        },
      };
    }
  };

  return log;
}

export interface PostedCard {
  readonly template: string;
  readonly data: Record<string, unknown>;
}

export interface ChatLog {
  readonly cards: PostedCard[];
  readonly created: object[];
}

export function installChat(): ChatLog {
  const log: ChatLog = { cards: [], created: [] };

  branch(foundryStub(), 'applications').handlebars = {
    renderTemplate: async (template: string, data: Record<string, unknown>) => {
      log.cards.push({ template, data });
      return `<card>${template}</card>`;
    },
  };
  branch(branch(foundryStub(), 'applications'), 'ux').TextEditor = {
    implementation: { enrichHTML: async (html: string) => `enriched:${html}` },
  };

  (globalThis as Globals).ChatMessage = {
    create: async (data: object) => {
      log.created.push(data);
      return data;
    },
    applyMode: (data: object) => data,
  };

  return log;
}

export interface DialogButtonStub {
  action: string;
  label: string;
  icon?: string;
  class?: string;
  default?: boolean;
  callback: () => unknown;
}

export interface OpenDialog {
  readonly title: string;
  readonly classes: readonly string[];
  readonly buttons: DialogButtonStub[];
  readonly element: HTMLElement;
  press(action: string): Promise<void>;
  dismiss(): void;
  render(): void;
}

interface DialogConfig {
  window: { title: string };
  classes?: readonly string[];
  content: string;
  buttons: DialogButtonStub[];
  render?: (event: unknown, dialog: { element: HTMLElement }) => void;
  close?: (event: unknown, dialog: { element: HTMLElement }) => unknown;
}

// Matches DialogV2.wait: a button's callback result is the answer, and a dismissal
// answers whatever `close` returned, or null if it returned nothing. Needs jsdom.
export function installDialogV2(): OpenDialog[] {
  const opened: OpenDialog[] = [];

  branch(foundryStub(), 'applications').api = {
    DialogV2: {
      wait: (config: DialogConfig) =>
        new Promise((resolve) => {
          const element = document.createElement('div');
          element.innerHTML = config.content;
          document.body.append(element);
          const dialog = { element };

          const finish = (result: unknown): void => {
            const closed = config.close?.({}, dialog);
            resolve(result === undefined ? (closed ?? null) : result);
          };

          opened.push({
            title: config.window.title,
            classes: config.classes ?? [],
            buttons: config.buttons,
            element,
            press: async (action: string) => {
              const button = config.buttons.find((entry) => entry.action === action);
              if (button === undefined) throw new Error(`no button ${action}`);
              finish(await button.callback());
            },
            dismiss: () => finish(undefined),
            render: () => config.render?.({}, dialog),
          });

          config.render?.({}, dialog);
          // ApplicationV2 renders more than once over a dialog's life.
          config.render?.({}, dialog);
        }),
    },
  };

  return opened;
}

export function installPacks(packs: Record<string, readonly object[]>): void {
  gameStub().packs = {
    get: (id: string) =>
      packs[id] === undefined ? undefined : { getDocuments: async () => [...packs[id]] },
  };
}

export interface Notifications {
  readonly errors: string[];
  readonly warnings: string[];
}

export function installNotifications(): Notifications {
  const log: Notifications = { errors: [], warnings: [] };
  (globalThis as Globals).ui = {
    notifications: {
      error: (message: string) => log.errors.push(message),
      warn: (message: string) => log.warnings.push(message),
    },
  };
  return log;
}

export function clearFoundryStubs(): void {
  delete (globalThis as Globals).game;
  delete (globalThis as Globals).Roll;
  delete (globalThis as Globals).ui;
  delete (globalThis as Globals).ChatMessage;
  delete (globalThis as Globals).foundry;
  delete (globalThis as Globals).CONFIG;
}
