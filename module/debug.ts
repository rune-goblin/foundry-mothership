/**
 * The one logger. Legacy narrates every roll, dialog exit and API call to the console
 * unconditionally — 47 `console.log` sites between `actor.js` and `mosh.js` (audit F26, RC12) —
 * so a production console fills with internal state while real errors have nowhere to go.
 *
 * Here nothing prints unless a developer asks for it: `CONFIG.debug.mothershiprpg = true` in the
 * console opens the channel, the way Foundry's own `CONFIG.debug.hooks` works. A deprecation is
 * the exception — it is addressed to whoever wrote the macro, so it says so once per name, and
 * every later call is a debug line.
 */

import { SYSTEM_ID } from './chat/cards.ts';

declare const CONFIG: { readonly debug?: Record<string, unknown> } | undefined;

function enabled(): boolean {
  if (typeof CONFIG === 'undefined') return false;
  return CONFIG?.debug?.[SYSTEM_ID] === true;
}

export function debug(channel: string, message: string, data?: unknown): void {
  if (!enabled()) return;
  const line = `${SYSTEM_ID} | ${channel} | ${message}`;
  if (data === undefined) console.debug(line);
  else console.debug(line, data);
}

const announced = new Set<string>();

export function deprecated(used: string, instead: string): void {
  debug('deprecated', `${used} → ${instead}`);
  if (announced.has(used)) return;
  announced.add(used);
  console.warn(`${SYSTEM_ID} | ${used} is deprecated. Call ${instead} instead.`);
}

/** Test seam: the once-per-name rule makes the notice stateful, so a spec can start over. */
export function clearDeprecations(): void {
  announced.clear();
}
