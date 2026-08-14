/**
 * Foundry's localizer, reached through one module so the runtime has a single place that knows a
 * user-visible string is a `Mothership.*` key. Outside Foundry — the unit tier — the key comes back
 * unchanged, which is what an untranslated string should look like: visible, not invented.
 */

interface Localization {
  localize(key: string): string;
  format(key: string, data: Record<string, string | number>): string;
  has(key: string, fallback?: boolean): boolean;
}

declare const game: { readonly i18n?: Localization } | undefined;

function localizer(): Localization | null {
  return typeof game === 'undefined' ? null : (game?.i18n ?? null);
}

export function localize(key: string): string {
  return localizer()?.localize(key) ?? key;
}

export function format(key: string, data: Record<string, string | number>): string {
  return localizer()?.format(key, data) ?? key;
}

/** Whether the lang files carry this key at all, English fallback included. */
export function has(key: string): boolean {
  return localizer()?.has(key, true) ?? false;
}
