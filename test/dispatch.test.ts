import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { clearDispatch, dispatch, initDispatch, registerDispatch } from '../module/dispatch/dispatch.ts';
import { clearFoundryStubs } from './foundry-stubs.ts';

type Globals = Record<string, unknown>;

const CHANNEL = 'system.mothershiprpg';

/** Every message this client put on the wire, newest last. */
let sent: Record<string, unknown>[] = [];

/** The module's own socket listener, captured the once `initDispatch` binds it. */
let deliver: (message: unknown) => void = () => undefined;

const CONNECTED = ['gm', 'gm2', 'player'];

/**
 * Who this client is right now. The module reads `game` at call time, so swapping it is how one
 * test plays both ends of the wire.
 */
function asClient(id: string, activeGM: string | null = 'gm'): void {
  (globalThis as Globals).game = {
    user: { id },
    users: {
      get: (user: string) => (CONNECTED.includes(user) ? { id: user, active: true } : undefined),
      activeGM: activeGM === null ? null : { id: activeGM },
    },
    socket: {
      on: (channel: string, handler: (message: unknown) => void) => {
        if (channel === CHANNEL) deliver = handler;
      },
      emit: (_channel: string, message: unknown) => sent.push(message as Record<string, unknown>),
    },
  };
  (globalThis as Globals).foundry = { utils: { randomID: () => 'req1' } };
  initDispatch();
}

const lastSent = () => sent.at(-1) ?? {};

beforeEach(() => {
  sent = [];
  clearDispatch();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  clearDispatch();
  clearFoundryStubs();
});

describe('dispatching to the Warden', () => {
  it('runs the handler here when this client is the Warden', async () => {
    asClient('gm');
    const handler = vi.fn(async () => 'done');
    registerDispatch('harm', handler);

    expect(await dispatch<string>('harm', { a: 1 })).toEqual({ kind: 'ran', result: 'done' });
    expect(handler).toHaveBeenCalledWith({ a: 1 }, 'gm');
    // Nothing went on the wire: the Warden had no one to ask.
    expect(sent).toEqual([]);
  });

  it('asks the Warden when this client is not one', async () => {
    asClient('player');
    registerDispatch('harm', vi.fn());

    void dispatch('harm', { uuid: 'Token.t1' });

    expect(lastSent()).toMatchObject({
      kind: 'request',
      action: 'harm',
      data: { uuid: 'Token.t1' },
      senderId: 'player',
      requestId: 'req1',
    });
  });

  it('reports no Warden rather than waiting for one', async () => {
    asClient('player', null);
    registerDispatch('harm', vi.fn());

    expect(await dispatch('harm', {})).toEqual({ kind: 'no-gm' });
    expect(sent).toEqual([]);
  });

  it('gives up on a Warden that never answers', async () => {
    asClient('player');
    registerDispatch('harm', vi.fn());

    const pending = dispatch('harm', {});
    await vi.advanceTimersByTimeAsync(10_000);

    expect(await pending).toEqual({ kind: 'timeout' });
  });
});

describe('the wire between them', () => {
  it('carries a player’s request to the Warden and the answer back', async () => {
    asClient('player');
    const handler = vi.fn(async (data: unknown, senderId: string) => ({ data, senderId }));
    registerDispatch('harm', handler);

    const pending = dispatch('harm', { uuid: 'Token.t1' });
    const request = lastSent();

    // The Warden's client receives it, runs it, and replies.
    asClient('gm');
    deliver(request);
    await vi.advanceTimersByTimeAsync(0);

    expect(handler).toHaveBeenCalledWith({ uuid: 'Token.t1' }, 'player');
    const reply = lastSent();
    expect(reply).toMatchObject({ kind: 'result', requestId: 'req1', targetId: 'player' });

    asClient('player');
    deliver(reply);

    expect(await pending).toEqual({
      kind: 'ran',
      result: { data: { uuid: 'Token.t1' }, senderId: 'player' },
    });
  });

  it('carries a handler’s failure back as a reason, not an exception', async () => {
    asClient('player');
    registerDispatch('harm', async () => {
      throw new Error('no such card');
    });

    const pending = dispatch('harm', {});
    const request = lastSent();

    asClient('gm');
    deliver(request);
    await vi.advanceTimersByTimeAsync(0);

    asClient('player');
    deliver(lastSent());

    expect(await pending).toEqual({ kind: 'failed', reason: 'no such card' });
  });

  // A reply goes to every client, so the id is what stops one player resolving another's request.
  it('ignores a reply addressed to somebody else', async () => {
    asClient('player');
    registerDispatch('harm', vi.fn());

    const pending = dispatch('harm', {});
    deliver({ kind: 'result', action: 'harm', data: 'stolen', requestId: 'req1', targetId: 'other' });
    await vi.advanceTimersByTimeAsync(10_000);

    expect(await pending).toEqual({ kind: 'timeout' });
  });

  // Every GM client receives the request; without this each would apply the same damage.
  it('is run by the active Warden alone, not by every GM on the wire', async () => {
    asClient('gm2', 'gm');
    const handler = vi.fn(async () => 'done');
    registerDispatch('harm', handler);

    deliver({ kind: 'request', action: 'harm', data: {}, senderId: 'player', requestId: 'r1' });
    await vi.advanceTimersByTimeAsync(0);

    expect(handler).not.toHaveBeenCalled();
    expect(sent).toEqual([]);
  });
});

describe('what the Warden’s client refuses', () => {
  it('an action with nothing registered for it', async () => {
    asClient('gm');
    expect(await dispatch('harm', {})).toMatchObject({ kind: 'failed' });
  });

  // A request naming a user who is not connected is not one this client can vouch for.
  it('a request from a sender who is not on the wire', async () => {
    asClient('gm');
    const handler = vi.fn(async () => 'done');
    registerDispatch('harm', handler);

    deliver({ kind: 'request', action: 'harm', data: {}, senderId: 'ghost', requestId: 'r1' });
    await vi.advanceTimersByTimeAsync(0);

    expect(handler).not.toHaveBeenCalled();
    expect(lastSent()).toMatchObject({ kind: 'error', targetId: 'ghost' });
  });

  it('anything on the channel that is not one of its own messages', async () => {
    asClient('gm');
    const handler = vi.fn(async () => 'done');
    registerDispatch('harm', handler);

    for (const junk of [null, 'hello', 42, { kind: 'gossip' }]) deliver(junk);
    await vi.advanceTimersByTimeAsync(0);

    expect(handler).not.toHaveBeenCalled();
    expect(sent).toEqual([]);
  });
});

/**
 * Foundry's `Package#registerCustomSocket` returns early unless the manifest declares `socket`, so
 * without this the server never relays `system.mothershiprpg` and every request is met with silence.
 * Nothing in the code can notice; only a live client can, and it fails as a timeout.
 */
describe('the channel the manifest has to open', () => {
  it('is declared in system.json', () => {
    const manifest = JSON.parse(
      readFileSync(fileURLToPath(new URL('../system.json', import.meta.url)), 'utf8'),
    ) as { id: string; socket?: boolean };

    expect(manifest.socket).toBe(true);
    expect(CHANNEL).toBe(`system.${manifest.id}`);
  });
});
