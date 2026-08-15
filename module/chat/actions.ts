/**
 * One delegated listener for every button an enricher renders — in chat, on a sheet, anywhere
 * enriched text lands. The button carries the expression it was written as, so a click parses it
 * back with the same parser that produced it: one grammar, read in both directions.
 *
 * The handlers live in a registry rather than here. This module knows how a click becomes a typed
 * `ChatAction`; what a check *does* is `checks/`'s answer (R3) and what it does it *to* is the
 * API's target resolution (R4). An action nobody has registered says so — it never fails silently.
 */

import { localize } from '../i18n.ts';
import { parseAction, ACTION_ATTRIBUTE, type ActionVerb, type ChatAction } from './enrichers.ts';

export interface ActionContext {
  readonly event: MouseEvent;
  readonly button: HTMLElement;
}

export type ActionHandler<V extends ActionVerb> = (
  action: Extract<ChatAction, { verb: V }>,
  context: ActionContext,
) => unknown;

type StoredHandler = (action: ChatAction, context: ActionContext) => unknown;

/** Inside the registry a handler is stored widened; `registerChatAction` is what ties the
 * handler's verb to its key, so the widening holds for every entry that gets in. */
const HANDLERS: Partial<Record<ActionVerb, StoredHandler>> = {};

/**
 * Claim a verb. `init.ts` registers all four at boot; the check entry is R3's, and until it is
 * filled a `@Check` button reports that rather than doing nothing.
 */
export function registerChatAction<V extends ActionVerb>(verb: V, handler: ActionHandler<V>): void {
  HANDLERS[verb] = handler as unknown as StoredHandler;
}

/** Test seam and reload guard: registration is a boot step, so it must be repeatable. */
export function clearChatActions(): void {
  for (const verb of Object.keys(HANDLERS) as ActionVerb[]) delete HANDLERS[verb];
}

declare const ui: { readonly notifications?: { warn(message: string): unknown } } | undefined;

function unavailable(): void {
  if (typeof ui === 'undefined') return;
  ui?.notifications?.warn(localize('Mothership.Chat.ActionUnavailable'));
}

/** Run one action. Exported because a dialog reaches the same services a button does. */
export function runChatAction(action: ChatAction, context: ActionContext): unknown {
  const handler = HANDLERS[action.verb];
  if (handler === undefined) return unavailable();
  return handler(action, context);
}

function onClick(event: MouseEvent): void {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const button = target.closest<HTMLElement>(`[data-action="${ACTION_ATTRIBUTE}"]`);
  if (button === null) return;

  const parsed = parseAction(button.dataset.mothershipAction ?? '');
  if (!parsed.ok) return;

  event.preventDefault();
  // A button inside a chat card sits inside the chat log's own click handling; stopping here
  // keeps a system action from also counting as clicking the message.
  event.stopPropagation();
  runChatAction(parsed.action, { event, button });
}

/**
 * Bind the listener to a root — the chat log, or any element enriched text was rendered into.
 * `onClick` is one function for the module's lifetime, so binding the same root twice adds
 * nothing: a hook that fires on every render can call this every time.
 */
export function bindChatActions(root: EventTarget): void {
  root.addEventListener('click', onClick as EventListener);
}

export function unbindChatActions(root: EventTarget): void {
  root.removeEventListener('click', onClick as EventListener);
}
