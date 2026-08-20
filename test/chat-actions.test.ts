// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  bindChatActions,
  clearChatActions,
  guardCardActions,
  registerChatAction,
  runChatAction,
  unbindChatActions,
} from '../module/chat/actions.ts';
import { actionButton, parseAction, type ChatAction } from '../module/chat/enrichers.ts';
import { clearFoundryStubs, installI18n } from './foundry-stubs.ts';

const action = (text: string): ChatAction => {
  const result = parseAction(text);
  if (!result.ok) throw new Error(text);
  return result.action;
};

function log(text: string): HTMLElement {
  const root = document.createElement('div');
  root.append(actionButton(action(text)));
  document.body.replaceChildren(root);
  bindChatActions(root);
  return root;
}

beforeEach(clearChatActions);

afterEach(() => {
  unbindChatActions(document.body);
  document.body.replaceChildren();
  clearFoundryStubs();
});

describe('bindChatActions', () => {
  it('routes a click to the handler that claimed the verb', () => {
    const check = vi.fn();
    const gain = vi.fn();
    registerChatAction('check', check);
    registerChatAction('gain', gain);

    const root = log('@Check[fear -]');
    root.querySelector('button')?.click();

    expect(check).toHaveBeenCalledTimes(1);
    expect(check.mock.calls[0][0]).toEqual(action('@Check[fear -]'));
    expect(gain).not.toHaveBeenCalled();
  });

  // The button carries the expression, not a bag of attributes: what content wrote and what the
  // click runs go through the same parser, so the two cannot describe different actions.
  it('reads the action back out of the element the enricher wrote', () => {
    const apply = vi.fn();
    registerChatAction('apply', apply);

    log('@Apply[bleeding 2]').querySelector('button')?.click();

    expect(apply).toHaveBeenCalledWith(
      { verb: 'apply', condition: 'bleeding', count: 2 },
      expect.objectContaining({ button: expect.any(HTMLElement) }),
    );
  });

  it('answers a click on anything inside the button', () => {
    const table = vi.fn();
    registerChatAction('table', table);

    const root = log('@Table[gunshot]');
    root.querySelector('button i')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(table).toHaveBeenCalledTimes(1);
  });

  it('ignores a click on anything else', () => {
    const check = vi.fn();
    registerChatAction('check', check);

    const root = log('@Check[body]');
    root.click();

    expect(check).not.toHaveBeenCalled();
  });

  // R3 fills the check entry. Until it does, the button says so rather than doing nothing.
  it('reports a verb nobody has claimed', () => {
    installI18n({ 'Mothership.Chat.ActionUnavailable': 'That action is not available yet.' });
    const warn = vi.fn();
    (globalThis as Record<string, unknown>).ui = { notifications: { warn } };

    log('@Check[fear]').querySelector('button')?.click();

    expect(warn).toHaveBeenCalledWith('That action is not available yet.');
  });

  it('lets a handler return nothing without being read as unhandled', () => {
    installI18n({});
    const warn = vi.fn();
    (globalThis as Record<string, unknown>).ui = { notifications: { warn } };
    registerChatAction('gain', () => undefined);

    runChatAction(action('@Gain[stress 1]'), {
      event: new MouseEvent('click'),
      button: document.createElement('button'),
    });

    expect(warn).not.toHaveBeenCalled();
  });

  it('stops listening when unbound', () => {
    const gain = vi.fn();
    registerChatAction('gain', gain);

    const root = log('@Gain[stress 1]');
    unbindChatActions(root);
    root.querySelector('button')?.click();

    expect(gain).not.toHaveBeenCalled();
  });
});

// Disabling the other verbs would stop a player rolling their own Fear Save off a card someone
// else posted.
describe('guardCardActions', () => {
  const card = (...expressions: string[]) => {
    const root = document.createElement('div');
    for (const text of expressions) root.append(actionButton(action(text)));
    return root;
  };

  const disabled = (root: HTMLElement) =>
    [...root.querySelectorAll('button')].map((button) => button.disabled);

  it('disables a damage button on a card this user does not own', () => {
    installI18n({ 'Mothership.Errors.NotYourCard': 'That roll is not yours to make.' });
    const root = card('@Damage[4d10]');

    guardCardActions(root, false);

    expect(disabled(root)).toEqual([true]);
    expect(root.querySelector('button')?.title).toBe('That roll is not yours to make.');
  });

  it('leaves every other verb pressable, because those act on whoever clicked them', () => {
    installI18n({});
    const root = card('@Check[fear -]', '@Table[gunshot]', '@Gain[stress 1]', '@Apply[coward]');

    guardCardActions(root, false);

    expect(disabled(root)).toEqual([false, false, false, false]);
  });

  it('leaves the damage button alone on a card this user does own', () => {
    installI18n({});
    const root = card('@Damage[4d10]');

    guardCardActions(root, true);

    expect(disabled(root)).toEqual([false]);
  });
});
