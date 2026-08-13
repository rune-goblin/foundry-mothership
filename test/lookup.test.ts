import { afterEach, describe, expect, it, vi } from 'vitest';

import { describeMiss, lookup, notifyMiss } from '../module/lookup.ts';
import { clearFoundryStubs, installI18n } from './foundry-stubs.ts';

type Globals = Record<string, unknown>;

afterEach(clearFoundryStubs);

function world(collections: Record<string, Record<string, object>>, packs: object[] = []): void {
  const entries = Object.entries(collections).map(([name, documents]) => [
    name,
    { get: (id: string) => documents[id] },
  ]);
  (globalThis as Globals).game = { ...Object.fromEntries(entries), packs };
}

function pack(type: string, documents: Record<string, object>): object {
  return {
    metadata: { id: `mothershiprpg.${type.toLowerCase()}s`, type },
    index: { get: (id: string) => (Object.hasOwn(documents, id) ? { _id: id } : undefined) },
    getDocument: async (id: string) => documents[id] ?? null,
  };
}

describe('lookup', () => {
  it('resolves a UUID as a UUID', async () => {
    const document = { name: 'Panic Check' };
    const fromUuid = vi.fn(async () => document);
    (globalThis as Globals).foundry = { utils: { fromUuid } };

    await expect(lookup('Compendium.mothershiprpg.rolltables_1e.RollTable.abc', 'RollTable')).resolves.toEqual({
      found: true,
      document,
    });
    expect(fromUuid).toHaveBeenCalledWith('Compendium.mothershiprpg.rolltables_1e.RollTable.abc');
  });

  // Audit RC8: a bare id used to be looked for by scanning every compendium index and then every
  // world collection in turn. The type says which collection holds it, so it is one get.
  it('takes a bare id straight to the collection its type names', async () => {
    const document = { name: 'World Table' };
    const items = { get: vi.fn() };
    world({ tables: { abc: document } });
    ((globalThis as Globals).game as Record<string, unknown>).items = items;

    await expect(lookup('abc', 'RollTable')).resolves.toEqual({ found: true, document });
    expect(items.get).not.toHaveBeenCalled();
  });

  it('falls back to the compendium a legacy id lives in, and only for its own type', async () => {
    const document = { name: 'Packed Table' };
    world({ tables: {} }, [pack('Item', { abc: { name: 'Wrong' } }), pack('RollTable', { abc: document })]);

    await expect(lookup('abc', 'RollTable')).resolves.toEqual({ found: true, document });
  });

  // Audit F18: `fromIdUuid` returned null and the roll path dereferenced it, so a stale id in a
  // setting surfaced as "Cannot read properties of null" halfway through a roll.
  it('reports a miss as a value, naming what was asked for', async () => {
    world({ tables: {} });

    await expect(lookup('missing', 'RollTable')).resolves.toEqual({
      found: false,
      request: { ref: 'missing', type: 'RollTable' },
    });
  });

  it('treats an empty reference as a miss rather than searching for it', async () => {
    const get = vi.fn();
    (globalThis as Globals).game = { tables: { get }, packs: [] };

    await expect(lookup('   ', 'RollTable')).resolves.toMatchObject({ found: false });
    expect(get).not.toHaveBeenCalled();
  });

  it('misses quietly when there is no Foundry at all', async () => {
    await expect(lookup('abc', 'Item')).resolves.toMatchObject({ found: false });
  });
});

describe('surfacing a miss', () => {
  it('says what was not found', () => {
    installI18n({ 'Mosh.Errors.DocumentNotFound': 'No {type} with id {id}.' });

    expect(describeMiss({ ref: 'abc', type: 'RollTable' })).toBe('No RollTable with id abc.');
  });

  it('notifies through the UI when there is one', () => {
    installI18n({ 'Mosh.Errors.DocumentNotFound': 'No {type} with id {id}.' });
    const error = vi.fn();
    (globalThis as Globals).ui = { notifications: { error } };

    notifyMiss({ ref: 'abc', type: 'Item' });
    expect(error).toHaveBeenCalledWith('No Item with id abc.');
  });
});
