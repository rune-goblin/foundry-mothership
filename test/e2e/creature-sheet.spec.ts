import { type Page } from '@playwright/test';
import { test, expect } from './fixtures/foundry-clients.ts';

// The creature sheet is ApplicationV2 + Svelte (module/ui/creature/). It is the first consumer of
// the shared sections in module/ui/parts/sections/, so these specs cover the frame the character
// sheet inherits in S7 as much as the creature's own parts: the stat header the settings window
// gates, the item panels, and the two pip tracks that used to be HTML strings on the document.

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

const itemField = (page: Page, uuid: string, itemId: string, path: string) =>
  page.evaluate(
    async ({ u, i, p }: { u: string; i: string; p: string }) => {
      const actor = await (window as any).fromUuid(u);
      return (window as any).foundry.utils.getProperty(actor.items.get(i).toObject(), p);
    },
    { u: uuid, i: itemId, p: path },
  );

/** Playwright's drag helpers carry no dataTransfer, and Foundry reads the payload out of one. */
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
    for (const stat of ['speed', 'loyalty', 'armor', 'sanity']) {
      await expect(sheet.locator(`input[name="system.stats.${stat}.value"]`)).toHaveCount(0);
    }
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

  test('opens on the skills tab and switches', async ({ gmPage }) => {
    const { appId } = await open(gmPage);
    const sheet = gmPage.locator(`#${appId}`);

    // AppV1 opened on a tab named "character", which no panel declares, so the body was blank.
    await expect(sheet.locator('.tab[data-tab="skills"]')).toBeVisible();
    await sheet.locator('a.tab-select[data-tab="weapons"]').click();
    await expect(sheet.locator('.tab[data-tab="weapons"]')).toBeVisible();
    await expect(sheet.locator('.tab[data-tab="skills"]')).toHaveCount(0);
  });

  test('the notes tab shows bio and notes together', async ({ gmPage }) => {
    // AppV1 enriched description and biography but never notes, so this tab always rendered empty.
    const { appId } = await open(gmPage, {
      notes: '<p>ate the away team</p>',
      biography: '<p>found drifting near the derelict</p>',
    });
    const sheet = gmPage.locator(`#${appId}`);

    await sheet.locator('a.tab-select[data-tab="notes"]').click();
    await expect(sheet.locator('.tab[data-tab="notes"]')).toContainText('ate the away team');
    await expect(sheet.locator('.tab[data-tab="notes"]')).toContainText('found drifting near the derelict');
  });

  test('the XP track fills to the stored value and steps both ways', async ({ gmPage }) => {
    const { appId, uuid } = await open(gmPage, { xp: { value: 3 } });
    const track = gmPage.locator(`#${appId} .skill_training_frame [role="button"]`);

    await expect(track.locator('.pip.filled')).toHaveCount(3);
    await expect(track.locator('.circle')).toHaveCount(12);
    await expect(track.locator('.pip-caption')).toHaveText([
      'Trained',
      'Expert',
      'Master',
    ]);

    await track.click({ position: { x: 5, y: 5 } });
    await expect.poll(() => stored(gmPage, uuid, 'system.xp.value')).toBe(4);

    await track.click({ button: 'right', position: { x: 5, y: 5 } });
    await expect.poll(() => stored(gmPage, uuid, 'system.xp.value')).toBe(3);
  });

  test('a condition shows its treatment pips and steps them', async ({ gmPage }) => {
    const { appId, uuid } = await open(gmPage);
    const id = await addItem(gmPage, uuid, {
      name: '__e2e_frightened',
      type: 'condition',
      system: { severity: 2, treatment: { value: 1 } },
    });
    await gmPage.locator(`#${appId} a.tab-select[data-tab="conditions"]`).click();
    const row = gmPage.locator(`#${appId} li.item[data-item-id="${id}"]`);

    await expect(row).toContainText('__e2e_frightened');
    await expect(row.locator('i.fas.fa-circle')).toHaveCount(1);
    await expect(row.locator('i.far.fa-circle')).toHaveCount(2);

    await row.locator('.list-roll.flex').click();
    await expect.poll(() => itemField(gmPage, uuid, id, 'system.treatment.value')).toBe(2);
    await expect(row.locator('i.fas.fa-circle')).toHaveCount(2);
  });

  test('a gear row steps its quantity up on click and down on right click', async ({ gmPage }) => {
    const { appId, uuid } = await open(gmPage);
    const id = await addItem(gmPage, uuid, {
      name: '__e2e_ration',
      type: 'item',
      system: { quantity: 2 },
    });
    const sheet = gmPage.locator(`#${appId}`);

    await sheet.locator('a.tab-select[data-tab="items"]').click();
    const quantity = sheet.locator(`li.item[data-item-id="${id}"] .skill-stat[role="button"]`);

    await quantity.click();
    await expect.poll(() => itemField(gmPage, uuid, id, 'system.quantity')).toBe(3);

    await quantity.click({ button: 'right' });
    await expect.poll(() => itemField(gmPage, uuid, id, 'system.quantity')).toBe(2);
  });

  test('an armour row equips and unequips', async ({ gmPage }) => {
    const { appId, uuid } = await open(gmPage);
    const id = await addItem(gmPage, uuid, { name: '__e2e_vac', type: 'armor' });
    const sheet = gmPage.locator(`#${appId}`);

    await sheet.locator('a.tab-select[data-tab="armor"]').click();
    const box = sheet.locator(`li.item[data-item-id="${id}"] input[type="checkbox"]`);

    await box.check();
    await expect.poll(() => itemField(gmPage, uuid, id, 'system.equipped')).toBe(true);

    await box.uncheck();
    await expect.poll(() => itemField(gmPage, uuid, id, 'system.equipped')).toBe(false);
  });

  test('a panel adds a pack document through the picker, and deletes it', async ({ gmPage }) => {
    const { appId, uuid } = await open(gmPage);
    const sheet = gmPage.locator(`#${appId}`);

    await sheet.locator('a.tab-select[data-tab="weapons"]').click();
    await sheet.locator('.item-header a.item-control').click();

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
    const id = await addItem(gmPage, uuid, { name: '__e2e_zerog', type: 'skill' });
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

    // AppV1 put this in the title bar; ApplicationV2 files header controls under the ellipsis,
    // and renders them as a context menu whose entries are identified only by their label.
    await sheet.locator('.header-control[data-action="toggleControls"]').click();
    await gmPage.locator('.context-item', { hasText: 'Creature Settings' }).click();

    await expect(gmPage.locator('.application.creature-settings')).toBeVisible();
  });
});
