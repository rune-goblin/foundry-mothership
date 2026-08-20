import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { CONDITIONS } from '../content/books/psg/conditions.ts';
import { CONDITION_IDS, isCondition } from '../module/conditions.ts';

// Re-derived from the same registry as test/tables.test.ts — a re-minted id fails here rather
// than breaking `@Apply[coward]` in shipped worlds.
const ids = JSON.parse(
  readFileSync(fileURLToPath(new URL('../content/ids.json', import.meta.url)), 'utf8'),
) as { packs: { conditions: { documents: Record<string, { id: string }> } } };

describe('CONDITION_IDS', () => {
  it('names every condition document content/ids.json minted for it', () => {
    for (const [slug, identity] of Object.entries(CONDITION_IDS)) {
      expect(ids.packs.conditions.documents[slug]?.id).toBe(identity.id);
    }
  });

  it('carries every condition the registry has, none dropped', () => {
    expect(Object.keys(CONDITION_IDS).sort()).toEqual(Object.keys(ids.packs.conditions.documents).sort());
  });

  // content/ids.json carries no name — the book catalog is the only source of the exact string
  // Foundry stamps onto a granted or dragged condition item.
  it('carries the exact name the book catalog gives each condition', () => {
    const nameOf = new Map<string, string>(CONDITIONS.map((c) => [c.id, c.name]));
    for (const [slug, identity] of Object.entries(CONDITION_IDS)) {
      expect(identity.name).toBe(nameOf.get(slug));
    }
  });
});

describe('isCondition', () => {
  it('matches by the compendium id, whatever the item happens to be named', () => {
    expect(isCondition({ id: 'pxtF1NfletmoFFGV', name: 'Renamed by a GM' }, 'bleeding')).toBe(true);
  });

  // Dragging a condition onto an actor never touches `mutation/items.ts`, so the embedded item
  // keeps whatever fresh id Foundry's own handler minted — only the copied name is still identity.
  it('matches by the exact canonical name alone, when the id is a fresh one — the sheet-drop path', () => {
    expect(isCondition({ id: 'aFreshRandomId01', name: 'Bleeding' }, 'bleeding')).toBe(true);
  });

  it('is case-exact on the name, not case-folded the way the old lookup was', () => {
    expect(isCondition({ id: 'aFreshRandomId01', name: 'bleeding' }, 'bleeding')).toBe(false);
  });

  it('is false for a slug the map does not carry', () => {
    expect(isCondition({ id: 'pxtF1NfletmoFFGV', name: 'Bleeding' }, 'not-a-condition')).toBe(false);
  });

  it('is false for an item that is neither the id nor the name', () => {
    expect(isCondition({ id: 'someOtherId0001', name: 'Frightened' }, 'bleeding')).toBe(false);
  });
});
