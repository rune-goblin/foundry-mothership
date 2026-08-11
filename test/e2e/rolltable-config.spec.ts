import { type Page } from '@playwright/test';
import { test, expect } from './fixtures/foundry-clients.ts';

// The rolltable config window (module/ui/settings/) edits 14 world settings directly -- there is
// no document behind it, so game.settings is what has to round-trip. It is also the one window
// in this system registered with game.settings.registerMenu rather than opened from a sheet, so
// the real risk is that path: Foundry constructs the class itself (`new menu.type()`) and calls
// `render(true)` on it. This drives that exact path through the Settings UI rather than
// constructing RolltableConfigApp directly.

const openViaMenu = async (page: Page) => {
  await page.evaluate(() => (window as any).game.settings.sheet.render(true));
  const settingsConfig = page.locator('#settings-config');
  await expect(settingsConfig).toBeVisible();
  await settingsConfig.locator('button[data-action="tab"][data-tab="system"]').click();
  await settingsConfig
    .locator('button[data-action="openSubmenu"][data-key="mothershiprpg.rolltableSelector"]')
    .click();
  return page.locator('#rolltable-modifiers');
};

const rolltableKeys = (page: Page): Promise<string[]> =>
  page.evaluate(() =>
    [...(window as any).game.settings.settings.keys()]
      .filter((k: string) => k.startsWith('mothershiprpg.table'))
      .map((k: string) => k.slice('mothershiprpg.'.length)),
  );

const getSetting = (page: Page, key: string): Promise<string> =>
  page.evaluate((k: string) => (window as any).game.settings.get('mothershiprpg', k), key);

const setSetting = (page: Page, key: string, value: string): Promise<void> =>
  page.evaluate(
    ({ k, v }: { k: string; v: string }) => (window as any).game.settings.set('mothershiprpg', k, v),
    { k: key, v: value },
  );

test.describe('rolltable config', () => {
  test.afterEach(async ({ gmPage }) => {
    await gmPage.evaluate(async () => {
      for (const app of ((window as any).foundry.applications.instances?.values?.() ?? []) as any[]) {
        await app.close?.();
      }
    });
  });

  test('the settings menu opens the window', async ({ gmPage }) => {
    const app = await openViaMenu(gmPage);
    await expect(app).toBeVisible();
    await expect(app.locator('.window-title')).toContainText('Rolltable Configuration');
  });

  test('all 14 tables render, each showing its current value', async ({ gmPage }) => {
    const app = await openViaMenu(gmPage);
    const keys = await rolltableKeys(gmPage);
    // Guards against the per-key loop below passing vacuously on an empty list.
    expect(keys).toHaveLength(14);

    for (const key of keys) {
      const current = await getSetting(gmPage, key);
      await expect(app.locator(`input[name="${key}"]`)).toHaveValue(current);
    }
  });

  test('editing a table id persists to game.settings', async ({ gmPage }) => {
    const app = await openViaMenu(gmPage);
    const key = 'table1eBankruptcy';
    const original = await getSetting(gmPage, key);

    const input = app.locator(`input[name="${key}"]`);
    await input.fill('__e2e_rolltable_id');
    await input.blur();

    await expect.poll(() => getSetting(gmPage, key)).toBe('__e2e_rolltable_id');

    await setSetting(gmPage, key, original);
    await expect.poll(() => getSetting(gmPage, key)).toBe(original);
  });

  test('the window closes', async ({ gmPage }) => {
    const app = await openViaMenu(gmPage);
    await app.locator('.close-button').click();
    await expect(app).toHaveCount(0);
  });
});
