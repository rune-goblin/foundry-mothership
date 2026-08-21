import { type Page } from '@playwright/test';
import { test, expect } from './fixtures/foundry-clients.ts';

const open = async (page: Page, system: Record<string, unknown> = {}, name = '__e2e_creature') => {
  const opened = await page.evaluate(
    async ({ s, n }: { s: Record<string, unknown>; n: string }) => {
      const doc = await (window as any).Actor.create({ name: n, type: 'creature', system: s });
      await doc.sheet.render(true);
      return { appId: doc.sheet.id as string, uuid: doc.uuid as string };
    },
    { s: system, n: name },
  );
  await expect(page.locator(`#${opened.appId}`)).toBeVisible();
  return opened;
};

const addItem = (page: Page, uuid: string, data: Record<string, unknown>) =>
  page.evaluate(
    async ({ u, d }: { u: string; d: Record<string, unknown> }) => {
      const actor = await (window as any).fromUuid(u);
      const [item] = await actor.createEmbeddedDocuments('Item', [d]);
      return item.id as string;
    },
    { u: uuid, d: data },
  );

const stored = (page: Page, uuid: string, path: string) =>
  page.evaluate(
    async ({ u, p }: { u: string; p: string }) =>
      (window as any).foundry.utils.getProperty((await (window as any).fromUuid(u)).toObject(), p),
    { u: uuid, p: path },
  );

// Playwright's drag helpers carry no dataTransfer, and Foundry reads the payload out of one.
const dropOn = (page: Page, selector: string, documentUuid: string) =>
  page.evaluate(
    async ({ sel, u }: { sel: string; u: string }) => {
      const target = document.querySelector(sel);
      if (!target) throw new Error(`no drop target matched ${sel}`);
      const dropped = await (window as any).fromUuid(u);
      const dataTransfer = new DataTransfer();
      dataTransfer.setData('text/plain', JSON.stringify(dropped.toDragData()));
      target.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }));
    },
    { sel: selector, u: documentUuid },
  );

test.describe('creature sheet', () => {
  test.afterEach(async ({ gmPage }) => {
    await gmPage.evaluate(async () => {
      for (const app of ((window as any).foundry.applications.instances?.values?.() ?? []) as any[]) {
        await app.close?.();
      }
      const g = (window as any).game;
      const actors = g.actors.filter((a: any) => a.name.startsWith('__e2e_')).map((a: any) => a.id);
      if (actors.length) await g.actors.documentClass.deleteDocuments(actors);
      const items = g.items.filter((i: any) => i.name.startsWith('__e2e_')).map((i: any) => i.id);
      if (items.length) await g.items.documentClass.deleteDocuments(items);
    });
  });

  test('opens, titles itself with the actor, and shows only the enabled stats', async ({
    gmPage,
  }) => {
    const { appId } = await open(gmPage, { stats: { combat: { value: 45 } } });
    const sheet = gmPage.locator(`#${appId}`);

    await expect(sheet.locator('.window-title')).toContainText('__e2e_creature');
    await expect(sheet.locator('input[name="name"]')).toHaveValue('__e2e_creature');
    await expect(sheet.locator('input[name="system.stats.combat.value"]')).toHaveValue('45');
    await expect(sheet.locator('input[name="system.stats.instinct.value"]')).toBeVisible();
    // Off by default, and the settings window is what turns them on.
    for (const stat of ['loyalty', 'armor']) {
      await expect(sheet.locator(`input[name="system.stats.${stat}.value"]`)).toHaveCount(0);
    }
  });

  test('carries nothing a character sheet would carry', async ({ gmPage }) => {
    const { appId, uuid } = await open(gmPage);
    const sheet = gmPage.locator(`#${appId}`);
    for (const type of ['skill', 'armor', 'item', 'condition']) {
      await addItem(gmPage, uuid, { name: `__e2e_${type}`, type });
    }

    await expect(sheet.locator('a.tab-select')).toHaveCount(0);
    await expect(sheet.locator('textarea[name="system.notes"], [name="system.biography"]')).toHaveCount(0);
    // The four types above are still on the actor; the stat block just has no line for them.
    await expect(sheet.locator('li.item[data-item-id]')).toHaveCount(0);
  });

  test('editing a stat persists through Foundry form handling', async ({ gmPage }) => {
    const { appId, uuid } = await open(gmPage);
    const combat = gmPage.locator(`#${appId} input[name="system.stats.combat.value"]`);

    await combat.fill('55');
    await combat.blur();
    await expect.poll(() => stored(gmPage, uuid, 'system.stats.combat.value')).toBe(55);
  });

  test('a swarm labels its combat stat as a wound total', async ({ gmPage }) => {
    const { appId } = await open(gmPage, { swarm: { enabled: true } });
    await expect(gmPage.locator(`#${appId} span[data-key="combat"]`)).toContainText('W*');
  });

  test('an attack rolls from its name and its damage', async ({ gmPage }) => {
    const { appId, uuid } = await open(gmPage);
    const id = await addItem(gmPage, uuid, {
      name: '__e2e_Talons',
      type: 'weapon',
      system: { damage: '4d10', range: 'adjacent' },
    });
    const row = gmPage.locator(`#${appId} li.item[data-item-id="${id}"]`);

    await expect(row).toContainText('__e2e_Talons');
    await expect(row).toContainText('4d10');

    // The name opens the check prompt; dismiss it before the damage cell can be reached.
    await row.locator('.skill-name').click();
    await expect(gmPage.locator('.macro-popup-dialog')).toBeVisible();
    await gmPage.keyboard.press('Escape');
    await expect(gmPage.locator('.macro-popup-dialog')).toHaveCount(0);

    await row.locator('.skill-stat.list-roll').click();
    await expect
      .poll(() =>
        gmPage.evaluate(() =>
          (window as any).game.messages.contents.map((m: any) => m.content).join(''),
        ),
      )
      .toContain('__e2e_Talons');
  });

  test('a special ability prints itself to chat', async ({ gmPage }) => {
    const { appId, uuid } = await open(gmPage);
    const id = await addItem(gmPage, uuid, {
      name: '__e2e_Acid_Blood',
      type: 'ability',
      system: { description: 'Splashes for 1d10 DMG.' },
    });
    const block = gmPage.locator(`#${appId} .creature-special[data-item-id="${id}"]`);

    await expect(block).toContainText('Splashes for 1d10 DMG.');
    await block.locator('.creature-special-title').click();
    await expect
      .poll(() =>
        gmPage.evaluate(() =>
          (window as any).game.messages.contents.map((m: any) => m.content).join(''),
        ),
      )
      .toContain('__e2e_Acid_Blood');
  });

  test('the attack bar adds a pack weapon through the picker, and deletes it', async ({ gmPage }) => {
    const { appId, uuid } = await open(gmPage);
    const sheet = gmPage.locator(`#${appId}`);

    await sheet.locator('.creature-attacks a.item-control').click();

    const picker = gmPage.locator('.macro-popup-dialog');
    await picker.locator('#pick-filter').fill('revolver');
    await picker.getByRole('radio').check();
    await picker.locator('button[data-action="add"]').click();

    await expect(sheet.locator('li.item[data-item-id]')).toHaveCount(1);
    await expect.poll(() =>
      gmPage.evaluate(
        async (u: string) =>
          (await (window as any).fromUuid(u)).items.map((i: any) => [i.type, i.name]),
        uuid,
      ),
    ).toEqual([['weapon', 'Revolver']]);

    await sheet.locator('li.item[data-item-id] a.item-control').last().click();
    await expect(sheet.locator('li.item[data-item-id]')).toHaveCount(0);
  });

  // ActorSheetV2 binds dragstart to whatever `.draggable` rows exist when `_onRender` runs, so a
  // row Svelte adds during that same render has to be in the DOM by then.
  test('a row added while the sheet is open is draggable', async ({ gmPage }) => {
    const { appId, uuid } = await open(gmPage);
    const id = await addItem(gmPage, uuid, { name: '__e2e_talons', type: 'weapon' });
    await expect(gmPage.locator(`#${appId} li.item[data-item-id="${id}"]`)).toBeVisible();

    const payload = await gmPage.evaluate(
      ({ a, i }: { a: string; i: string }) => {
        const row = document.querySelector(`#${a} li.item[data-item-id="${i}"]`)!;
        const dataTransfer = new DataTransfer();
        row.dispatchEvent(
          new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer }),
        );
        return dataTransfer.getData('text/plain');
      },
      { a: appId, i: id },
    );

    expect(JSON.parse(payload || '{}')).toMatchObject({ type: 'Item' });
  });

  test('a dropped item is added to the creature', async ({ gmPage }) => {
    const { appId, uuid } = await open(gmPage);
    const weapon = await gmPage.evaluate(async () => {
      const doc = await (window as any).Item.create({ name: '__e2e_smg', type: 'weapon' });
      return doc.uuid as string;
    });

    // ActorSheetV2 binds the drop to the window element, so anywhere on the sheet is a target.
    await dropOn(gmPage, `#${appId}`, weapon);

    await expect
      .poll(() =>
        gmPage.evaluate(
          async (u: string) => (await (window as any).fromUuid(u)).items.map((i: any) => i.name),
          uuid,
        ),
      )
      .toEqual(['__e2e_smg']);
  });

  test('the header control opens the settings window', async ({ gmPage }) => {
    const { appId } = await open(gmPage);
    const sheet = gmPage.locator(`#${appId}`);

    // Header controls render as a context menu whose entries are identified only by their label.
    await sheet.locator('.header-control[data-action="toggleControls"]').click();
    await gmPage.locator('.context-item', { hasText: 'Creature Settings' }).click();

    await expect(gmPage.locator('.application.creature-settings')).toBeVisible();
  });
});
