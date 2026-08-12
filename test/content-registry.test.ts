// content/ids.json was seeded once from packs/_source and must never drift from it: the shipped
// content carries 269 @UUID cross-references written as bare _ids, and an id the registry loses
// is an id the next build re-mints, breaking every link that pointed at it.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { allIds, FOUNDRY_ID, loadRegistry, serializeRegistry } from '../scripts/content/ids.ts';
import { checkSettingsDefaults } from '../scripts/content/integrity.ts';
import { INHERITED_PACKS, readAllPackSources } from '../scripts/content/pack-source.ts';
import { seedFromPackSource } from '../scripts/content/seed.ts';
import { validateTier } from '../scripts/content/validate.ts';

const ROOT = join(import.meta.dirname, '..');
const REGISTRY_PATH = join(ROOT, 'content/ids.json');
const registry = loadRegistry(REGISTRY_PATH);

describe('the id registry', () => {
  it('matches what packs/_source holds today, entry for entry', () => {
    expect(serializeRegistry(registry)).toBe(serializeRegistry(seedFromPackSource(ROOT)));
  });

  it('covers all 136 documents and 74 rolltable results', () => {
    const counts = Object.entries(registry.packs).map(([pack, entry]) => [
      pack,
      Object.keys(entry.documents).length,
    ]);
    expect(Object.fromEntries(counts)).toEqual({
      conditions: 11,
      hotbar: 11,
      triggered: 107,
      rolltables: 7,
    });

    const results = Object.values(registry.packs)
      .flatMap((p) => Object.values(p.documents))
      .reduce((n, e) => n + Object.keys(e.results ?? {}).length, 0);
    expect(results).toBe(74);
  });

  it('holds 595 distinct Foundry ids', () => {
    const ids = allIds(registry);
    expect(ids.size).toBe(136 + 74);
    expect([...ids].filter((id) => !FOUNDRY_ID.test(id))).toEqual([]);
  });

  it('names every compendium system.json declares', () => {
    const manifest = JSON.parse(readFileSync(join(ROOT, 'system.json'), 'utf8')) as {
      packs: { name: string }[];
    };
    const declared = manifest.packs.map((p) => p.name).sort();
    const registered = Object.values(registry.packs).map((p) => p.compendium).sort();
    expect(registered).toEqual(declared);
    expect(INHERITED_PACKS.map((p) => p.compendium).sort()).toEqual(declared);
  });

  it('retires nothing without a reason', () => {
    for (const entry of registry.retired) expect(entry.reason.trim()).not.toBe('');
  });
});

describe('referential integrity of the content as it stands', () => {
  const uuid = /@UUID\[Compendium\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)\.(?:Item|Macro|RollTable)\.([A-Za-z0-9]+)\]/g;

  function scan(): { pkg: string; compendium: string; id: string }[] {
    const found: { pkg: string; compendium: string; id: string }[] = [];
    for (const { pack } of INHERITED_PACKS) {
      const dir = join(ROOT, 'packs/_source', pack);
      for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
        const text = readFileSync(join(dir, file), 'utf8');
        for (const [, pkg, compendium, id] of text.matchAll(uuid)) {
          found.push({ pkg: pkg!, compendium: compendium!, id: id! });
        }
      }
    }
    return found;
  }

  const references = scan();

  it('finds the 58 cross-references the registry exists to protect', () => {
    expect(references.length).toBe(58);
    const byTarget = new Map<string, number>();
    for (const r of references) byTarget.set(r.compendium, (byTarget.get(r.compendium) ?? 0) + 1);
    expect(Object.fromEntries(byTarget)).toEqual({
      macros_triggered_1e: 54,
      macros_hotbar_1e: 4,
    });
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

  it('resolves all 14 rolltable settings defaults', () => {
    expect(checkSettingsDefaults(ROOT, registry)).toEqual([]);
  });
});

describe('content sources', () => {
  it('validates the vendored corpus against its vendored schemas', () => {
    expect(
      validateTier({
        schema: join(ROOT, 'content/data/schema'),
        data: join(ROOT, 'content/data'),
        strict: false,
      }),
    ).toEqual([]);
  });

  it('validates the rescued tier against content/schema', () => {
    expect(
      validateTier({ schema: join(ROOT, 'content/schema'), data: join(ROOT, 'content/local') }),
    ).toEqual([]);
  });

  it('vendors every file CHECKSUMS records, unmodified', async () => {
    const { createHash } = await import('node:crypto');
    const dir = join(ROOT, 'content/data');
    const recorded = readFileSync(join(dir, 'CHECKSUMS'), 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => line.split('  ') as [string, string]);
    expect(recorded.length).toBe(39);
    for (const [sha, rel] of recorded) {
      expect(createHash('sha256').update(readFileSync(join(dir, rel))).digest('hex')).toBe(sha);
    }
  });

  it('leaves content/local empty until C2 fills it', () => {
    expect(readdirSync(join(ROOT, 'content/local')).filter((f) => f.endsWith('.json'))).toEqual([]);
  });
});
