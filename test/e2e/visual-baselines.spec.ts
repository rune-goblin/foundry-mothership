import { type Locator, type Page } from '@playwright/test';
import { test, expect, waitForGameReady } from './fixtures/foundry-clients.ts';

/**
 * The visual baselines the CSS work is verified against (docs/plans/design-system.md, DS3).
 * Nothing here asserts behaviour — the per-window suites do that. What it captures is every
 * surface `css/mothership.css` paints: the seven windows, the dialog the checks open, and the six
 * chat card templates, each built from documents this file creates, so no pixel depends on what
 * the world happens to hold.
 *
 * Determinism is the whole job, and it is bought in six places:
 *
 *  - The world runs with **no modules**: `scripts/setup-test-env.ts` arms Foundry's own safeMode
 *    on the cloned world, and the first test here asserts the result. A single enabled module —
 *    a timer, in the run that found this — hangs its own `position: fixed` box over the screen.
 *  - `playwright.config.ts` pins the viewport, `maxDiffPixels: 0`, `animations: 'disabled'`,
 *    `caret: 'hide'`, `scale: 'css'` and the capture-only stylesheet (`screenshot.css`).
 *  - `capture()` parks the pointer where no captured element can pick up a hover state, drops
 *    focus, and waits on `document.fonts.ready` — the self-hosted faces are `font-display: swap`,
 *    so a capture taken too early renders in the fallback and every later run disagrees.
 *  - Every die is rigged (`rigDie`) before anything rolls, so a card shows one fixed result.
 *  - The message mode is pinned to public — Foundry paints a whispered card on a different
 *    background — and chat is emptied between tests, which is also what makes "the only message"
 *    a sound way to find the card that was just posted.
 *  - The timestamp Foundry re-renders as "2 minutes ago" is masked. It is the one region in
 *    these captures that cannot be made to hold still.
 *
 * Element screenshots, not page screenshots: a window's own rectangle is what the design system
 * owns, and clipping to it makes the window's position on screen irrelevant.
 */

const VIEWPORT = { width: 1440, height: 900 };

/** The top-right corner: no window reaches it, and the sidebar's tab strip is not captured. */
const POINTER_PARK = { x: VIEWPORT.width - 1, y: 0 };

/* -------------------------------------------- */
/*  Capture                                     */
/* -------------------------------------------- */

async function capture(page: Page, target: Locator, name: string, mask: Locator[] = []): Promise<void> {
  await expect(target).toBeVisible();
  await page.mouse.move(POINTER_PARK.x, POINTER_PARK.y);
  await page.evaluate(async () => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await expect(target).toHaveScreenshot(`${name}.png`, { mask });
}

/* -------------------------------------------- */
/*  World state                                 */
/* -------------------------------------------- */

/**
 * Close the windows, and only the windows. `foundry.applications.instances` holds *every*
 * rendered ApplicationV2 — Foundry's sidebar, chat log, hotbar, players list and scene controls
 * among them, each declared `window: {frame: false}`. Closing those leaves a black page with no
 * chat log for a card to render into, which is why `hasFrame` decides here. AppV1's registry
 * only ever held windows, so it needs no filter.
 */
const closeWindows = (page: Page) =>
  page.evaluate(async () => {
    const w = window as any;
    for (const app of (w.foundry.applications.instances?.values?.() ?? []) as any[]) {
      if (app.hasFrame) await app.close?.();
    }
    for (const app of Object.values(w.ui.windows ?? {}) as any[]) await app.close?.();
  });

const deleteTestDocuments = (page: Page) =>
  page.evaluate(async () => {
    const g = (window as any).game;
    const actors = g.actors.filter((a: any) => a.name.startsWith('__e2e_')).map((a: any) => a.id);
    if (actors.length) await g.actors.documentClass.deleteDocuments(actors);
    const items = g.items.filter((i: any) => i.name.startsWith('__e2e_')).map((i: any) => i.id);
    if (items.length) await g.items.documentClass.deleteDocuments(items);
  });

const clearChat = (page: Page) =>
  page.evaluate(async () => {
    const g = (window as any).game;
    const ids = g.messages.contents.map((m: any) => m.id);
    if (ids.length) await g.messages.documentClass.deleteDocuments(ids);
  });

/**
 * Forces every die to read `n` — the same patch remake.spec.ts uses, restated rather than
 * imported: importing another spec file would register its tests into this one. `DiceTerm#_roll`
 * is the one fulfilment point every die type shares, so `roll()`'s own bookkeeping stays intact.
 */
const rigDie = (page: Page, n: number) =>
  page.evaluate((result: number) => {
    const w = window as any;
    w.__unrigDie ??= w.foundry.dice.terms.DiceTerm.prototype._roll;
    w.foundry.dice.terms.DiceTerm.prototype._roll = async () => result;
  }, n);

/** Puts the real method back: `gmPage` is worker-scoped, so a prototype left patched leaks. */
const unrigDie = (page: Page) =>
  page.evaluate(() => {
    const w = window as any;
    if (w.__unrigDie) w.foundry.dice.terms.DiceTerm.prototype._roll = w.__unrigDie;
    delete w.__unrigDie;
  });

/* -------------------------------------------- */
/*  Fixtures — every value written, none defaulted by chance */
/* -------------------------------------------- */

const CHARACTER = {
  class: { value: 'Marine' },
  rank: { value: 'Corporal' },
  pronouns: { value: 'they/them' },
  credits: { value: '250' },
  attributes: { level: { value: 3 } },
  stats: {
    strength: { value: 45, mod: 5 },
    speed: { value: 30, mod: 0 },
    intellect: { value: 25, mod: 0 },
    combat: { value: 55, mod: 10 },
    sanity: { value: 30, mod: 0 },
    fear: { value: 40, mod: 5 },
    body: { value: 35, mod: 0 },
  },
  health: { value: 8, max: 10 },
  hits: { value: 1, max: 2 },
  other: { stress: { value: 3, min: 2 }, stressdesc: { value: 'Adrenaline surge' } },
  xp: { value: 7, selectedSkill: 'Military Training' },
  notes: '<p>owes the company money</p>',
  biography: '<p>born on Prospero</p>',
};

const CREATURE = {
  stats: {
    combat: { value: 35, enabled: true },
    instinct: { value: 40, enabled: true },
    speed: { value: 25, enabled: true },
    loyalty: { value: 20, enabled: true },
    armor: { value: 5, damageReduction: 1, enabled: true },
    sanity: { value: 15, enabled: true },
  },
  health: { value: 12, max: 15 },
  hits: { value: 1, max: 3 },
  xp: { value: 2 },
  description: '<p>Something in the ducting, and it has learned the door codes.</p>',
  notes: '<p>ate the away team</p>',
};

/** One of each embedded type, so every item panel on both actor sheets draws a row. */
const LOADOUT = [
  { name: '__e2e_Zero-G', type: 'skill', system: { rank: 'Trained', bonus: 10 } },
  {
    name: '__e2e_SMG',
    type: 'weapon',
    system: { damage: '2d10', range: 'close', useAmmo: true, ammo: 4, shots: 6, curShots: 2, weight: 1 },
  },
  {
    name: '__e2e_Vacsuit',
    type: 'armor',
    system: { armorPoints: 3, damageReduction: 1, equipped: true, weight: 2 },
  },
  { name: '__e2e_Rations', type: 'item', system: { quantity: 3, weight: 1, cost: 15 } },
  { name: '__e2e_Bleeding', type: 'condition', system: { severity: 2, treatment: { value: 1 } } },
];

const ITEM_SHEETS = [
  {
    name: 'item-sheet-gear',
    type: 'item',
    system: { quantity: 2, weight: 1, cost: 25, description: '<p>A patch kit, half used.</p>' },
  },
  {
    name: 'item-sheet-weapon',
    type: 'weapon',
    system: {
      damage: '2d10',
      range: 'close',
      useAmmo: true,
      ammo: 4,
      shots: 6,
      curShots: 2,
      shotsPerFire: 1,
      bonus: 5,
      weight: 1,
      cost: 400,
      description: '<p>Standard issue, and it jams.</p>',
    },
  },
  {
    name: 'item-sheet-armor',
    type: 'armor',
    system: {
      armorPoints: 3,
      damageReduction: 1,
      equipped: true,
      weight: 2,
      cost: 300,
      description: '<p>Scuffed, resealed twice.</p>',
    },
  },
  {
    name: 'item-sheet-ability',
    type: 'ability',
    system: { roll: '1d10', description: '<p>Hold your breath and count.</p>' },
  },
  {
    name: 'item-sheet-condition',
    type: 'condition',
    system: {
      severity: 2,
      treatment: { value: 1 },
      modifiers: [
        { scope: 'strength', modifier: 'disadvantage' },
        { scope: 'fear', modifier: 'disadvantage' },
      ],
      description: '<p>Bleeding through the bandage, and getting worse.</p>',
    },
  },
] as const;

/* -------------------------------------------- */
/*  Openers                                     */
/* -------------------------------------------- */

type Opened = { appId: string; uuid: string };

const openActor = async (
  page: Page,
  type: string,
  name: string,
  system: object,
  items: object[] = [],
): Promise<Opened> => {
  const opened = await page.evaluate(
    async ({ t, n, s, i }: { t: string; n: string; s: object; i: object[] }) => {
      const doc = await (window as any).Actor.create({ name: n, type: t, system: s, items: i });
      await doc.sheet.render({ force: true });
      return { appId: doc.sheet.id as string, uuid: doc.uuid as string };
    },
    { t: type, n: name, s: system, i: items },
  );
  await expect(page.locator(`#${opened.appId}`)).toBeVisible();
  return opened;
};

const openItem = async (page: Page, type: string, name: string, system: object): Promise<Opened> => {
  const opened = await page.evaluate(
    async ({ t, n, s }: { t: string; n: string; s: object }) => {
      const doc = await (window as any).Item.create({ name: n, type: t, system: s });
      await doc.sheet.render({ force: true });
      return { appId: doc.sheet.id as string, uuid: doc.uuid as string };
    },
    { t: type, n: name, s: system },
  );
  await expect(page.locator(`#${opened.appId}`)).toBeVisible();
  return opened;
};

/** The actor without its sheet: a card is posted by the document, not by a window. */
const makeActor = (page: Page, name: string, system: object, items: object[] = []): Promise<string> =>
  page.evaluate(
    async ({ n, s, i }: { n: string; s: object; i: object[] }) => {
      const doc = await (window as any).Actor.create({ name: n, type: 'character', system: s, items: i });
      return doc.uuid as string;
    },
    { n: name, s: system, i: items },
  );

const firstItemId = (page: Page, uuid: string, name: string): Promise<string> =>
  page.evaluate(
    async ({ u, n }: { u: string; n: string }) => {
      const actor = await (window as any).fromUuid(u);
      return actor.items.find((item: any) => item.name === n).id as string;
    },
    { u: uuid, n: name },
  );

/**
 * The card that was just posted. Chat is emptied first, so "the only message" is unambiguous —
 * and scoping to the sidebar keeps the notification copy of the same message out of the match.
 */
const postedCard = async (page: Page): Promise<Locator> => {
  await expect
    .poll(() => page.evaluate(() => (window as any).game.messages.contents.length as number))
    .toBe(1);
  const id = await page.evaluate(() => (window as any).game.messages.contents[0].id as string);
  return page.locator(`#sidebar .chat-message[data-message-id="${id}"]`);
};

const captureCard = async (page: Page, name: string): Promise<void> => {
  const card = await postedCard(page);
  await capture(page, card, name, [card.locator('.message-timestamp')]);
};

/* -------------------------------------------- */

test.describe('visual baselines', () => {
  let messageMode: string;

  test.beforeAll(async ({ gmPage }) => {
    // Every other spec file's cleanup closes every ApplicationV2 there is, Foundry's own
    // frameless UI included, and `gmPage` is worker-scoped — so by the time this file runs there
    // may be no sidebar left to render a chat card into. One reload buys back the interface a
    // player actually sees, which is the only interface these baselines should be of.
    await gmPage.reload();
    await waitForGameReady(gmPage);
    // The fixture's own toast-hiding tag does not survive a navigation.
    await gmPage.addStyleTag({ content: '#notifications { display: none !important; }' });

    await gmPage.emulateMedia({ reducedMotion: 'reduce' });
    messageMode = await gmPage.evaluate(() => (window as any).game.settings.get('core', 'messageMode') as string);
    await gmPage.evaluate(() => (window as any).game.settings.set('core', 'messageMode', 'public'));
    // The cards live in the sidebar's chat tab; nothing else in the suite depends on which tab
    // is up, so this is set once rather than restored.
    await gmPage.evaluate(() => {
      const sidebar = (window as any).ui.sidebar;
      sidebar.expand();
      sidebar.changeTab('chat', 'primary');
    });
  });

  test.afterAll(async ({ gmPage }) => {
    // gmPage is worker-scoped: anything set here outlives this file unless it is put back.
    await gmPage.emulateMedia({ reducedMotion: null });
    await gmPage.evaluate(
      (mode: string) => (window as any).game.settings.set('core', 'messageMode', mode),
      messageMode,
    );
  });

  test.afterEach(async ({ gmPage }) => {
    await unrigDie(gmPage);
    await closeWindows(gmPage);
    await deleteTestDocuments(gmPage);
    await clearChat(gmPage);
  });

  // Every baseline below is a claim about pixels, and each of these silently changes what a pixel
  // is. A font that failed to load renders the whole system in Signika and still passes a text
  // assertion; an active module paints its own CSS over ours, and the one that was enabled here
  // hung a `position: fixed` timer across the top of the screen. `scripts/setup-test-env.ts` arms
  // the world's safeMode so Foundry drops every module on launch — this is the receipt.
  test('the capture environment is pinned: no modules, viewport, fonts, public messages', async ({
    gmPage,
  }) => {
    const active = await gmPage.evaluate(() =>
      Array.from((window as any).game.modules.values() as any[])
        .filter((module) => module.active)
        .map((module) => module.id as string),
    );
    expect(active).toEqual([]);

    expect(gmPage.viewportSize()).toEqual(VIEWPORT);

    await openActor(gmPage, 'character', '__e2e_fonts', CHARACTER);
    const families = await gmPage.evaluate(async () => {
      await document.fonts.ready;
      return Array.from(document.fonts)
        .filter((face) => face.status === 'loaded')
        // Chromium hands back the family name as the stylesheet spelled it, quotes and all.
        .map((face) => face.family.replace(/^['"]|['"]$/g, ''));
    });
    expect(families).toContain('Chakra Petch');
    expect(families).toContain('Barlow');

    const mode = await gmPage.evaluate(() => (window as any).game.settings.get('core', 'messageMode') as string);
    expect(mode).toBe('public');
  });

  /* ------------------------------------------ */
  /*  The seven windows                         */
  /* ------------------------------------------ */

  test('the character sheet', async ({ gmPage }) => {
    const { appId } = await openActor(gmPage, 'character', '__e2e_character', CHARACTER, LOADOUT);
    const sheet = gmPage.locator(`#${appId}`);

    await capture(gmPage, sheet, 'window-character-sheet-skills');

    // The item panels — ItemList/ItemRow/ItemCell/ItemControls — only draw on a list tab.
    await sheet.locator('a.tab-select[data-tab="weapons"]').click();
    await expect(sheet.locator('.tab[data-tab="weapons"]')).toBeVisible();
    await capture(gmPage, sheet, 'window-character-sheet-weapons');
  });

  test('the creature sheet', async ({ gmPage }) => {
    const { appId } = await openActor(gmPage, 'creature', '__e2e_creature', CREATURE, LOADOUT);
    await capture(gmPage, gmPage.locator(`#${appId}`), 'window-creature-sheet');
  });

  for (const fixture of ITEM_SHEETS) {
    test(`the ${fixture.type} sheet`, async ({ gmPage }) => {
      const { appId } = await openItem(gmPage, fixture.type, `__e2e_${fixture.type}`, fixture.system);
      await capture(gmPage, gmPage.locator(`#${appId}`), `window-${fixture.name}`);
    });
  }

  test('the class sheet', async ({ gmPage }) => {
    const { appId } = await openItem(gmPage, 'class', '__e2e_class', {
      description: '<p>Marines are trained to kill and to die.</p>',
      trauma_response: 'Whenever you Panic, every close friendly must make a Fear Save.',
      robotic: false,
      base_adjustment: { combat: 10, fear: 20, sanity: -10, max_wounds: 2 },
    });
    await capture(gmPage, gmPage.locator(`#${appId}`), 'window-class-sheet');
  });

  test('the skill sheet', async ({ gmPage }) => {
    const { appId } = await openItem(gmPage, 'skill', '__e2e_skill', {
      description: '<p>Moving and working in microgravity.</p>',
      rank: 'Trained',
      bonus: 10,
    });
    await capture(gmPage, gmPage.locator(`#${appId}`), 'window-skill-sheet');
  });

  test('the creature settings window', async ({ gmPage }) => {
    const { uuid } = await openActor(gmPage, 'creature', '__e2e_creature_settings', CREATURE);
    await gmPage.evaluate(async (u: string) => {
      const doc = await (window as any).fromUuid(u);
      doc.sheet.configureCreature();
      await doc.sheet.close();
    }, uuid);
    await capture(gmPage, gmPage.locator('.application.creature-settings'), 'window-creature-settings');
  });

  // The wizard's first pane, which is the one that holds still: every later pane shows rolled
  // numbers or a compendium scan's results.
  test('the character creation wizard', async ({ gmPage }) => {
    const { uuid } = await openActor(gmPage, 'character', '__e2e_recruit', CHARACTER);
    // The sheet is only the way in; closing it leaves the wizard alone on screen, so the
    // capture cannot depend on which window Foundry stacked on top.
    await gmPage.evaluate(async (u: string) => {
      const actor = await (window as any).fromUuid(u);
      actor.sheet.generateCharacter();
      await actor.sheet.close();
    }, uuid);
    const wizard = gmPage.locator('.application:has(form.character-wizard)');
    await expect(wizard).toHaveCount(1);
    await capture(gmPage, wizard, 'window-generator');
  });

  test('the rolltable configuration window', async ({ gmPage }) => {
    await gmPage.evaluate(async () => {
      const g = (window as any).game;
      // The window renders whatever the world stores, so the world is put back on the shipped
      // defaults first — another spec's leftover id would otherwise rewrite the baseline.
      for (const [key, setting] of g.settings.settings.entries() as Iterable<[string, any]>) {
        if (key.startsWith('mothershiprpg.table')) {
          await g.settings.set('mothershiprpg', key.slice('mothershiprpg.'.length), setting.default);
        }
      }
      // Exactly the construction game.settings.registerMenu performs; the menu path itself is
      // rolltable-config.spec.ts's assertion, and it would put the settings window in the shot.
      const menu = g.settings.menus.get('mothershiprpg.rolltableSelector');
      await new menu.type().render({ force: true });
    });
    await capture(gmPage, gmPage.locator('#rolltable-modifiers'), 'window-rolltable-config');
  });

  /* ------------------------------------------ */
  /*  The six chat cards, and the dialog        */
  /* ------------------------------------------ */

  // rollCheck.html, plus the dialog every character check opens on the way to it. `.mothership`
  // reaches that dialog through svelte-dialog.ts's CLASSES, so it is a styled surface with no
  // window of its own.
  test('the skill dialog and the rollCheck card', async ({ gmPage }) => {
    const uuid = await makeActor(gmPage, '__e2e_check', CHARACTER, [LOADOUT[0]!]);
    await rigDie(gmPage, 5); // 5 against Strength 45+5: a success, so no Stress line is added.

    // Unawaited on purpose: the call does not settle until the dialog is answered.
    await gmPage.evaluate(async (u: string) => {
      const actor = await (window as any).fromUuid(u);
      void actor.rollStat('strength');
    }, uuid);

    const dialog = gmPage.locator('dialog[open].macro-popup-dialog');
    await capture(gmPage, dialog, 'dialog-skill-check');

    await dialog.locator('button[data-action="none"]').click();
    await expect(dialog).toHaveCount(0);
    await captureCard(gmPage, 'card-rollCheck');
  });

  // rollTable.html — a Wound table, which is also the flow that spends a Wound.
  test('the rollTable card', async ({ gmPage }) => {
    const uuid = await makeActor(gmPage, '__e2e_table', CHARACTER);
    await rigDie(gmPage, 3);

    await gmPage.evaluate(async (u: string) => {
      const actor = await (window as any).fromUuid(u);
      await actor.rollTable('gunshot', { advantage: 'none' });
    }, uuid);

    await captureCard(gmPage, 'card-rollTable');
  });

  // modifyActor.html — what every `+N` macro posts.
  test('the modifyActor card', async ({ gmPage }) => {
    const uuid = await makeActor(gmPage, '__e2e_modify', CHARACTER);

    await gmPage.evaluate(async (u: string) => {
      const actor = await (window as any).fromUuid(u);
      await actor.modify('system.other.stress.value', { kind: 'amount', amount: 1 });
    }, uuid);

    await captureCard(gmPage, 'card-modifyActor');
  });

  // modifyItem.html — the card a granted Condition posts.
  test('the modifyItem card', async ({ gmPage }) => {
    const uuid = await makeActor(gmPage, '__e2e_grant', CHARACTER);

    await gmPage.evaluate(async (u: string) => {
      const actor = await (window as any).fromUuid(u);
      const condition = await (window as any).Item.create({
        name: '__e2e_Frightened',
        type: 'condition',
        system: { severity: 1, description: '<p>Disadvantage on Fear Saves.</p>' },
      });
      await actor.applyItem(condition, 1);
    }, uuid);

    await captureCard(gmPage, 'card-modifyItem');
  });

  // reload.html — posted only when rounds actually move, so the magazine starts empty.
  test('the reload card', async ({ gmPage }) => {
    const weapon = {
      name: '__e2e_Reloader',
      type: 'weapon',
      system: { damage: '1d10', range: 'close', useAmmo: true, ammo: 12, shots: 6, curShots: 0 },
    };
    const uuid = await makeActor(gmPage, '__e2e_reload', CHARACTER, [weapon]);
    const itemId = await firstItemId(gmPage, uuid, weapon.name);

    await gmPage.evaluate(
      async ({ u, i }: { u: string; i: string }) => {
        const actor = await (window as any).fromUuid(u);
        await actor.reloadWeapon(i);
      },
      { u: uuid, i: itemId },
    );

    await captureCard(gmPage, 'card-reload');
  });

  // itemRoll.html — an item's description, printed to chat.
  test('the itemRoll card', async ({ gmPage }) => {
    const gear = {
      name: '__e2e_Flashlight',
      type: 'item',
      system: { quantity: 1, weight: 1, cost: 30, description: '<p>Throws light 20m. Batteries not included.</p>' },
    };
    const uuid = await makeActor(gmPage, '__e2e_description', CHARACTER, [gear]);
    const itemId = await firstItemId(gmPage, uuid, gear.name);

    await gmPage.evaluate(
      async ({ u, i }: { u: string; i: string }) => {
        const actor = await (window as any).fromUuid(u);
        await actor.printDescription(i);
      },
      { u: uuid, i: itemId },
    );

    await captureCard(gmPage, 'card-itemRoll');
  });
});
