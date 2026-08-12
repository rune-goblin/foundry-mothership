// content/ids.json is the only thing keeping a document's _id stable across a rebuild. An id the
// registry loses is an id the next build re-mints, orphaning every copy already in a world and
// breaking every @UUID written as a bare _id.
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BOOKS } from '../scripts/content/books.ts';
import { bookDir } from '../scripts/content/book.ts';
import { allIds, FOUNDRY_ID, loadRegistry, serializeRegistry } from '../scripts/content/ids.ts';
import { checkSettingsDefaults } from '../scripts/content/integrity.ts';
import { validateDatasets } from '../scripts/content/validate.ts';

const ROOT = join(import.meta.dirname, '..');
const REGISTRY_PATH = join(ROOT, 'content/ids.json');
const registry = loadRegistry(REGISTRY_PATH);

describe('the id registry', () => {
  it('is committed in the canonical, sorted form the writer produces', () => {
    expect(readFileSync(REGISTRY_PATH, 'utf8')).toBe(serializeRegistry(registry));
  });

  it('holds only well-formed Foundry ids, none of them twice', () => {
    const ids = allIds(registry);
    const listed = Object.values(registry.packs).flatMap((p) =>
      Object.values(p.documents).flatMap((e) => [e.id, ...Object.values(e.results ?? {})]),
    );
    expect([...ids].filter((id) => !FOUNDRY_ID.test(id))).toEqual([]);
    expect(new Set(listed).size).toBe(listed.length);
  });

  it('names only compendia system.json declares', () => {
    const manifest = JSON.parse(readFileSync(join(ROOT, 'system.json'), 'utf8')) as {
      packs: { name: string }[];
    };
    const declared = new Set(manifest.packs.map((p) => p.name));
    const undeclared = Object.values(registry.packs)
      .map((p) => p.compendium)
      .filter((name) => !declared.has(name));
    expect(undeclared).toEqual([]);
  });

  it('retires nothing without a reason', () => {
    for (const entry of registry.retired) expect(entry.reason.trim()).not.toBe('');
  });
});

describe('referential integrity of the content as it stands', () => {
  const uuid = /@UUID\[Compendium\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)\.(?:Item|Macro|RollTable)\.([A-Za-z0-9]+)\]/g;
  const SOURCE = join(ROOT, 'packs/_source');

  function scan(): { pkg: string; compendium: string; id: string }[] {
    const found: { pkg: string; compendium: string; id: string }[] = [];
    for (const pack of readdirSync(SOURCE)) {
      for (const file of readdirSync(join(SOURCE, pack)).filter((f) => f.endsWith('.json'))) {
        const text = readFileSync(join(SOURCE, pack, file), 'utf8');
        for (const [, pkg, compendium, id] of text.matchAll(uuid)) {
          found.push({ pkg: pkg!, compendium: compendium!, id: id! });
        }
      }
    }
    return found;
  }

  const references = scan();

  it('finds the cross-references the registry exists to protect', () => {
    expect(references.length).toBeGreaterThan(0);
  });

  it('resolves every one of them against the registry', () => {
    const byCompendium = new Map<string, Set<string>>();
    for (const entry of Object.values(registry.packs)) {
      byCompendium.set(entry.compendium, new Set(Object.values(entry.documents).map((d) => d.id)));
    }
    const dangling = references.filter(
      (r) => r.pkg !== 'mothershiprpg' || !byCompendium.get(r.compendium)?.has(r.id),
    );
    expect(dangling).toEqual([]);
  });

  it('resolves every rolltable setting default', () => {
    expect(checkSettingsDefaults(ROOT, registry)).toEqual([]);
  });
});

describe('the books', () => {
  it.each(BOOKS)('$id validates against its own schemas, in Ajv strict mode', (book) => {
    const dir = bookDir(ROOT, book);
    expect(validateDatasets({ schema: join(dir, 'schema'), data: dir })).toEqual([]);
  });

  it.each(BOOKS)('$id records what it is in BOOK.md', (book) => {
    expect(existsSync(join(bookDir(ROOT, book), 'BOOK.md'))).toBe(true);
  });

  // Every dataset carried costs a transcription to keep faithful. The seven that shipped with no
  // runtime consumer were deleted; this list is what stops them creeping back.
  it('ships the twelve PSG datasets that have a consumer, and no others', () => {
    const dir = bookDir(ROOT, BOOKS.find((b) => b.id === 'psg')!);
    expect(readdirSync(dir).filter((f) => f.endsWith('.json')).sort()).toEqual([
      'armor.json',
      'character-creation.json',
      'classes.json',
      'death.json',
      'equipment.json',
      'loadouts.json',
      'panic.json',
      'patches.json',
      'skills.json',
      'trinkets.json',
      'weapons.json',
      'wounds.json',
    ]);
  });
});
