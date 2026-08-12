import { test, expect } from './fixtures/foundry-clients.ts';

// Sheets are still AppV1 Handlebars renders. These specs are the safety net for phase 4: they
// assert each sheet opens and shows its data, so converting one to ApplicationV2 + Svelte has
// something to fail against.
test.describe('sheets render', () => {
  test.afterEach(async ({ gmPage }) => {
    await gmPage.evaluate(async () => {
      const g = (window as any).game;
      // ui.windows holds AppV1 instances; ApplicationV2 registers in foundry.applications.instances.
      for (const app of Object.values((window as any).ui.windows ?? {}) as any[]) await app.close?.();
      for (const app of ((window as any).foundry.applications.instances?.values?.() ?? []) as any[]) {
        await app.close?.();
      }
      const ids = g.actors.filter((a: any) => a.name.startsWith('__e2e_')).map((a: any) => a.id);
      if (ids.length) await g.actors.documentClass.deleteDocuments(ids);
    });
  });

  for (const type of ['character', 'creature']) {
    test(`the ${type} sheet opens and shows the actor`, async ({ gmPage }) => {
      const appId = await gmPage.evaluate(async (t) => {
        const doc = await (window as any).Actor.create({ name: `__e2e_${t}`, type: t });
        await doc.sheet.render(true);
        return doc.sheet.id;
      }, type);
      const sheet = gmPage.locator(`#${appId}`);
      await expect(sheet).toBeVisible();
      await expect(sheet).toContainText(`__e2e_${type}`);
    });
  }

  test('a rendered character sheet carries the derived armour and net HP', async ({ gmPage }) => {
    // _deriveCharacter runs on prepareDerivedData; if it throws, the sheet renders without them.
    const derived = await gmPage.evaluate(async () => {
      const doc = await (window as any).Actor.create({ name: '__e2e_derived', type: 'character' });
      await doc.sheet.render(true);
      return {
        armorMod: doc.system.stats.armor.mod,
        armorTotal: doc.system.stats.armor.total,
        netHP: doc.system.netHP.value,
        netHPMax: doc.system.netHP.max,
      };
    });
    expect(derived).toEqual({ armorMod: 0, armorTotal: 0, netHP: 20, netHPMax: 20 });
  });

});
