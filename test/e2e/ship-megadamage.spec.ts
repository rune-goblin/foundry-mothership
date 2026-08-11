import { test, expect } from './fixtures/foundry-clients.ts';

// The megadamage tracker lives on the SBT ship sheet's own sidebar tab; the DLShipMegaDamage
// popout that duplicated it was deleted (its trigger had been commented out for years).
//
// `system.megadamage.hits` is an ArrayField(StringField), so a stored hit is always a string.
// Both the render check and the toggle compared it against the numeric index that jQuery's
// `.data("key")` yields, and never matched: every taken hit drew hollow, and re-clicking one
// appended a duplicate instead of clearing it. These specs are the net for that.
//
// The sheet is still AppV1 (conversion-order item 6). Asserting on the generated
// `system.megadamage.html` rather than the DOM keeps this spec meaningful across that
// conversion: what matters is which entries come out filled.

const openShip = (page: any) =>
  page.evaluate(async () => {
    const actor = await (window as any).Actor.create({ name: '__e2e_md_ship', type: 'ship' });
    await actor.sheet.render(true);
    await new Promise((r) => setTimeout(r, 1000));
    return actor.uuid as string;
  });

const rendered = (page: any, uuid: string) =>
  page.evaluate(async (u: string) => {
    const actor = await (window as any).fromUuid(u);
    await actor.sheet.render(false);
    await new Promise((r) => setTimeout(r, 1000));
    const html = actor.toObject().system.megadamage.html ?? '';
    return {
      hits: actor.toObject().system.megadamage.hits,
      filled: [...html.matchAll(/<i class="fas fa-circle[^"]*"[^>]*data-key="(\d+)"/g)].map(
        (m: any) => m[1],
      ),
      hollow: (html.match(/far fa-circle/g) ?? []).length,
    };
  }, uuid);

test.describe('ship megadamage tracker', () => {
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

  test('a fresh ship has no hits and draws every entry hollow', async ({ gmPage }) => {
    const uuid = await openShip(gmPage);
    const state = await rendered(gmPage, uuid);

    expect(state.hits).toEqual([]);
    expect(state.filled).toEqual([]);
    expect(state.hollow).toBeGreaterThan(0);
  });

  test('a stored hit renders filled', async ({ gmPage }) => {
    const uuid = await openShip(gmPage);
    await gmPage.evaluate(
      async (u: string) => (await (window as any).fromUuid(u)).update({ 'system.megadamage.hits': ['3'] }),
      uuid,
    );

    const state = await rendered(gmPage, uuid);
    // The schema stores strings; comparing them to the numeric index drew this hollow.
    expect(state.hits).toEqual(['3']);
    expect(state.filled).toEqual(['3']);
  });

  test('a hit written as a number is stored as a string and still renders filled', async ({
    gmPage,
  }) => {
    const uuid = await openShip(gmPage);
    // This is what the click handler used to push: jQuery's .data() coerces data-key to a Number.
    await gmPage.evaluate(
      async (u: string) => (await (window as any).fromUuid(u)).update({ 'system.megadamage.hits': [5] }),
      uuid,
    );

    const state = await rendered(gmPage, uuid);
    expect(state.hits).toEqual(['5']);
    expect(state.filled).toEqual(['5']);
  });

  test('clicking a circle records the hit, and clicking it again clears it', async ({ gmPage }) => {
    const uuid = await openShip(gmPage);
    const appId = await gmPage.evaluate(
      async (u: string) => (await (window as any).fromUuid(u)).sheet.id as string,
      uuid,
    );
    // The handler is a delegated jQuery `mousedown`. Dispatching it beats clicking: the sheet
    // writes megadamage.html back to the document while rendering, so it re-renders on every
    // change and Playwright never sees the circle hold still long enough to be "stable".
    const toggle = () =>
      gmPage.evaluate((id: string) => {
        const circle = document
          .getElementById(id)!
          .querySelector('.megadamage-list i[data-key="4"]')!;
        circle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      }, appId);

    await toggle();
    await expect.poll(async () => (await rendered(gmPage, uuid)).hits).toEqual(['4']);
    expect((await rendered(gmPage, uuid)).filled).toEqual(['4']);

    await toggle();
    // The old handler appended a duplicate here instead of removing the hit.
    await expect
      .poll(async () => (await rendered(gmPage, uuid)).hits)
      .toEqual([]);
  });
});
