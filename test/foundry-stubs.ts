/**
 * The two Foundry globals the new runtime reaches for at call time: the localizer and `Roll`.
 * Stubbing them here keeps every spec asserting on `Mosh.*` keys rather than on English, which is
 * the point of routing user-visible strings through `i18n.ts` in the first place.
 */

type Globals = Record<string, unknown>;

export interface RolledDie {
  readonly faces: number;
  readonly result: number;
}

/** Reads a `{key}` template the way `game.i18n.format` does, so specs see the data substituted. */
function interpolate(template: string, data: Record<string, string | number>): string {
  return Object.entries(data).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

export function installI18n(entries: Record<string, string> = {}): void {
  (globalThis as Globals).game = {
    i18n: {
      localize: (key: string) => entries[key] ?? key,
      format: (key: string, data: Record<string, string | number>) =>
        interpolate(entries[key] ?? key, data),
      has: (key: string) => Object.hasOwn(entries, key),
    },
  };
}

export interface RollLog {
  readonly formulas: string[];
}

/** Every `new Roll(...)` returns the same prepared dice; the formulas it was asked for are kept. */
export function installRoll(dice: readonly RolledDie[]): RollLog {
  const log: RollLog = { formulas: [] };
  const total = dice.reduce((sum, die) => sum + die.result, 0);

  (globalThis as Globals).Roll = class {
    constructor(formula: string) {
      log.formulas.push(formula);
    }

    async evaluate() {
      return {
        total,
        dice: dice.map((die) => ({ faces: die.faces, results: [{ result: die.result }] })),
        toMessage: async (data: object) => data,
      };
    }
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
