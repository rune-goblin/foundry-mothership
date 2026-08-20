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

/** Stored widened; `registerChatAction` ties the verb to its key, so the widening holds for every entry that gets in. */
const HANDLERS: Partial<Record<ActionVerb, StoredHandler>> = {};

export function registerChatAction<V extends ActionVerb>(verb: V, handler: ActionHandler<V>): void {
  HANDLERS[verb] = handler as unknown as StoredHandler;
}

export function clearChatActions(): void {
  for (const verb of Object.keys(HANDLERS) as ActionVerb[]) delete HANDLERS[verb];
}

declare const ui: { readonly notifications?: { warn(message: string): unknown } } | undefined;

function unavailable(): void {
  if (typeof ui === 'undefined') return;
  ui?.notifications?.warn(localize('Mothership.Chat.ActionUnavailable'));
}

/** Exported because a dialog reaches the same services a button does. */
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
  // Stops the click from also being read as clicking the chat message it sits inside.
  event.stopPropagation();
  runChatAction(parsed.action, { event, button });
}

/** Verbs that belong to the card rather than whoever clicks it; every other verb targets the clicking player's own character. */
const CARD_OWNED: ReadonlySet<ActionVerb> = new Set<ActionVerb>(['damage']);

/** Disables the button rather than relying on the click handler alone — a pressable button that does nothing reads as broken. */
export function guardCardActions(root: ParentNode, owns: boolean): void {
  if (owns) return;

  for (const button of root.querySelectorAll<HTMLButtonElement>(`[data-action="${ACTION_ATTRIBUTE}"]`)) {
    const parsed = parseAction(button.dataset.mothershipAction ?? '');
    if (!parsed.ok || !CARD_OWNED.has(parsed.action.verb)) continue;
    button.disabled = true;
    button.title = localize('Mothership.Errors.NotYourCard');
  }
}

/** `onClick` is one function for the module's lifetime, so binding the same root twice adds nothing — safe to call on every render. */
export function bindChatActions(root: EventTarget): void {
  root.addEventListener('click', onClick as EventListener);
}

export function unbindChatActions(root: EventTarget): void {
  root.removeEventListener('click', onClick as EventListener);
}
