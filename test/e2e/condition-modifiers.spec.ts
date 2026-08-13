import { type Page } from '@playwright/test';
import { test, expect } from './fixtures/foundry-clients.ts';

// The whole S8 chain, end to end in a live world: a condition document carries a scoped modifier,
// the actor holds the condition, and the roll dialog it names opens with that button preselected.
// The unit specs prove the resolution; only a real DialogV2 can prove the preselect reaches a
// button, because `default` is Foundry's own autofocus contract.

const CONDITIONS = 'mothershiprpg.conditions_1e';

/** Fires the roll and leaves its dialog open — rollCheck awaits the player, so nothing is awaited. */
const roll = async (page: Page, uuid: string, call: 'restSave' | 'fear' | 'panic') => {
  await page.evaluate(
    async ({ u, c }: { u: string; c: string }) => {
      const actor = await (window as any).fromUuid(u);
      if (c === 'panic') actor.rollTable('panicCheck', null, null, null, null, null, null);
      else actor.rollCheck(null, 'low', c, null, null, null);
    },
    { u: uuid, c: call },
  );
  const dialog = page.locator('.macro-popup-dialog').last();
  await expect(dialog).toBeVisible();
  return dialog;
};

const character = async (page: Page, conditionName: string | null) =>
  page.evaluate(
    async (name: string | null) => {
      const actor = await (window as any).Actor.create({
        name: '__e2e_condition_roll',
        type: 'character',
        // Distinct saves so the Rest Save resolves to exactly one of them, deterministically.
        system: { stats: { sanity: { value: 30 }, fear: { value: 40 }, body: { value: 50 } } },
      });
      if (name) {
        const pack = (window as any).game.packs.get('mothershiprpg.conditions_1e');
        const entry = (await pack.getDocuments()).find((d: any) => d.name === name);
        await actor.createEmbeddedDocuments('Item', [entry.toObject()]);
      }
      return actor.uuid as string;
    },
    conditionName,
  );

test.describe('conditions preselect the roll they name', () => {
  test.afterEach(async ({ gmPage }) => {
    await gmPage.evaluate(async () => {
      for (const app of ((window as any).foundry.applications.instances?.values?.() ?? []) as any[]) {
        await app.close?.();
      }
      const g = (window as any).game;
      const actors = g.actors.filter((a: any) => a.name.startsWith('__e2e_')).map((a: any) => a.id);
      if (actors.length) await g.actors.documentClass.deleteDocuments(actors);
    });
  });

  test('the shipped conditions still carry the modifiers the build emitted', async ({ gmPage }) => {
    const scoped = await gmPage.evaluate(async (pack: string) => {
      const docs = await (window as any).game.packs.get(pack).getDocuments();
      return Object.fromEntries(
        docs
          .filter((d: any) => d.system.modifiers.length)
          .map((d: any) => [d.name, d.toObject().system.modifiers]),
      );
    }, CONDITIONS);
    expect(scoped).toEqual({
      Frightened: [{ modifier: 'disadvantage', scope: 'fear' }],
      Nightmares: [{ modifier: 'disadvantage', scope: 'restSave' }],
      Spiraling: [{ modifier: 'disadvantage', scope: 'panicCheck' }],
    });
  });

  test('Nightmares defaults a Rest Save to disadvantage and says why', async ({ gmPage }) => {
    const uuid = await character(gmPage, 'Nightmares');
    const dialog = await roll(gmPage, uuid, 'restSave');

    await expect(dialog.locator('.condition-modifier')).toHaveText('Nightmares: this roll is at [-].');
    await expect(dialog.locator('button[data-action="action_disadvantage"]')).toHaveAttribute('autofocus', '');
    await expect(dialog.locator('button[data-action="action_advantage"]')).not.toHaveAttribute('autofocus', '');
  });

  // Preselect, not force: whichever button the player presses is the roll that happens. Spying on
  // parseRollString catches it at the pipeline boundary, where the choice stops being reversible.
  for (const [action, expected] of [
    ['action_normal', '1d100'],
    ['action_disadvantage', '1d100 [-]'],
    ['action_advantage', '1d100 [+]'],
  ] as const) {
    test(`pressing ${action} over the preselect rolls ${expected}`, async ({ gmPage }) => {
      const uuid = await character(gmPage, 'Nightmares');
      await gmPage.evaluate(async (u: string) => {
        const actor = await (window as any).fromUuid(u);
        const original = actor.parseRollString.bind(actor);
        (window as any).__rolled = [];
        actor.parseRollString = (s: string, aim: string) => {
          (window as any).__rolled.push(s);
          return original(s, aim);
        };
        actor.rollCheck(null, 'low', 'restSave', null, null, null);
      }, uuid);

      const dialog = gmPage.locator('.macro-popup-dialog').last();
      await expect(dialog).toBeVisible();
      await dialog.locator(`button[data-action="${action}"]`).click();

      await expect
        .poll(() => gmPage.evaluate(() => (window as any).__rolled))
        .toEqual([expected]);
    });
  }

  test('Nightmares leaves a Fear Save alone', async ({ gmPage }) => {
    const uuid = await character(gmPage, 'Nightmares');
    const dialog = await roll(gmPage, uuid, 'fear');

    await expect(dialog.locator('.condition-modifier')).toHaveCount(0);
    await expect(dialog.locator('button[data-action="action_advantage"]')).toHaveAttribute('autofocus', '');
  });

  test('Spiraling defaults the panic check, which is a d20 and its own dialog', async ({ gmPage }) => {
    const uuid = await character(gmPage, 'Spiraling');
    const dialog = await roll(gmPage, uuid, 'panic');

    await expect(dialog.locator('.condition-modifier')).toHaveText('Spiraling: this roll is at [-].');
    await expect(dialog.locator('button[data-action="action_disadvantage"]')).toHaveAttribute('autofocus', '');
  });

  test('a character holding no condition sees the dialog it always saw', async ({ gmPage }) => {
    const uuid = await character(gmPage, null);
    const dialog = await roll(gmPage, uuid, 'restSave');

    await expect(dialog.locator('.condition-modifier')).toHaveCount(0);
    await expect(dialog.locator('button[data-action="action_advantage"]')).toHaveAttribute('autofocus', '');
  });
});
