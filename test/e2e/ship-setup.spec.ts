import { type Page } from '@playwright/test';
import { test, expect } from './fixtures/foundry-clients.ts';

// ShipSetupApp (module/ui/ship/) is a plain ApplicationV2 -- nothing on it is editable, it only
// fires the starting-condition table roll and closes. The ship sheet's own trigger button
// (`.setup-menu-button`) is commented out in templates/actor/ship-sheet-sbt.html, so it is opened
// here the same way that dead button would have: through the sheet's own `_onOpenSetup`.

const openShipSetup = async (page: Page) =>
  page.evaluate(async () => {
    const doc = await (window as any).Actor.create({ name: '__e2e_ship_setup', type: 'ship' });
    await doc.sheet.render(true);
    doc.sheet._onOpenSetup({ preventDefault: () => {} });
  });

test.describe('ship setup window', () => {
  test.afterEach(async ({ gmPage }) => {
    await gmPage.evaluate(async () => {
      for (const app of Object.values((window as any).ui.windows ?? {}) as any[]) await app.close?.();
      for (const app of ((window as any).foundry.applications.instances?.values?.() ?? []) as any[]) {
        await app.close?.();
      }
      const g = (window as any).game;
      const ids = g.actors.filter((a: any) => a.name.startsWith('__e2e_')).map((a: any) => a.id);
      if (ids.length) await g.actors.documentClass.deleteDocuments(ids);
    });
  });

  test('opens from the ship sheet, titles itself with the actor, and shows both buttons', async ({ gmPage }) => {
    await openShipSetup(gmPage);
    const setup = gmPage.locator('#mosh-ship-setup');

    await expect(setup).toBeVisible();
    await expect(setup.locator('.window-title')).toContainText('__e2e_ship_setup: Ship Setup');
    await expect(setup.locator('.conditions-button')).toBeVisible();
    await expect(setup.locator('.close-button')).toBeVisible();
  });

  test('the close button closes it', async ({ gmPage }) => {
    await openShipSetup(gmPage);
    const setup = gmPage.locator('#mosh-ship-setup');
    await expect(setup).toBeVisible();

    await setup.locator('.close-button').click();
    await expect(setup).toHaveCount(0);
  });

  test('clicking the roll button rolls the table into a chat message', async ({ gmPage }) => {
    const before = await gmPage.evaluate(() => (window as any).game.messages.size);
    await openShipSetup(gmPage);
    const setup = gmPage.locator('#mosh-ship-setup');

    await setup.locator('.conditions-button').click();

    await expect.poll(() => gmPage.evaluate(() => (window as any).game.messages.size)).toBeGreaterThan(before);

    const lastMessage = await gmPage.evaluate(() => {
      const messages = Array.from((window as any).game.messages.values()) as any[];
      const message = messages[messages.length - 1];
      return { content: message.content as string, alias: message.speaker.alias as string };
    });

    // kqz8GsFVPfjvqO0N is the Maintenance Issues table -- the button is labelled "Roll Starting
    // Condition" but always rolls this table; that mismatch is inherited, not introduced here.
    expect(lastMessage.content).toContain('Maintenance Issues');
    expect(lastMessage.alias).toBe('__e2e_ship_setup');
  });
});
