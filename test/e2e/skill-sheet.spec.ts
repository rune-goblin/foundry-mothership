import { type Page } from '@playwright/test';
import { test, expect } from './fixtures/foundry-clients.ts';

const openSkill = async (page: Page, system: Record<string, unknown> = {}) =>
  page.evaluate(async (s: Record<string, unknown>) => {
    const doc = await (window as any).Item.create({ name: '__e2e_skill', type: 'skill', system: s });
    await doc.sheet.render(true);
    return { appId: doc.sheet.id as string, uuid: doc.uuid as string };
  }, system);

const createItem = async (
  page: Page,
  type: string,
  name: string,
  system: Record<string, unknown> = {},
) =>
  page.evaluate(
    async ({ t, n, s }: { t: string; n: string; s: Record<string, unknown> }) => {
      const doc = await (window as any).Item.create({ name: n, type: t, system: s });
      return doc.uuid as string;
    },
    { t: type, n: name, s: system },
  );

const createSkill = (page: Page, name: string, system: Record<string, unknown> = {}) =>
  createItem(page, 'skill', name, system);

const storedIds = (page: Page, uuid: string): Promise<string[]> =>
  page.evaluate(
    async (u: string) => (await (window as any).fromUuid(u)).toObject().system.prerequisite_ids,
    uuid,
  );

/**
 * Playwright's drag helpers carry no dataTransfer, and Foundry reads the payload out of one.
 * Dispatch a real DragEvent instead, with the same `text/plain` body a genuine drag would carry.
 */
const dropSkillOn = (page: Page, selector: string, documentUuid: string) =>
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

test.describe('skill sheet', () => {
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

  test('opens, titles itself with the item, and shows bonus and rank', async ({ gmPage }) => {
    const { appId } = await openSkill(gmPage, { bonus: 15, rank: 'Expert' });
    const sheet = gmPage.locator(`#${appId}`);

    await expect(sheet).toBeVisible();
    await expect(sheet.locator('.window-title')).toContainText('__e2e_skill');
    await expect(sheet.locator('input[name="name"]')).toHaveValue('__e2e_skill');
    await expect(sheet.locator('input[name="system.bonus"]')).toHaveValue('15');
    await expect(sheet.locator('select[name="system.rank"]')).toHaveValue('Expert');
  });

  test('editing bonus and rank persists to the document', async ({ gmPage }) => {
    const { appId, uuid } = await openSkill(gmPage);
    const sheet = gmPage.locator(`#${appId}`);

    await sheet.locator('input[name="system.bonus"]').fill('25');
    await sheet.locator('input[name="system.bonus"]').blur();
    await expect
      .poll(async () =>
        gmPage.evaluate(async (u: string) => (await (window as any).fromUuid(u)).toObject().system.bonus, uuid),
      )
      .toBe(25);

    await sheet.locator('select[name="system.rank"]').selectOption('Master');
    await expect
      .poll(async () =>
        gmPage.evaluate(async (u: string) => (await (window as any).fromUuid(u)).toObject().system.rank, uuid),
      )
      .toBe('Master');
  });

  test('switches to the prerequisites tab', async ({ gmPage }) => {
    const { appId } = await openSkill(gmPage);
    const sheet = gmPage.locator(`#${appId}`);

    await expect(sheet.locator('.tab[data-tab="skills.prerequisite"]')).toHaveCount(0);
    await sheet.locator('a.tab-select[data-tab="skills.prerequisite"]').click();
    await expect(sheet.locator('.tab[data-tab="skills.prerequisite"]')).toBeVisible();
  });

  test('dropping a skill stores its uuid and lists it', async ({ gmPage }) => {
    const { appId, uuid } = await openSkill(gmPage);
    const prerequisite = await createSkill(gmPage, '__e2e_prereq', { rank: 'Trained', bonus: 5 });
    const sheet = gmPage.locator(`#${appId}`);

    await sheet.locator('a.tab-select[data-tab="skills.prerequisite"]').click();
    await dropSkillOn(gmPage, `#${appId} .tab[data-tab="skills.prerequisite"]`, prerequisite);

    await expect.poll(() => storedIds(gmPage, uuid)).toEqual([prerequisite]);

    const row = sheet.locator(`li.item[data-item-id="${prerequisite}"]`);
    await expect(row).toBeVisible();
    await expect(row).toContainText('__e2e_prereq');
    await expect(row).toContainText('Trained');
    await expect(row).toContainText('5');
  });

  test('deleting a row removes the uuid from the document', async ({ gmPage }) => {
    const { appId, uuid } = await openSkill(gmPage);
    const prerequisite = await createSkill(gmPage, '__e2e_prereq');
    const sheet = gmPage.locator(`#${appId}`);

    await sheet.locator('a.tab-select[data-tab="skills.prerequisite"]').click();
    await dropSkillOn(gmPage, `#${appId} .tab[data-tab="skills.prerequisite"]`, prerequisite);
    await expect.poll(() => storedIds(gmPage, uuid)).toEqual([prerequisite]);

    await sheet.locator(`li.item[data-item-id="${prerequisite}"] a.item-control`).click();

    await expect.poll(() => storedIds(gmPage, uuid)).toEqual([]);
    await expect(sheet.locator(`li.item[data-item-id="${prerequisite}"]`)).toHaveCount(0);
  });

  test('dropping the same skill twice stores it once', async ({ gmPage }) => {
    const { appId, uuid } = await openSkill(gmPage);
    const prerequisite = await createSkill(gmPage, '__e2e_prereq');
    const sheet = gmPage.locator(`#${appId}`);
    const target = `#${appId} .tab[data-tab="skills.prerequisite"]`;

    await sheet.locator('a.tab-select[data-tab="skills.prerequisite"]').click();
    await dropSkillOn(gmPage, target, prerequisite);
    await expect.poll(() => storedIds(gmPage, uuid)).toEqual([prerequisite]);

    await dropSkillOn(gmPage, target, prerequisite);
    // A duplicate drop is a no-op, so there is no state change to await -- give the second drop
    // time to have been rejected before asserting nothing moved.
    await gmPage.waitForTimeout(500);

    expect(await storedIds(gmPage, uuid)).toEqual([prerequisite]);
    await expect(sheet.locator(`li.item[data-item-id="${prerequisite}"]`)).toHaveCount(1);
  });

  test('an item that is not a skill is refused', async ({ gmPage }) => {
    const { appId, uuid } = await openSkill(gmPage);
    const weapon = await createItem(gmPage, 'weapon', '__e2e_wrench');
    const actor = await gmPage.evaluate(async () => {
      const doc = await (window as any).Actor.create({ name: '__e2e_crew', type: 'character' });
      return doc.uuid as string;
    });
    const sheet = gmPage.locator(`#${appId}`);
    const target = `#${appId} .tab[data-tab="skills.prerequisite"]`;

    await sheet.locator('a.tab-select[data-tab="skills.prerequisite"]').click();
    await dropSkillOn(gmPage, target, weapon);
    await dropSkillOn(gmPage, target, actor);
    // Both drops are no-ops, so there is no state change to await -- give them time to land
    // before asserting nothing did.
    await gmPage.waitForTimeout(500);

    expect(await storedIds(gmPage, uuid)).toEqual([]);
    await expect(sheet.locator('li.item[data-item-id]')).toHaveCount(0);

    await gmPage.evaluate(async () => {
      const g = (window as any).game;
      const ids = g.actors.filter((a: any) => a.name.startsWith('__e2e_')).map((a: any) => a.id);
      if (ids.length) await g.actors.documentClass.deleteDocuments(ids);
    });
  });

  test('a prerequisite whose skill is gone renders as a deletable row', async ({ gmPage }) => {
    const prerequisite = await createSkill(gmPage, '__e2e_doomed');
    const { appId, uuid } = await openSkill(gmPage, { prerequisite_ids: [prerequisite] });
    const sheet = gmPage.locator(`#${appId}`);

    await gmPage.evaluate(async (u: string) => {
      await (await (window as any).fromUuid(u)).delete();
    }, prerequisite);
    await gmPage.evaluate(async (u: string) => {
      await (await (window as any).fromUuid(u)).sheet.render(false);
    }, uuid);

    await sheet.locator('a.tab-select[data-tab="skills.prerequisite"]').click();
    const row = sheet.locator(`li.item[data-item-id="${prerequisite}"]`);
    // A row for a missing skill is identified by the raw UUID, not a resolved id.
    await expect(row).toContainText(prerequisite);

    await row.locator('a.item-control').click();
    await expect.poll(() => storedIds(gmPage, uuid)).toEqual([]);
    await expect(row).toHaveCount(0);
  });
});
