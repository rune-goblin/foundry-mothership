import { test, expect } from './fixtures/foundry-clients.ts';

// S3's milestone: the book is in a real Foundry, and the joins between its documents resolve
// there rather than only in the build. The content tests prove the emitter; this proves Foundry
// reads the packs back with the links intact.
test.describe('the PSG content in a live world', () => {
  // The generator scans every compendium for these two types and has never found any — which is
  // why its whole class and skill flow has been dead since it was written.
  test('the generator’s compendium scan finds skills and classes', async ({ gmPage }) => {
    const found = await gmPage.evaluate(async () => {
      const g = (window as any).game;
      let skills = 0;
      let classes = 0;
      for (const pack of g.packs.values()) {
        skills += (await pack.getDocuments({ type: 'skill' })).length;
        classes += (await pack.getDocuments({ type: 'class' })).length;
      }
      return { skills, classes };
    });
    expect(found).toEqual({ skills: 42, classes: 4 });
  });

  test('every class resolves its loadout, trinket and patch tables', async ({ gmPage }) => {
    const result = await gmPage.evaluate(async () => {
      const g = (window as any).game;
      const classes = await g.packs.get(`${g.system.id}.classes_1e`).getDocuments();
      const bad: string[] = [];
      for (const klass of classes) {
        for (const [slot, uuid] of Object.entries(klass.system.roll_tables) as [string, string][]) {
          const table = await (window as any).fromUuid(uuid);
          if (!table) bad.push(`${klass.name}.${slot} -> ${uuid}`);
        }
      }
      return { classes: classes.length, bad };
    });
    expect(result.bad).toEqual([]);
    expect(result.classes).toBe(4);
  });

  test('every granted skill and every prerequisite resolves to a skill document', async ({ gmPage }) => {
    const result = await gmPage.evaluate(async () => {
      const g = (window as any).game;
      const uuids = new Set<string>();
      for (const klass of await g.packs.get(`${g.system.id}.classes_1e`).getDocuments()) {
        for (const uuid of klass.system.base_adjustment.skills_granted) uuids.add(uuid);
      }
      for (const skill of await g.packs.get(`${g.system.id}.skills_1e`).getDocuments()) {
        for (const uuid of skill.system.prerequisite_ids) uuids.add(uuid);
      }
      const bad: string[] = [];
      for (const uuid of uuids) {
        const doc = await (window as any).fromUuid(uuid);
        if (doc?.type !== 'skill') bad.push(uuid);
      }
      return { checked: uuids.size, bad };
    });
    expect(result.bad).toEqual([]);
    expect(result.checked).toBeGreaterThan(20);
  });

  // The loadout step reads these links and adds what they name. Shipping the rows as text is what
  // kept that path dead; a link that does not resolve would keep it dead just as quietly.
  test('every loadout row links gear that exists', async ({ gmPage }) => {
    const result = await gmPage.evaluate(async () => {
      const g = (window as any).game;
      const tables = (await g.packs.get(`${g.system.id}.rolltables_1e`).getDocuments()).filter(
        (t: any) => t.name.endsWith('Loadouts'),
      );
      const bad: string[] = [];
      let links = 0;
      for (const table of tables) {
        for (const result of table.results) {
          for (const [, uuid] of result.description.matchAll(/@UUID\[([^\]]+)\]/g)) {
            links += 1;
            const doc = await (window as any).fromUuid(uuid);
            if (!doc) bad.push(`${table.name}: ${uuid}`);
          }
        }
      }
      return { tables: tables.length, links, bad };
    });
    expect(result.bad).toEqual([]);
    expect(result.tables).toBe(4);
    expect(result.links).toBeGreaterThanOrEqual(120);
  });

  // The signature bug of this repo: a SchemaField cleans off a key it does not declare, so the
  // pack ships and the data is gone the first time Foundry loads it. The build guards it; this
  // is the same guard, run by the thing that would have discarded it.
  test('Foundry keeps every system key the packs shipped', async ({ gmPage }) => {
    const kept = await gmPage.evaluate(async () => {
      const g = (window as any).game;
      const pick = async (pack: string, name: string) =>
        (await g.packs.get(`${g.system.id}.${pack}`).getDocuments()).find((d: any) => d.name === name);
      const vaccsuit = await pick('armor_1e', 'Vaccsuit');
      const axe = await pick('weapons_1e', 'Boarding Axe');
      const marine = await pick('classes_1e', 'Marine');
      return {
        armorKeys: Object.keys(vaccsuit.system).sort(),
        equipped: vaccsuit.system.equipped,
        armorPoints: vaccsuit.system.armorPoints,
        woundEffect: axe.system.woundEffect,
        damage: axe.system.damage,
        maxWounds: marine.system.base_adjustment.max_wounds,
      };
    });
    expect(kept.armorKeys).toContain('equipped');
    expect(kept.equipped).toBe(false);
    expect(kept.armorPoints).toBe(3);
    expect(kept.woundEffect).toBe('Gore & Massive [+]');
    expect(kept.damage).toBe('2d10');
    expect(kept.maxWounds).toBe(1);
  });
});
