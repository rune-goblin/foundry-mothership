import { test, expect } from './fixtures/foundry-clients.ts';

// The eight simple item types are ApplicationV2 + Svelte (module/ui/item/). Their fields keep
// `name="system.…"` and Foundry's own form handling persists them, so what needs proving is that
// the round trip works: the sheet renders the stored value, an edit reaches the document, and a
// document update reaches the sheet.

const TYPES = ['item', 'weapon', 'armor', 'ability', 'module', 'condition', 'crew', 'repair'];

const openSheet = async (page: any, type: string, system: Record<string, unknown> = {}) =>
  page.evaluate(
    async ({ t, s }: { t: string; s: Record<string, unknown> }) => {
      const doc = await (window as any).Item.create({ name: `__e2e_${t}`, type: t, system: s });
      await doc.sheet.render(true);
      return { appId: doc.sheet.id, uuid: doc.uuid };
    },
    { t: type, s: system },
  );

test.describe('item sheets', () => {
  test.afterEach(async ({ gmPage }) => {
    await gmPage.evaluate(async () => {
      for (const app of ((window as any).foundry.applications.instances?.values?.() ?? []) as any[]) {
        await app.close?.();
      }
      const g = (window as any).game;
      const ids = g.items.filter((i: any) => i.name.startsWith('__e2e_')).map((i: any) => i.id);
      if (ids.length) await g.items.documentClass.deleteDocuments(ids);
    });
  });

  for (const type of TYPES) {
    test(`the ${type} sheet opens and titles itself with the item`, async ({ gmPage }) => {
      const { appId } = await openSheet(gmPage, type);
      const sheet = gmPage.locator(`#${appId}`);
      await expect(sheet).toBeVisible();
      await expect(sheet.locator('input[name="name"]')).toHaveValue(`__e2e_${type}`);
      // Every type offers a description tab backed by the V2 prose-mirror element.
      await expect(sheet.locator('prose-mirror[name="system.description"]')).toHaveCount(1);
    });
  }

  // skill-sheet.js still extends the AppV1 MothershipItemSheet, which is now registered for
  // nothing. Both are next in the conversion order; until then, prove they still open.
  for (const type of ['skill', 'class']) {
    test(`the ${type} sheet still renders on AppV1`, async ({ gmPage }) => {
      const { appId } = await openSheet(gmPage, type);
      await expect(gmPage.locator(`#${appId}`)).toBeVisible();
    });
  }

  test('editing a field persists it to the document', async ({ gmPage }) => {
    const { appId, uuid } = await openSheet(gmPage, 'item');
    const quantity = gmPage.locator(`#${appId} input[name="system.quantity"]`);
    await expect(quantity).toHaveValue('1');

    await quantity.fill('7');
    await quantity.blur();

    await expect
      .poll(async () =>
        gmPage.evaluate(async (u) => (await (window as any).fromUuid(u)).toObject().system.quantity, uuid),
      )
      .toBe(7);
  });

  test('the equipped checkbox on armour persists and feeds the armour derivation', async ({ gmPage }) => {
    // system.equipped was bound by the sheet and read by _deriveCharacter but declared in no
    // schema, so the DataModel migration cleaned it off on every write and armour never applied.
    const { appId, uuid } = await openSheet(gmPage, 'armor', { armorPoints: 3 });

    await gmPage.locator(`#${appId} input[name="system.equipped"]`).check();

    await expect
      .poll(async () =>
        gmPage.evaluate(async (u) => (await (window as any).fromUuid(u)).toObject().system.equipped, uuid),
      )
      .toBe(true);

    const armour = await gmPage.evaluate(async (u) => {
      const item = await (window as any).fromUuid(u);
      const actor = await (window as any).Actor.create({ name: '__e2e_armour_carrier', type: 'character' });
      await actor.createEmbeddedDocuments('Item', [item.toObject()]);
      return actor.system.stats.armor.mod;
    }, uuid);
    expect(armour).toBe(3);

    await gmPage.evaluate(async () => {
      const g = (window as any).game;
      const ids = g.actors.filter((a: any) => a.name.startsWith('__e2e_')).map((a: any) => a.id);
      if (ids.length) await g.actors.documentClass.deleteDocuments(ids);
    });
  });

  test('a document update re-renders the open sheet', async ({ gmPage }) => {
    const { appId, uuid } = await openSheet(gmPage, 'weapon');
    const damage = gmPage.locator(`#${appId} input[name="system.damage"]`);
    await expect(damage).toHaveValue('1d10');

    await gmPage.evaluate(async (u) => {
      const doc = await (window as any).fromUuid(u);
      await doc.update({ 'system.damage': '2d10', name: '__e2e_renamed' });
    }, uuid);

    await expect(damage).toHaveValue('2d10');
    await expect(gmPage.locator(`#${appId} input[name="name"]`)).toHaveValue('__e2e_renamed');
  });

  test('armour and weapons switch to their second tab', async ({ gmPage }) => {
    const { appId } = await openSheet(gmPage, 'weapon', { cost: 42 });
    const sheet = gmPage.locator(`#${appId}`);

    await expect(sheet.locator('input[name="system.cost"]')).toHaveCount(0);
    await sheet.locator('a.tab-select[data-tab="item"]').click();
    await expect(sheet.locator('input[name="system.cost"]')).toHaveValue('42');
  });

  test('the first-edition fields follow the rules setting', async ({ gmPage }) => {
    const before = await gmPage.evaluate(() => (window as any).game.settings.get('mosh', 'firstEdition'));

    await gmPage.evaluate(() => (window as any).game.settings.set('mosh', 'firstEdition', false));
    const off = await openSheet(gmPage, 'armor');
    await expect(gmPage.locator(`#${off.appId} input[name="system.damageReduction"]`)).toHaveCount(0);

    await gmPage.evaluate(() => (window as any).game.settings.set('mosh', 'firstEdition', true));
    const on = await openSheet(gmPage, 'armor');
    await expect(gmPage.locator(`#${on.appId} input[name="system.damageReduction"]`)).toHaveCount(1);

    await gmPage.evaluate((v) => (window as any).game.settings.set('mosh', 'firstEdition', v), before);
  });
});
