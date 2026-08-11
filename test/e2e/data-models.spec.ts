import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, expect } from './fixtures/foundry-clients.ts';

// The unit tests prove the schemas match template.json on paper. This proves a real document,
// created by a real Foundry against the registered DataModel, is stamped with those same
// defaults -- the half that only a live world can answer.
const template = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../template.json', import.meta.url)), 'utf8'),
) as { Actor: Record<string, any>; Item: Record<string, any> };

function templateDefaults(kind: 'Actor' | 'Item', type: string): Record<string, unknown> {
  const body = template[kind][type];
  const merged: Record<string, unknown> = {};
  for (const name of body.templates ?? []) Object.assign(merged, template[kind].templates[name]);
  for (const [k, v] of Object.entries(body)) if (k !== 'templates') merged[k] = v;
  return merged;
}

test.describe('created documents get the DataModel defaults', () => {
  test.afterEach(async ({ gmPage }) => {
    await gmPage.evaluate(async () => {
      const g = (window as any).game;
      const actors = g.actors.filter((a: any) => a.name.startsWith('__e2e_')).map((a: any) => a.id);
      const items = g.items.filter((i: any) => i.name.startsWith('__e2e_')).map((i: any) => i.id);
      if (actors.length) await g.actors.documentClass.deleteDocuments(actors);
      if (items.length) await g.items.documentClass.deleteDocuments(items);
    });
  });

  for (const type of ['character', 'creature', 'ship']) {
    test(`a new ${type} actor matches template.json`, async ({ gmPage }) => {
      // toObject() is the cleaned *source*: prepareDerivedData mutates actor.system in place
      // (armour mod, net HP, bleeding), so the live object is deliberately not what we compare.
      const source = await gmPage.evaluate(async (t) => {
        const doc = await (window as any).Actor.create({ name: `__e2e_${t}`, type: t });
        return doc.toObject().system;
      }, type);
      expect(source).toEqual(templateDefaults('Actor', type));
    });
  }

  for (const type of ['item', 'skill', 'weapon', 'armor', 'ability', 'module', 'condition', 'crew', 'repair', 'class']) {
    test(`a new ${type} item matches template.json`, async ({ gmPage }) => {
      const source = await gmPage.evaluate(async (t) => {
        const doc = await (window as any).Item.create({ name: `__e2e_${t}`, type: t });
        return doc.toObject().system;
      }, type);
      expect(source).toEqual(templateDefaults('Item', type));
    });
  }

  // The defaults assertions above pass whether or not a field can be *written*: a SchemaField
  // cleans off keys it does not declare, so an unbacked binding round-trips as "absent" rather
  // than failing. These are the fields the migration silently dropped -- write each one.
  const RESTORED: Array<[kind: 'Actor' | 'Item', type: string, path: string, value: unknown]> = [
    ['Item', 'armor', 'system.equipped', true],
    ['Item', 'armor', 'system.features', 'sealed'],
    ['Item', 'module', 'system.cost', 250],
    ['Actor', 'creature', 'system.xp.selectedSkill', 'Zero-G'],
    ['Actor', 'ship', 'system.cost', '2,000,000cr'],
    ['Actor', 'ship', 'system.owed', '750,000cr'],
    ['Actor', 'ship', 'system.make', 'Galloway / Class II'],
    ['Actor', 'ship', 'system.transponder', true],
    ['Actor', 'ship', 'system.stats.speed.mod', 5],
    ['Actor', 'ship', 'system.supplies.oxygen.value', 12],
  ];

  for (const [kind, type, path, value] of RESTORED) {
    test(`${kind} ${type} stores ${path}`, async ({ gmPage }) => {
      const stored = await gmPage.evaluate(
        async ({ k, t, p, v }: { k: string; t: string; p: string; v: unknown }) => {
          const cls = (window as any)[k];
          const doc = await cls.create({ name: `__e2e_${t}_${p}`, type: t });
          await doc.update({ [p]: v });
          return (window as any).foundry.utils.getProperty(doc.toObject(), p);
        },
        { k: kind, t: type, p: path, v: value },
      );
      expect(stored).toEqual(value);
    });
  }

  // This is the behaviour change the migration actually buys, and the one worth knowing about:
  // template.json stored whatever it was given, DataModels validate. A bad value now fails the
  // create outright -- Foundry returns undefined and surfaces the error in the UI rather than
  // throwing -- so nothing half-valid reaches the database.
  test('a non-numeric stat fails the create instead of being stored', async ({ gmPage }) => {
    const result = await gmPage.evaluate(async () => {
      try {
        const doc = await (window as any).Actor.create({
          name: '__e2e_validation',
          type: 'character',
          system: { stats: { strength: { value: 'not-a-number' } } },
        });
        return { created: doc !== undefined, threw: false, stored: doc?.toObject().system.stats.strength.value };
      } catch {
        return { created: false, threw: true };
      }
    });
    expect(result.created).toBe(false);
    // Nothing was persisted under that name.
    const leftBehind = await gmPage.evaluate(() =>
      (window as any).game.actors.filter((a: any) => a.name === '__e2e_validation').length,
    );
    expect(leftBehind).toBe(0);
  });

  test('a numeric string is still coerced, not rejected', async ({ gmPage }) => {
    const stored = await gmPage.evaluate(async () => {
      const doc = await (window as any).Actor.create({
        name: '__e2e_coerce',
        type: 'character',
        system: { stats: { strength: { value: '42' } } },
      });
      return doc?.toObject().system.stats.strength.value;
    });
    expect(stored).toBe(42);
  });
});
