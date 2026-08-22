import { type Page } from '@playwright/test';
import { test, expect, waitForGameReady } from './fixtures/foundry-clients.ts';

/**
 * Only a real Foundry proves this end to end: the target set is Foundry's own, the row is drawn by
 * Handlebars, `@Harm[…]` becomes a button through the enricher, and the click routes through the
 * delegated listener to a document write.
 */

/**
 * Read through the token, not the base actor: a token is unlinked unless it says otherwise, so its
 * actor is the synthetic one and a write lands in the token's delta. That is what a hit hits.
 */
const stored = (page: Page, token: string, path: string) =>
  page.evaluate(
    async ({ u, p }: { u: string; p: string }) => {
      const w = window as any;
      return w.foundry.utils.getProperty((await w.fromUuid(u)).actor.toObject(), p);
    },
    { u: token, p: path },
  );

const rigDie = (page: Page, n: number) =>
  page.evaluate((result: number) => {
    const w = window as any;
    w.__unrigDie = w.foundry.dice.terms.DiceTerm.prototype._roll;
    w.foundry.dice.terms.DiceTerm.prototype._roll = async () => result;
  }, n);

const unrigDie = (page: Page) =>
  page.evaluate(() => {
    const w = window as any;
    if (w.__unrigDie) w.foundry.dice.terms.DiceTerm.prototype._roll = w.__unrigDie;
    delete w.__unrigDie;
  });

const answer = async (page: Page, action: string) => {
  const dialog = page.locator('dialog[open].macro-popup-dialog').last();
  await expect(dialog).toBeVisible();
  await dialog.locator(`button[data-action="${action}"]`).click();
  await expect(dialog).toHaveCount(0);
};

/** The harness world ships no scene, and targeting is a canvas act — so this makes one first. */
async function withCanvas(page: Page) {
  await page.evaluate(async () => {
    const w = window as any;
    if (w.canvas.scene?.name === '__e2e_stage') return;
    const scene = await w.Scene.create({ name: '__e2e_stage', width: 2000, height: 2000 });
    await scene.activate();
  });
  await expect
    .poll(() => page.evaluate(() => (window as any).canvas.ready === true), { timeout: 30_000 })
    .toBe(true);
}

/** A shooter with a gun, a victim on the canvas, and the victim in the shooter's crosshairs. */
async function stage(page: Page, victimSystem: Record<string, unknown> = {}) {
  await withCanvas(page);
  return await page.evaluate(async (system: Record<string, unknown>) => {
    const w = window as any;

    const shooter = await w.Actor.create({
      name: '__e2e_shooter',
      type: 'character',
      system: { stats: { combat: { value: 90 } } },
    });
    await shooter.createEmbeddedDocuments('Item', [
      { name: '__e2e_gun', type: 'weapon', system: { damage: '2d10', range: 'close', useAmmo: false } },
    ]);
    await w.game.user.update({ character: shooter.id });

    const victim = await w.Actor.create({ name: '__e2e_victim', type: 'character', system });
    const [token] = await w.canvas.scene.createEmbeddedDocuments('Token', [
      { name: '__e2e_victim', actorId: victim.id, x: 1000, y: 1000 },
    ]);
    await new Promise((resolve) => setTimeout(resolve, 200));
    (token.object ?? w.canvas.tokens.get(token.id))?.setTarget(true, { releaseOthers: true });

    w.ui.sidebar.collapse();
    return { shooter: shooter.uuid as string, victim: token.uuid as string, actor: victim.uuid as string };
  }, victimSystem);
}

/** Returns the card's own damage total: what the buttons offer is what the dice said, not a constant. */
async function fire(page: Page, shooter: string): Promise<{ message: string; total: number }> {
  await rigDie(page, 5); // 5 against Combat 90 is a hit, so the card carries damage.
  await page.evaluate(async (u: string) => {
    const actor = await (window as any).fromUuid(u);
    void actor.rollWeapon(actor.items.find((i: any) => i.type === 'weapon').id);
  }, shooter);
  await answer(page, 'none');

  // Every run leaves its own cards in the log, so the row under test is found by message id.
  return await page.evaluate(async () => {
    const w = window as any;
    for (let tries = 0; tries < 60; tries += 1) {
      const message = w.game.messages.contents.at(-1);
      const total = message?.flags?.mothershiprpg?.card?.data?.damageTotal ?? null;
      if (typeof total === 'number') return { message: message.id as string, total };
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error('no damage card was posted');
  });
}

const row = (page: Page, message: string) =>
  page.locator(`[data-message-id="${message}"] .card-target`).first();

test.describe('applying damage to the targeted actor', () => {
  test.beforeEach(async ({ gmPage }) => {
    // This suite's cleanup closes every ApplicationV2, the sidebar included, so the chat UI a
    // button is clicked in has to be rebuilt first.
    await gmPage.reload();
    await waitForGameReady(gmPage);
  });

  test.afterEach(async ({ gmPage }) => {
    await unrigDie(gmPage);
    await gmPage.evaluate(async () => {
      const w = window as any;
      for (const app of (w.foundry.applications.instances?.values?.() ?? []) as any[]) await app.close?.();
      await w.game.user.update({ character: null });
      for (const token of w.game.user.targets) token.setTarget(false, { releaseOthers: false });

      const tokens = w.canvas.scene.tokens.filter((t: any) => t.name.startsWith('__e2e_')).map((t: any) => t.id);
      if (tokens.length) await w.canvas.scene.deleteEmbeddedDocuments('Token', tokens);
      const actors = w.game.actors.filter((a: any) => a.name.startsWith('__e2e_')).map((a: any) => a.id);
      if (actors.length) await w.game.actors.documentClass.deleteDocuments(actors);
    });
  });

  test('a hit names who it was aimed at, and its button spends their Health', async ({ gmPage }) => {
    const { shooter, victim } = await stage(gmPage, { health: { value: 20, max: 20 } });

    const { message, total } = await fire(gmPage, shooter);

    await expect(row(gmPage, message)).toContainText('__e2e_victim');
    expect(await stored(gmPage, victim, 'system.health.value')).toBe(20);

    await row(gmPage, message).locator('.mothership-action').first().click();

    await expect.poll(() => stored(gmPage, victim, 'system.health.value')).toBe(20 - total);
  });

  test('the same damage cannot be spent on the same target twice', async ({ gmPage }) => {
    const { shooter, victim } = await stage(gmPage, { health: { value: 20, max: 20 } });

    const { message, total } = await fire(gmPage, shooter);
    await row(gmPage, message).locator('.mothership-action').first().click();
    await expect.poll(() => stored(gmPage, victim, 'system.health.value')).toBe(20 - total);

    // The row redraws as a record of what was taken, so there is no button left to click.
    await expect(row(gmPage, message)).toContainText(String(total));
    await expect(row(gmPage, message).locator('.mothership-action')).toHaveCount(0);
  });

  test('the half button spends half, rounded down', async ({ gmPage }) => {
    const { shooter, victim } = await stage(gmPage, { health: { value: 20, max: 20 } });

    const { message, total } = await fire(gmPage, shooter);
    await row(gmPage, message).locator('.mothership-action').nth(1).click();

    await expect.poll(() => stored(gmPage, victim, 'system.health.value')).toBe(20 - Math.floor(total / 2));
  });

  // PSG 25 — a suit's Damage Reduction comes off each hit before the bar is touched.
  test('armour keeps its Damage Reduction off the hit', async ({ gmPage }) => {
    const { shooter, victim, actor } = await stage(gmPage, { health: { value: 20, max: 20 } });
    await gmPage.evaluate(async (u: string) => {
      const actor = await (window as any).fromUuid(u);
      await actor.createEmbeddedDocuments('Item', [
        { name: '__e2e_suit', type: 'armor', system: { damageReduction: 3, armorPoints: 10, equipped: true } },
      ]);
    }, actor);

    const { message, total } = await fire(gmPage, shooter);
    await row(gmPage, message).locator('.mothership-action').first().click();

    await expect.poll(() => stored(gmPage, victim, 'system.health.value')).toBe(20 - (total - 3));
  });

  // The damage was already rolled: aiming again moves who it is offered to, and must not lose it.
  test('aiming again keeps the damage the card already rolled', async ({ gmPage }) => {
    const { shooter, victim, actor } = await stage(gmPage, { health: { value: 20, max: 20 } });

    const { message, total } = await fire(gmPage, shooter);

    // A second creature, targeted after the shot — the case of forgetting to target first.
    const second = await gmPage.evaluate(async () => {
      const w = window as any;
      const other = await w.Actor.create({
        name: '__e2e_second',
        type: 'character',
        system: { health: { value: 20, max: 20 } },
      });
      const [token] = await w.canvas.scene.createEmbeddedDocuments('Token', [
        { name: '__e2e_second', actorId: other.id, x: 1400, y: 1000 },
      ]);
      await new Promise((resolve) => setTimeout(resolve, 200));
      (token.object ?? w.canvas.tokens.get(token.id))?.setTarget(true, { releaseOthers: true });
      return token.uuid as string;
    });

    // A card renders twice — in the log and in the notification column — so one copy is picked.
    await gmPage
      .locator(`[data-message-id="${message}"] .card-target-retarget .mothership-action`)
      .first()
      .click();

    const rows = gmPage.locator(`[data-message-id="${message}"] .card-target`).first();
    await expect(rows).toContainText('__e2e_second');

    // Still the same damage, on the new row: the card was rewritten, not re-rolled.
    await rows.locator('.mothership-action').first().click();
    await expect.poll(() => stored(gmPage, second, 'system.health.value')).toBe(20 - total);
    expect(await stored(gmPage, victim, 'system.health.value')).toBe(20);
    expect(actor).toBeTruthy();
  });

  // PSG 28 — the surplus carries into the refilled bar, and the Wound is what pays for it.
  test('a hit worth more than the bar spends a Wound and refills it', async ({ gmPage }) => {
    const { shooter, victim } = await stage(gmPage, {
      health: { value: 1, max: 10 },
      hits: { value: 0, max: 2 },
    });

    const { message, total } = await fire(gmPage, shooter);
    expect(total).toBeGreaterThan(1);

    await row(gmPage, message).locator('.mothership-action').first().click();

    await expect.poll(() => stored(gmPage, victim, 'system.hits.value')).toBe(1);
    expect(await stored(gmPage, victim, 'system.health.value')).toBe(10 - (total - 1));
  });
});
