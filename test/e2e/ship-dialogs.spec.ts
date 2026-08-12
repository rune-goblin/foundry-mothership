import { type Page } from '@playwright/test';
import { test, expect } from './fixtures/foundry-clients.ts';

// distressSignal(), maintenanceCheck() and bankruptcySave() build a DialogV2 whose body is a
// Handlebars template. All three bodies were broken: distressSignal rendered a misspelled path
// that has never existed, and the other two were stubbed to an empty string. Their templates were
// then deleted as unreferenced, which is how the content came to be missing entirely.
//
// These assert on the localized prose rather than on markup, because the failure modes are a
// template that will not compile and a localize key that does not resolve -- both of which render
// the raw key or nothing while the dialog frame itself still looks fine.
//
// None of the three methods ever calls its promise's resolve, so awaiting them hangs. They are
// fired and not awaited on purpose.

const DIALOG = '.macro-popup-dialog';

const fire = async (page: Page, method: string) =>
  page.evaluate(async (m: string) => {
    const doc = await (window as any).Actor.create({ name: '__e2e_ship_dialog', type: 'ship' });
    void doc[m]();
  }, method);

test.describe('the ship check dialogs render their content', () => {
  test.afterEach(async ({ gmPage }) => {
    await gmPage.evaluate(async () => {
      for (const app of ((window as any).foundry.applications.instances?.values?.() ?? []) as any[]) {
        await app.close?.();
      }
      const g = (window as any).game;
      const ids = g.actors.filter((a: any) => a.name.startsWith('__e2e_')).map((a: any) => a.id);
      if (ids.length) await g.actors.documentClass.deleteDocuments(ids);
    });
  });

  test('distress signal', async ({ gmPage }) => {
    await fire(gmPage, 'distressSignal');
    const dialog = gmPage.locator(DIALOG);

    await expect(dialog).toBeVisible();
    await expect(dialog.locator('h3')).toContainText('Distress Signal');
    await expect(dialog).toContainText('Select your roll type');
    await expect(dialog.locator('img[src*="distress_signal.png"]')).toBeVisible();
  });

  // "Major Repairs" is the assertion that matters here: the key was spelled MayorRepairs in
  // lang/en.json, so it resolved to nothing.
  test('maintenance check', async ({ gmPage }) => {
    await fire(gmPage, 'maintenanceCheck');
    const dialog = gmPage.locator(DIALOG);

    await expect(dialog).toBeVisible();
    await expect(dialog.locator('h3')).toContainText('Maintenance Check');
    await expect(dialog).toContainText('Minor Repairs');
    await expect(dialog).toContainText('Major Repairs');
    await expect(dialog).toContainText('can only be fixed in port');
    await expect(dialog).toContainText('Select your roll type');
    await expect(dialog.locator('img[src*="maintenance_issues.png"]')).toBeVisible();
  });

  // Likewise "or quarter, as determined by your Warden" -- stored as OrQuarterAsDeterminedBWarden.
  test('bankruptcy save', async ({ gmPage }) => {
    await fire(gmPage, 'bankruptcySave');
    const dialog = gmPage.locator(DIALOG);

    await expect(dialog).toBeVisible();
    await expect(dialog.locator('h3')).toContainText('Bankruptcy Save');
    await expect(dialog).toContainText('or quarter, as determined by your Warden');
    await expect(dialog).toContainText('Select your roll type');
    await expect(dialog.locator('img[src*="bankruptcy_save.png"]')).toBeVisible();
  });

  // A raw Handlebars expression or an unresolved key reaching the DOM is the exact defect these
  // templates carried, and it is invisible to a "the dialog opened" assertion.
  test('no dialog leaks a raw localize key or an uncompiled expression', async ({ gmPage }) => {
    for (const method of ['distressSignal', 'maintenanceCheck', 'bankruptcySave']) {
      await fire(gmPage, method);
      const text = await gmPage.locator(DIALOG).innerText();
      expect(text).not.toContain('Mosh.');
      expect(text).not.toContain('{{');
      await gmPage.evaluate(async () => {
        for (const app of ((window as any).foundry.applications.instances?.values?.() ?? []) as any[]) {
          await app.close?.();
        }
      });
    }
  });
});
