import { test, expect, SYSTEM_ID } from './fixtures/foundry-clients.ts';

// The 0e removal was a repair as much as a simplification: five `table0e*` settings still pointed
// at rolltables phase 3 had deleted with the 0e compendia, so the 0e panic check and death save
// rolled against nothing. This pins the invariant — every rolltable the system can select exists.
test('every rolltable setting resolves to a real document', async ({ gmPage }) => {
  const { checked, unresolved } = await gmPage.evaluate(async () => {
    const g = (window as any).game;
    const keys = [...g.settings.settings.keys()].filter(
      (k: string) => k.startsWith(`${g.system.id}.table`) && typeof g.settings.get(...k.split(/\.(.*)/s, 2)) === 'string',
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
  expect(checked).toBe(7);
});

// Proves the pack pipeline end to end: JSON in packs/_source → scripts/packs.sh → LevelDB →
// Foundry actually reading the documents back. A pack missing its .ldb opens as an empty
// database rather than failing, so counts are the assertion that matters.
const EXPECTED = {
  conditions_1e: 11,
  macros_hotbar_1e: 11,
  macros_triggered_1e: 107,
  rolltables_1e: 7,
} as const;

test.describe('compendium packs', () => {
  test('every pack loads with the document count its source holds', async ({ gmPage }) => {
    const counts = await gmPage.evaluate(async () => {
      const g = (window as any).game;
      const out: Record<string, number> = {};
      for (const pack of g.packs.values()) {
        if (pack.metadata.packageName !== g.system.id) continue;
        out[pack.metadata.name] = (await pack.getIndex()).size;
      }
      return out;
    });
    expect(counts).toEqual(EXPECTED);
  });

  test('a macro document round-tripped its command intact', async ({ gmPage }) => {
    // The +/- pairs are the ones the pack filenames had to keep distinct.
    const commands = await gmPage.evaluate(async () => {
      const g = (window as any).game;
      const pack = g.packs.get(`${g.system.id}.macros_triggered_1e`);
      const docs = await pack.getDocuments();
      const find = (name: string) => docs.find((d: any) => d.name === name)?.command ?? null;
      return { plus: find('+1 Stress'), minus: find('-1 Stress') };
    });
    expect(commands.plus).toBeTruthy();
    expect(commands.minus).toBeTruthy();
    expect(commands.plus).not.toBe(commands.minus);
  });

  // The android panic macros this used to cover were cut with the Calm/android variants (§25).
  // The invariant it protected -- a macro must read the rolltable *setting*, never a hardcoded id,
  // which is how the deleted _macros/ copies had drifted -- still matters for every macro left.
  test('no triggered macro hardcodes a rolltable id', async ({ gmPage }) => {
    const offenders = await gmPage.evaluate(async () => {
      const g = (window as any).game;
      const pack = g.packs.get(`${g.system.id}.macros_triggered_1e`);
      const tableIds = new Set(
        (await g.packs.get(`${g.system.id}.rolltables_1e`).getDocuments()).map((t: any) => t.id),
      );
      const bad: string[] = [];
      for (const doc of await pack.getDocuments()) {
        for (const id of tableIds) if (doc.command.includes(id)) bad.push(`${doc.name} -> ${id}`);
      }
      return bad;
    });
    expect(offenders).toEqual([]);
  });

  test('no compendium references a deleted 0e pack', async ({ gmPage }) => {
    const offenders = await gmPage.evaluate(async () => {
      const g = (window as any).game;
      const found: string[] = [];
      for (const pack of g.packs.values()) {
        if (pack.metadata.packageName !== g.system.id) continue;
        for (const doc of await pack.getDocuments()) {
          if (JSON.stringify(doc.toObject()).includes('_0e')) found.push(`${pack.metadata.name}/${doc.name}`);
        }
      }
      return found;
    });
    expect(offenders).toEqual([]);
  });
});
