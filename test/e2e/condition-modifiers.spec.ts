import { type Page } from '@playwright/test';
import { test, expect } from './fixtures/foundry-clients.ts';

const CONDITIONS = 'mothershiprpg.conditions_1e';

/** Fires the roll and leaves its dialog open — the call awaits the player, so nothing is awaited. */
const roll = async (page: Page, uuid: string, call: 'restSave' | 'fear' | 'panic') => {
  await page.evaluate(
    async ({ u, c }: { u: string; c: string }) => {
      const actor = await (window as any).fromUuid(u);
      if (c === 'panic') actor.rollPanic();
      else if (c === 'restSave') actor.rollRestSave();
      else actor.rollStat(c);
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
      // Emptied so the roll assertions below can read "the last message" and mean this test's.
      const messages = g.messages.contents.map((m: any) => m.id);
      if (messages.length) await g.messages.documentClass.deleteDocuments(messages);
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

    await expect(dialog.locator('.prompt-note')).toHaveText('Nightmares: this roll is at [-].');
    await expect(dialog.locator('button[data-action="disadvantage"]')).toHaveAttribute('autofocus', '');
    await expect(dialog.locator('button[data-action="advantage"]')).not.toHaveAttribute('autofocus', '');
  });

  // Preselect, not force: whichever button the player presses is the roll that happens.
  for (const [action, expected] of [
    ['none', '1d100'],
    ['disadvantage', '{1d100,1d100}kh'],
    ['advantage', '{1d100,1d100}kl'],
  ] as const) {
    test(`pressing ${action} over the preselect rolls ${expected}`, async ({ gmPage }) => {
      const uuid = await character(gmPage, 'Nightmares');
      const dialog = await roll(gmPage, uuid, 'restSave');
      await dialog.locator(`button[data-action="${action}"]`).click();

      // Generous, not lax: the first roll a fresh worker posts also fetches and compiles the chat
      // template, and 10 seconds has proved too tight for that one card on a loaded machine.
      await expect
        .poll(
          () =>
            gmPage.evaluate(() => {
              const messages = (window as any).game.messages.contents;
              return String(messages[messages.length - 1]?.rolls?.[0]?.formula ?? '');
            }),
          { timeout: 30_000 },
        )
        .toBe(expected);
    });
  }

  test('Nightmares leaves a Fear Save alone', async ({ gmPage }) => {
    const uuid = await character(gmPage, 'Nightmares');
    const dialog = await roll(gmPage, uuid, 'fear');

    await expect(dialog.locator('.prompt-note')).toHaveCount(0);
    await expect(dialog.locator('button[data-action="none"]')).toHaveAttribute('autofocus', '');
  });

  test('Spiraling defaults the panic check, which is a d20 and its own dialog', async ({ gmPage }) => {
    const uuid = await character(gmPage, 'Spiraling');
    const dialog = await roll(gmPage, uuid, 'panic');

    await expect(dialog.locator('.prompt-note')).toHaveText('Spiraling: this roll is at [-].');
    await expect(dialog.locator('button[data-action="disadvantage"]')).toHaveAttribute('autofocus', '');
  });

  test('a character holding no condition sees the dialog it always saw', async ({ gmPage }) => {
    const uuid = await character(gmPage, null);
    const dialog = await roll(gmPage, uuid, 'restSave');

    await expect(dialog.locator('.prompt-note')).toHaveCount(0);
    // Normal is the default now — Advantage previously had autofocus only because it was the first button.
    await expect(dialog.locator('button[data-action="none"]')).toHaveAttribute('autofocus', '');
  });
});
