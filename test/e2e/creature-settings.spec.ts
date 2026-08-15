import { type Page } from '@playwright/test';
import { test, expect } from './fixtures/foundry-clients.ts';

// CreatureSettingsApp (module/ui/creature/) is DocumentSheetV2 + Svelte. The six stat toggles are
// named fields Foundry persists via submitOnChange; the swarm toggle is deliberately unnamed and
// runs its own batched update, because it multiplies combat by the creature's remaining wounds and
// stashes the original to restore later.
//
// The swarm arithmetic is also asserted in data-models.spec.ts, but there it is reproduced inside
// evaluate() -- so it covers the schema, not this window. These drive the window itself.

// The creature sheet underneath is now an ApplicationV2 too, carrying the same
// mothership/sheet/actor/creature classes -- `creature-settings` is what tells the two apart.
const SETTINGS = '.application.creature-settings';

// Wait for the sheet to actually be on screen before opening the settings window over it, or the
// settings window lands underneath and its inputs cannot be clicked.
const openSettings = async (page: Page, system: Record<string, unknown> = {}) => {
  const { uuid, appId } = await page.evaluate(async (s: Record<string, unknown>) => {
    const doc = await (window as any).Actor.create({
      name: '__e2e_creature_settings',
      type: 'creature',
      system: s,
    });
    await doc.sheet.render(true);
    return { uuid: doc.uuid as string, appId: doc.sheet.id as string };
  }, system);

  await expect(page.locator(`#${appId}`)).toBeVisible();

  await page.evaluate(async (u: string) => {
    const doc = await (window as any).fromUuid(u);
    doc.sheet.configureCreature();
  }, uuid);

  await expect(page.locator(SETTINGS)).toBeVisible();
  return uuid;
};

const stored = (page: Page, uuid: string, path: string) =>
  page.evaluate(
    async ({ u, p }: { u: string; p: string }) =>
      (window as any).foundry.utils.getProperty((await (window as any).fromUuid(u)).toObject(), p),
    { u: uuid, p: path },
  );

test.describe('creature settings window', () => {
  test.afterEach(async ({ gmPage }) => {
    await gmPage.evaluate(async () => {
      for (const app of ((window as any).foundry.applications.instances?.values?.() ?? []) as any[]) {
        await app.close?.();
      }
      for (const app of Object.values((window as any).ui.windows ?? {}) as any[]) await app.close?.();
      const g = (window as any).game;
      const ids = g.actors.filter((a: any) => a.name.startsWith('__e2e_')).map((a: any) => a.id);
      if (ids.length) await g.actors.documentClass.deleteDocuments(ids);
    });
  });

  test('opens from the creature sheet and titles itself with the actor', async ({ gmPage }) => {
    await openSettings(gmPage);
    const settings = gmPage.locator(SETTINGS);

    await expect(settings).toBeVisible();
    await expect(settings.locator('.window-title')).toContainText(
      '__e2e_creature_settings: Creature Settings',
    );
  });

  test('shows all seven toggles', async ({ gmPage }) => {
    await openSettings(gmPage);
    const settings = gmPage.locator(SETTINGS);

    for (const stat of ['combat', 'instinct', 'loyalty', 'speed', 'armor', 'sanity']) {
      await expect(settings.locator(`input[name="system.stats.${stat}.enabled"]`)).toBeVisible();
    }
    await expect(settings.locator('input#swarm-enabled')).toBeVisible();
  });

  // The six named toggles have no click handler at all -- if Foundry's form handling is not wired
  // up, this write goes nowhere. That is the whole point of the assertion.
  test('a stat toggle persists through Foundry form handling', async ({ gmPage }) => {
    const uuid = await openSettings(gmPage, { stats: { instinct: { enabled: false } } });
    const toggle = gmPage.locator(SETTINGS).locator('input[name="system.stats.instinct.enabled"]');

    await toggle.check();
    await expect.poll(() => stored(gmPage, uuid, 'system.stats.instinct.enabled')).toBe(true);

    await toggle.uncheck();
    await expect.poll(() => stored(gmPage, uuid, 'system.stats.instinct.enabled')).toBe(false);
  });

  // 30 -> 60 -> 30. The stash in system.swarm.combat.value is what makes the restore possible; it
  // was in no schema once, so it was cleaned off and combat multiplied permanently.
  test('the swarm toggle multiplies combat and undoes it', async ({ gmPage }) => {
    const uuid = await openSettings(gmPage, {
      stats: { combat: { value: 30 } },
      hits: { value: 0, max: 2 },
    });
    const swarm = gmPage.locator(SETTINGS).locator('input#swarm-enabled');

    await swarm.check();
    await expect.poll(() => stored(gmPage, uuid, 'system.stats.combat.value')).toBe(60);
    await expect.poll(() => stored(gmPage, uuid, 'system.swarm.combat.value')).toBe(30);
    await expect.poll(() => stored(gmPage, uuid, 'system.swarm.enabled')).toBe(true);

    await swarm.uncheck();
    await expect.poll(() => stored(gmPage, uuid, 'system.stats.combat.value')).toBe(30);
    await expect.poll(() => stored(gmPage, uuid, 'system.swarm.enabled')).toBe(false);
  });
});
