import { type Page } from '@playwright/test';
import { test, expect, waitForGameReady } from './fixtures/foundry-clients.ts';

const TRIGGERED = `mothershiprpg.macros_triggered_1e`;

const create = (page: Page, system: Record<string, unknown> = {}, name = '__e2e_remake') =>
  page.evaluate(
    async ({ s, n }: { s: Record<string, unknown>; n: string }) => {
      const actor = await (window as any).Actor.create({ name: n, type: 'character', system: s });
      // The macros target `game.user.character` by default (macroTarget's shipped setting).
      await (window as any).game.user.update({ character: actor.id });
      return actor.uuid as string;
    },
    { s: system, n: name },
  );

const stored = (page: Page, uuid: string, path: string) =>
  page.evaluate(
    async ({ u, p }: { u: string; p: string }) =>
      (window as any).foundry.utils.getProperty((await (window as any).fromUuid(u)).toObject(), p),
    { u: uuid, p: path },
  );

// `Macro#execute` runs the command as an async function whose body never awaits, so this resolves
// as soon as the call is *made* -- every assertion below polls, and every prompt answered separately.
const runMacro = (page: Page, pack: string, name: string) =>
  page.evaluate(
    async ({ pk, n }: { pk: string; n: string }) => {
      const source = (await (window as any).game.packs.get(pk).getDocuments()).find(
        (d: any) => d.name === n,
      );
      if (!source) throw new Error(`no macro named "${n}" in ${pk}`);
      const [macro] = await (window as any).Macro.createDocuments([source.toObject()]);
      try {
        await macro.execute();
      } finally {
        await macro.delete();
      }
    },
    { pk: pack, n: name },
  );

// Every check a character makes offers a skill first, hence the prompt this answers.
const answer = async (page: Page, action: string) => {
  const dialog = page.locator('dialog[open].macro-popup-dialog').last();
  await expect(dialog).toBeVisible();
  await dialog.locator(`button[data-action="${action}"]`).click();
  await expect(dialog).toHaveCount(0);
};

// `DiceTerm#_roll` is the one fulfillment point every die type shares, so patching it forces every
// die to read `n` while leaving `roll()`'s bookkeeping intact; `gmPage` is worker-scoped, so unrigDie restores rather than deletes the patch.
const rigDie = (page: Page, n: number) =>
  page.evaluate((result: number) => {
    const w = window as any;
    const proto = w.foundry.dice.terms.DiceTerm.prototype;
    w.__unrigDie = proto._roll;
    proto._roll = async () => result;
  }, n);

const unrigDie = (page: Page) =>
  page.evaluate(() => {
    const w = window as any;
    if (w.__unrigDie) w.foundry.dice.terms.DiceTerm.prototype._roll = w.__unrigDie;
    delete w.__unrigDie;
  });

const lastMessageText = (page: Page) =>
  page.evaluate(() => {
    const messages = (window as any).game.messages.contents;
    return String(messages[messages.length - 1]?.content ?? '');
  });

test.describe('the remade core, executed live', () => {
  test.afterEach(async ({ gmPage }) => {
    await unrigDie(gmPage);
    await gmPage.evaluate(async () => {
      for (const app of ((window as any).foundry.applications.instances?.values?.() ?? []) as any[]) {
        await app.close?.();
      }
      const g = (window as any).game;
      await g.user.update({ character: null });
      const actors = g.actors.filter((a: any) => a.name.startsWith('__e2e_')).map((a: any) => a.id);
      if (actors.length) await g.actors.documentClass.deleteDocuments(actors);
    });
  });

  test('a stat check macro that fails costs the Stress the book charges — Strength Check', async ({ gmPage }) => {
    const uuid = await create(gmPage, { stats: { strength: { value: 10 } }, other: { stress: { value: 2 } } });
    await rigDie(gmPage, 95); // 95 ≥ 10: a failure, not a double, so no crit muddies the assertion.

    await runMacro(gmPage, TRIGGERED, 'Strength Check');
    // No dialog: the macro states its modifier and this actor holds no Skill to offer, so there is
    // nothing left to ask.
    await expect(gmPage.locator('dialog[open].macro-popup-dialog')).toHaveCount(0);

    await expect.poll(() => stored(gmPage, uuid, 'system.other.stress.value')).toBe(3);
  });

  test('a table roll macro spends the Wound the book charges — Gunshot Wound', async ({ gmPage }) => {
    const uuid = await create(gmPage, { hits: { value: 0, max: 3 } });

    await runMacro(gmPage, TRIGGERED, 'Gunshot Wound');

    await expect.poll(() => stored(gmPage, uuid, 'system.hits.value')).toBe(1);
  });

  test('a modify macro writes the field it names — +1 Stress', async ({ gmPage }) => {
    const uuid = await create(gmPage, { other: { stress: { value: 4 } } });

    await runMacro(gmPage, TRIGGERED, '+1 Stress');

    await expect.poll(() => stored(gmPage, uuid, 'system.other.stress.value')).toBe(5);
  });

  test('an item grant macro raises the condition it names — +1 Bleeding', async ({ gmPage }) => {
    const uuid = await create(gmPage);

    await runMacro(gmPage, TRIGGERED, '+1 Bleeding');

    const severity = () =>
      gmPage.evaluate(async (u: string) => {
        const actor = await (window as any).fromUuid(u);
        return actor.items.find((i: any) => i.name === 'Bleeding')?.system.severity ?? null;
      }, uuid);
    await expect.poll(severity).toBe(1);
  });

  for (const [label, roll, verdict] of [
    ['succeeds', 5, 'SUCCESS!'],
    ['crits', 11, 'CRITICAL SUCCESS!'],
  ] as const) {
    test(`a Strength Check that ${label} posts a ChatMessage saying so`, async ({ gmPage }) => {
      await create(gmPage, { stats: { strength: { value: 60 } } });
      await rigDie(gmPage, roll);

      await runMacro(gmPage, TRIGGERED, 'Strength Check');

      await expect.poll(() => lastMessageText(gmPage)).toContain(verdict);
    });
  }

  test('a Panic Check that fails posts a Panic result, not a generic table row', async ({ gmPage }) => {
    // PSG 21 — the Panic Die is read against Stress, and only a roll that fails to beat it panics.
    await create(gmPage, { other: { stress: { value: 20 } } });
    await rigDie(gmPage, 19); // 19 against a Stress of 20 fails, and 19 is PSG 21.1's own result.

    await runMacro(gmPage, `mothershiprpg.macros_hotbar_1e`, 'Panic Check');
    await answer(gmPage, 'none');

    await expect.poll(() => lastMessageText(gmPage)).toContain('HEART ATTACK');
  });

  // Only a real Foundry can check this: an enricher renders the button and a hook-bound listener
  // routes its click; binding that listener to the chat *log* left the notification copy's button dead.
  test('a damage button offered by a card rolls the damage in that card', async ({ gmPage }) => {
    await gmPage.evaluate(async () => {
      await (window as any).game.settings.set('mothershiprpg', 'autoRollDamagePlayers', false);
    });

    // This file's cleanup closes every ApplicationV2 there is, the sidebar included, so by now
    // there is no chat UI left to click a button in.
    await gmPage.reload();
    await waitForGameReady(gmPage);

    const uuid = await create(gmPage, { stats: { combat: { value: 90 } } });
    await gmPage.evaluate(async (u: string) => {
      const actor = await (window as any).fromUuid(u);
      await actor.createEmbeddedDocuments('Item', [
        { name: '__e2e_gun', type: 'weapon', system: { damage: '2d10', range: 'close', useAmmo: false } },
      ]);
      // Collapsed, so the card is posted as a notification into `#chat-notifications`, which sits
      // in the UI's right column rather than inside the chat log. That copy is the one under test.
      (window as any).ui.sidebar.collapse();
    }, uuid);

    await rigDie(gmPage, 5); // 5 against Combat 90: a hit, so the card carries the damage offer.
    await gmPage.evaluate(async (u: string) => {
      const actor = await (window as any).fromUuid(u);
      void actor.rollWeapon(actor.items.find((i: any) => i.type === 'weapon').id);
    }, uuid);
    await answer(gmPage, 'none');

    await expect.poll(() => lastMessageText(gmPage)).toContain('Roll the damage you deal');

    const messages = () => gmPage.evaluate(() => (window as any).game.messages.contents.length as number);
    const before = await messages();

    const offered = gmPage.locator('#chat-notifications .chat-message .mothership-action').first();
    await expect(offered).toBeVisible();
    await offered.click();

    await expect.poll(() => lastMessageText(gmPage)).toContain('points of damage');
    expect(await lastMessageText(gmPage)).not.toContain('Roll the damage you deal');
    expect(await messages()).toBe(before);

    // Whose offer it is, asked of Foundry rather than assumed: reads OWNER for the message's
    // author and for any GM, against a real User document rather than a second session.
    const verdicts = await gmPage.evaluate(async () => {
      const w = window as any;
      const player = await w.User.create({ name: '__e2e_player', role: 1 });
      const message = w.game.messages.contents.at(-1);
      try {
        return {
          author: message.canUserModify(w.game.user, 'update'),
          other: message.canUserModify(player, 'update'),
        };
      } finally {
        await player.delete();
      }
    });
    expect(verdicts).toEqual({ author: true, other: false });

    await gmPage.evaluate(async () => {
      await (window as any).game.settings.set('mothershiprpg', 'autoRollDamagePlayers', true);
    });
  });

  // `preCreateActor` wrote token-bar and vision fields the schema discarded, so every created
  // actor shipped with broken bars and no sight.
  test('a created character gets working health bars and vision on its token', async ({ gmPage }) => {
    const uuid = await create(gmPage);

    const token = await stored(gmPage, uuid, 'prototypeToken');

    expect((token as { bar1: { attribute: string } }).bar1.attribute).toBe('health');
    expect((token as { sight: { enabled: boolean } }).sight.enabled).toBe(true);
  });
});
