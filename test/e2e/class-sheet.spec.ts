import { type Page } from '@playwright/test';
import { test, expect } from './fixtures/foundry-clients.ts';

// The class sheet is ApplicationV2 + Svelte (module/ui/class/). It was the last AppV1 item sheet,
// and it is the one that made base_adjustment a free-form ObjectField: the old getData() resolved
// skill names onto system while rendering. Those keys are a real SchemaField now, so what needs
// proving here is that every field it binds still round-trips, and that the lists it owns -- the
// granted skills, the stat options and the choose_skill_or groups -- add and delete.

const openClass = async (page: Page, system: Record<string, unknown> = {}) =>
  page.evaluate(async (s: Record<string, unknown>) => {
    const doc = await (window as any).Item.create({ name: '__e2e_class', type: 'class', system: s });
    await doc.sheet.render(true);
    return { appId: doc.sheet.id as string, uuid: doc.uuid as string };
  }, system);

const createItem = async (page: Page, type: string, name: string) =>
  page.evaluate(
    async ({ t, n }: { t: string; n: string }) => {
      const doc = await (window as any).Item.create({ name: n, type: t });
      return doc.uuid as string;
    },
    { t: type, n: name },
  );

const stored = (page: Page, uuid: string, path: string): Promise<any> =>
  page.evaluate(
    async ({ u, p }: { u: string; p: string }) =>
      (window as any).foundry.utils.getProperty((await (window as any).fromUuid(u)).toObject(), p),
    { u: uuid, p: path },
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

test.describe('class sheet', () => {
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

  test('opens, titles itself with the item, and shows the stored adjustments', async ({ gmPage }) => {
    const { appId } = await openClass(gmPage, {
      base_adjustment: { combat: 10, fear: 20, max_wounds: 1 },
      trauma_response: 'Everyone Close makes a Fear Save.',
    });
    const sheet = gmPage.locator(`#${appId}`);

    await expect(sheet).toBeVisible();
    await expect(sheet.locator('.window-title')).toContainText('__e2e_class');
    await expect(sheet.locator('input[name="system.base_adjustment.combat"]')).toHaveValue('10');
    await expect(sheet.locator('input[name="system.base_adjustment.fear"]')).toHaveValue('20');
    await expect(sheet.locator('input[name="system.base_adjustment.max_wounds"]')).toHaveValue('1');
    await expect(sheet.locator('textarea[name="system.trauma_response"]')).toHaveValue(
      'Everyone Close makes a Fear Save.',
    );
  });

  // base_adjustment is a SchemaField as of S4. A binding it did not declare would be accepted by
  // the sheet and cleaned off on the way in, so read the stored source back rather than the input.
  test('editing an adjustment persists it as a number', async ({ gmPage }) => {
    const { appId, uuid } = await openClass(gmPage);
    const combat = gmPage.locator(`#${appId} input[name="system.base_adjustment.combat"]`);

    await combat.fill('15');
    await combat.blur();

    await expect.poll(() => stored(gmPage, uuid, 'system.base_adjustment.combat')).toBe(15);
  });

  test('the robotic checkbox, the trauma response and a roll table persist', async ({ gmPage }) => {
    const { appId, uuid } = await openClass(gmPage);
    const sheet = gmPage.locator(`#${appId}`);

    await sheet.locator('input[name="system.robotic"]').uncheck();
    await expect.poll(() => stored(gmPage, uuid, 'system.robotic')).toBe(false);

    await sheet.locator('textarea[name="system.trauma_response"]').fill('Advantage on a Panic Check.');
    await sheet.locator('textarea[name="system.trauma_response"]').blur();
    await expect
      .poll(() => stored(gmPage, uuid, 'system.trauma_response'))
      .toBe('Advantage on a Panic Check.');

    await sheet.locator('a.tab-select[data-tab="tables"]').click();
    await sheet.locator('input[name="system.roll_tables.loadout"]').fill('RollTable.abc123');
    await sheet.locator('input[name="system.roll_tables.loadout"]').blur();
    await expect.poll(() => stored(gmPage, uuid, 'system.roll_tables.loadout')).toBe('RollTable.abc123');
  });

  test('a selected-skill count persists', async ({ gmPage }) => {
    const { appId, uuid } = await openClass(gmPage);
    const sheet = gmPage.locator(`#${appId}`);

    await sheet.locator('a.tab-select[data-tab="skills.selected.and"]').click();
    const master = sheet.locator('input[name="system.selected_adjustment.choose_skill_and.master_full_set"]');
    await master.fill('1');
    await master.blur();

    await expect
      .poll(() => stored(gmPage, uuid, 'system.selected_adjustment.choose_skill_and.master_full_set'))
      .toBe(1);
  });

  test('dropping a skill grants it, and the same skill twice grants it once', async ({ gmPage }) => {
    const { appId, uuid } = await openClass(gmPage);
    const skill = await createItem(gmPage, 'skill', '__e2e_granted');
    const sheet = gmPage.locator(`#${appId}`);
    const target = `#${appId} .tab[data-tab="skills.fixed"]`;

    await sheet.locator('a.tab-select[data-tab="skills.fixed"]').click();
    await dropOn(gmPage, target, skill);

    await expect
      .poll(() => stored(gmPage, uuid, 'system.base_adjustment.skills_granted'))
      .toEqual([skill]);
    await expect(sheet.locator(`li.item[data-item-id="${skill}"]`)).toContainText('__e2e_granted');

    await dropOn(gmPage, target, skill);
    // A duplicate drop is a no-op, so there is no state change to await.
    await gmPage.waitForTimeout(500);
    expect(await stored(gmPage, uuid, 'system.base_adjustment.skills_granted')).toEqual([skill]);
  });

  test('an item that is not a skill is refused', async ({ gmPage }) => {
    const { appId, uuid } = await openClass(gmPage);
    const weapon = await createItem(gmPage, 'weapon', '__e2e_wrench');
    const sheet = gmPage.locator(`#${appId}`);

    await sheet.locator('a.tab-select[data-tab="skills.fixed"]').click();
    await dropOn(gmPage, `#${appId} .tab[data-tab="skills.fixed"]`, weapon);
    await gmPage.waitForTimeout(500);

    expect(await stored(gmPage, uuid, 'system.base_adjustment.skills_granted')).toEqual([]);
  });

  test('deleting a granted skill removes its uuid', async ({ gmPage }) => {
    const skill = await createItem(gmPage, 'skill', '__e2e_granted');
    const { appId, uuid } = await openClass(gmPage, {
      base_adjustment: { skills_granted: [skill] },
    });
    const sheet = gmPage.locator(`#${appId}`);

    await sheet.locator('a.tab-select[data-tab="skills.fixed"]').click();
    await sheet.locator(`li.item[data-item-id="${skill}"] a.skills-granted-delete`).click();

    await expect.poll(() => stored(gmPage, uuid, 'system.base_adjustment.skills_granted')).toEqual([]);
  });

  test('a granted skill that has been deleted still renders and still deletes', async ({ gmPage }) => {
    const skill = await createItem(gmPage, 'skill', '__e2e_doomed');
    const { appId, uuid } = await openClass(gmPage, {
      base_adjustment: { skills_granted: [skill] },
    });
    const sheet = gmPage.locator(`#${appId}`);

    await gmPage.evaluate(async (u: string) => {
      await (await (window as any).fromUuid(u)).delete();
    }, skill);
    await gmPage.evaluate(async (u: string) => {
      await (await (window as any).fromUuid(u)).sheet.render(false);
    }, uuid);

    // The AppV1 sheet pushed the null from fromUuid straight into its render list, giving a blank
    // row; worse, an unresolvable entry in a choose_skill_or option threw and blanked the sheet.
    await sheet.locator('a.tab-select[data-tab="skills.fixed"]').click();
    const row = sheet.locator(`li.item[data-item-id="${skill}"]`);
    await expect(row).toContainText(skill);

    await row.locator('a.skills-granted-delete').click();
    await expect.poll(() => stored(gmPage, uuid, 'system.base_adjustment.skills_granted')).toEqual([]);
  });

  test('a stat option is added through the dialog and deleted from the row', async ({ gmPage }) => {
    const { appId, uuid } = await openClass(gmPage);
    const sheet = gmPage.locator(`#${appId}`);

    await sheet.locator('a.tab-select[data-tab="stats&saves"]').click();
    await sheet.locator('a.stat-option-add').click();

    const dialog = gmPage.locator('.macro-popup-dialog');
    await expect(dialog).toBeVisible();
    await dialog.locator('#modification').fill('-10');
    await dialog.locator('#strength').check();
    await dialog.locator('#speed').check();
    await dialog.locator('button[data-action="create"]').click();

    // The generator reads modification back with parseInt and the generated classes store numbers.
    await expect
      .poll(() => stored(gmPage, uuid, 'system.selected_adjustment.choose_stat'))
      .toEqual([{ modification: -10, stats: ['strength', 'speed'] }]);
    await expect(sheet.locator('.tab[data-tab="stats&saves"] li.item[data-item-id="0"]')).toContainText(
      'strength, speed',
    );

    await sheet.locator('.tab[data-tab="stats&saves"] a.stat-option-delete').click();
    await expect.poll(() => stored(gmPage, uuid, 'system.selected_adjustment.choose_stat')).toEqual([]);
  });

  test('an optional-skill group takes an option, that option takes a skill, and both delete', async ({
    gmPage,
  }) => {
    const { appId, uuid } = await openClass(gmPage);
    const skill = await createItem(gmPage, 'skill', '__e2e_choice');
    const sheet = gmPage.locator(`#${appId}`);
    const panel = sheet.locator('.tab[data-tab="skills.selected.or"]');

    await sheet.locator('a.tab-select[data-tab="skills.selected.or"]').click();
    await panel.locator('a.skills-group-add').click();
    await expect.poll(() => stored(gmPage, uuid, 'system.selected_adjustment.choose_skill_or')).toEqual([[]]);

    const draft = panel.locator('li.item:has(a.skills-group-option-createnew)');
    await draft.locator('input').first().fill('2 Trained Skills');
    await draft.locator('input').nth(1).fill('2');
    await draft.locator('a.skills-group-option-createnew').click();

    // The old sheet read these back out of the DOM and stored the raw strings; the counts are
    // numbers, as the generated classes store them.
    await expect
      .poll(() => stored(gmPage, uuid, 'system.selected_adjustment.choose_skill_or'))
      .toEqual([
        [
          {
            name: '2 Trained Skills',
            from_list: [],
            trained: 2,
            expert: 0,
            master: 0,
            expert_full_set: 0,
            master_full_set: 0,
          },
        ],
      ]);

    await dropOn(gmPage, `#${appId} .tab[data-tab="skills.selected.or"] li.item[data-item-id="0"]`, skill);
    await expect
      .poll(async () =>
        (await stored(gmPage, uuid, 'system.selected_adjustment.choose_skill_or'))[0][0].from_list,
      )
      .toEqual([skill]);

    await panel.locator('a.skills-group-option-delete').click();
    await expect
      .poll(() => stored(gmPage, uuid, 'system.selected_adjustment.choose_skill_or'))
      .toEqual([[]]);

    await panel.locator('a.skills-group-delete').click();
    await expect.poll(() => stored(gmPage, uuid, 'system.selected_adjustment.choose_skill_or')).toEqual([]);
  });
});
