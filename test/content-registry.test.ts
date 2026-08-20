import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BOOKS } from '../scripts/content/books.ts';
import { bookDir } from '../scripts/content/book.ts';
import { allIds, FOUNDRY_ID, loadRegistry, serializeRegistry } from '../scripts/content/ids.ts';
import { checkSettingsDefaults } from '../scripts/content/integrity.ts';

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
    expect(checkSettingsDefaults(registry)).toEqual([]);
  });
});

describe('the books', () => {
  it.each(BOOKS)('$id records what it is in BOOK.md', (book) => {
    expect(existsSync(join(bookDir(ROOT, book), 'BOOK.md'))).toBe(true);
  });

  it('ships the twelve transcribed PSG datasets, the three authored ones, and nothing else', () => {
    const dir = bookDir(ROOT, BOOKS.find((b) => b.id === 'psg')!);
    const transcribed = [
      'armor.ts',
      'character-creation.ts',
      'classes.ts',
      'death.ts',
      'equipment.ts',
      'loadouts.ts',
      'panic.ts',
      'patches.ts',
      'skills.ts',
      'trinkets.ts',
      'weapons.ts',
      'wounds.ts',
    ];
    // authored, not transcribed: conditions is stated only inside the Panic table; gear's loadout
    // rows are free text, hand-mapped onto documents; macros automate procedures, not book text.
    const authored = ['conditions.ts', 'gear.ts', 'macros.ts'];
    expect(readdirSync(dir).filter((f) => f.endsWith('.ts') && f !== 'source.ts').sort()).toEqual(
      [...transcribed, ...authored].sort(),
    );
  });

  it('leaves no JSON dataset behind for the catalogs to drift from', () => {
    for (const book of BOOKS) {
      expect(readdirSync(bookDir(ROOT, book)).filter((f) => f.endsWith('.json'))).toEqual([]);
    }
  });
});
