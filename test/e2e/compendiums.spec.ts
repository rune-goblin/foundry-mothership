import { test, expect } from './fixtures/foundry-clients.ts';

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
