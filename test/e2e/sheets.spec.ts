import { test, expect } from './fixtures/foundry-clients.ts';

// Sheets are still AppV1 Handlebars renders. These specs are the safety net for phase 4: they
// assert each sheet opens and shows its data, so converting one to ApplicationV2 + Svelte has
// something to fail against.
test.describe('sheets render', () => {
  test.afterEach(async ({ gmPage }) => {
    await gmPage.evaluate(async () => {
      const g = (window as any).game;
      // ui.windows holds AppV1 instances; ApplicationV2 registers in foundry.applications.instances.
      // Closing both matters for DLShipMacros, which outlives the actor it was opened from.
      for (const app of Object.values((window as any).ui.windows ?? {}) as any[]) await app.close?.();
      for (const app of ((window as any).foundry.applications.instances?.values?.() ?? []) as any[]) {
        await app.close?.();
      }
      const ids = g.actors.filter((a: any) => a.name.startsWith('__e2e_')).map((a: any) => a.id);
      if (ids.length) await g.actors.documentClass.deleteDocuments(ids);
    });
  });

  for (const type of ['character', 'creature', 'ship']) {
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

  // DLShipMacros extended the wrong base class (a V2 DocumentSheet configured with the AppV1
  // contract) and never rendered correctly.
  //
  // Driven through the sheet's own _onOpenMacros handler rather than a click: the only trigger,
  // `.macro-menu-button`, is commented out in ship-sheet-sbt.html:132 and appears in no other
  // ship template, so the window has no UI route at present. The handler is the code path a
  // restored button would run, and it needs no production change to reach.
  test('the ship macros window renders', async ({ gmPage }) => {
    const title = await gmPage.evaluate(async () => {
      const doc = await (window as any).Actor.create({ name: '__e2e_ship_macros', type: 'ship' });
      await doc.sheet.render(true);
      doc.sheet._onOpenMacros(new Event('click'));
      await new Promise((r) => setTimeout(r, 1000));
      return `${doc.name}: Ship Macros`;
    });

    const macros = gmPage.locator('.app, .application').filter({ hasText: title }).first();
    await expect(macros).toBeVisible();
    // The four ship checks the window exists to offer.
    for (const button of ['.distress-button', '.maintenance-button', '.bankruptcy-button', '.morale-button']) {
      await expect(macros.locator(button)).toHaveCount(1);
    }
  });
});
