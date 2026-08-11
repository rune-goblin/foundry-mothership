import { test, expect } from './fixtures/foundry-clients.ts';

// The 0e removal was a repair as much as a simplification: five `table0e*` settings still pointed
// at rolltables phase 3 had deleted with the 0e compendia, so the 0e panic check and death save
// rolled against nothing. This pins the invariant — every rolltable the system can select exists.
test('every rolltable setting resolves to a real document', async ({ gmPage }) => {
  const { checked, unresolved } = await gmPage.evaluate(async () => {
    const g = (window as any).game;
    const keys = [...g.settings.settings.keys()].filter(
      (k: string) => k.startsWith('mosh.table') && typeof g.settings.get(...k.split(/\.(.*)/s, 2)) === 'string',
    );
    const bad: string[] = [];
    for (const key of keys) {
      const [scope, name] = key.split(/\.(.*)/s, 2);
      const id = g.settings.get(scope, name);
      if (!id) continue;
      const found = g.packs
        .filter((p: any) => p.documentName === 'RollTable')
        .some((p: any) => p.index.has(id));
      if (!found) bad.push(`${key} -> ${id}`);
    }
    return { checked: keys.length, unresolved: bad };
  });
  expect(unresolved).toEqual([]);
  // Guard against the assertion above passing on an empty list.
  expect(checked).toBe(14);
});

// Proves the pack pipeline end to end: JSON in packs/_source → scripts/packs.sh → LevelDB →
// Foundry actually reading the documents back. A pack missing its .ldb opens as an empty
// database rather than failing, so counts are the assertion that matters.
const EXPECTED = {
  conditions_1e: 50,
  items_maintenance_1e: 100,
  macros_hotbar_1e: 11,
  macros_triggered_1e: 151,
  rolltables_1e: 14,
} as const;

test.describe('compendium packs', () => {
  test('every pack loads with the document count its source holds', async ({ gmPage }) => {
    const counts = await gmPage.evaluate(async () => {
      const g = (window as any).game;
      const out: Record<string, number> = {};
      for (const pack of g.packs.values()) {
        if (pack.metadata.packageName !== 'mosh') continue;
        out[pack.metadata.name] = (await pack.getIndex()).size;
      }
      return out;
    });
    expect(counts).toEqual(EXPECTED);
  });

  test('a macro document round-tripped its command intact', async ({ gmPage }) => {
    // The +/- pairs are the ones the pack filenames had to keep distinct.
    const commands = await gmPage.evaluate(async () => {
      const pack = (window as any).game.packs.get('mosh.macros_triggered_1e');
      const docs = await pack.getDocuments();
      const find = (name: string) => docs.find((d: any) => d.name === name)?.command ?? null;
      return { plus: find('+1 Stress'), minus: find('-1 Stress') };
    });
    expect(commands.plus).toBeTruthy();
    expect(commands.minus).toBeTruthy();
    expect(commands.plus).not.toBe(commands.minus);
  });

  test('the android panic macros use the configurable rolltable setting', async ({ gmPage }) => {
    // These were the two macros where the deleted _macros/ copies had drifted stale, hardcoding
    // a rolltable id instead of reading the setting.
    const command = await gmPage.evaluate(async () => {
      const pack = (window as any).game.packs.get('mosh.macros_triggered_1e');
      const docs = await pack.getDocuments();
      return docs.find((d: any) => d.name === 'Roll on Android Panic Table')?.command ?? null;
    });
    expect(command).toContain('table1ePanicStressAndroid');
    expect(command).not.toContain('aBnY19jlhPXzibCt');
  });

  test('no compendium references a deleted 0e pack', async ({ gmPage }) => {
    const offenders = await gmPage.evaluate(async () => {
      const g = (window as any).game;
      const found: string[] = [];
      for (const pack of g.packs.values()) {
        if (pack.metadata.packageName !== 'mosh') continue;
        for (const doc of await pack.getDocuments()) {
          if (JSON.stringify(doc.toObject()).includes('_0e')) found.push(`${pack.metadata.name}/${doc.name}`);
        }
      }
      return found;
    });
    expect(offenders).toEqual([]);
  });
});
