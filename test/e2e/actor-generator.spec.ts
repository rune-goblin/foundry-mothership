import { type Page } from '@playwright/test';
import { test, expect } from './fixtures/foundry-clients.ts';

// S5's capstone. The character generator has never had data to work with: it scans compendia for
// class and skill documents, and until S3 no pack shipped either. This drives the converted window
// end to end against the real Foundry -- open it from the AppV1 actor sheet, choose a Marine,
// answer its skill dialogs, roll everything, save -- and asserts what landed on the actor.
//
// The loadout is the part that matters most. The emitted rows link several gear documents each
// (MODERNIZATION.md §27) and the AppV1 generator kept only the last link, so a three-item row
// handed out one item.

// Foundry rolls a face as ceil((1 - randomUniform()) * faces), so a value just under 1 pins every
// die to 1 -- stats 27, saves 12, health 11, credits 20, and row 0 of every table.
const LOWEST_FACE = 0.9999;

/** Every roll in the window, fixed, so the assertions can name exact numbers and an exact row. */
const freezeDice = (page: Page, value: number) =>
  page.evaluate((v: number) => {
    (window as any).CONFIG.Dice.randomUniform = () => v;
  }, value);

const thawDice = (page: Page) =>
  page.evaluate(() => {
    delete (window as any).CONFIG.Dice.randomUniform;
  });

const closeEverything = (page: Page) =>
  page.evaluate(async () => {
    const w = window as any;
    for (const app of w.foundry.applications.instances.values()) await app.close?.();
    // The actor sheet is still AppV1 until S7, and those live in ui.windows, not that map.
    for (const app of Object.values(w.ui.windows ?? {}) as any[]) await app.close?.();
  });

const openGenerator = async (page: Page, system: Record<string, unknown> = {}) => {
  // Leave no other sheet open: the header button is found by selector, and a leftover one belongs
  // to another actor.
  await closeEverything(page);
  const uuid = await page.evaluate(async (s: Record<string, unknown>) => {
    const actor = await (window as any).Actor.create({ name: '__e2e_recruit', type: 'character', system: s });
    await actor.sheet.render(true);
    return actor.uuid as string;
  }, system);
  // The real header button, clicked in the page — Playwright's own click never reaches it, because
  // the AppV1 header is draggable and swallows a synthesized mousedown/mouseup pair. The retry is
  // for the other half: that sheet finishes wiring its header a beat after `render` resolves, so a
  // click landing too early does nothing at all.
  await expect(async () => {
    if (!(await page.locator('form.actor-generator').count())) {
      await page.evaluate(() =>
        (document.querySelector('a.configure-actor') as HTMLElement | null)?.click(),
      );
    }
    expect(await page.locator('form.actor-generator').count()).toBe(1);
  }).toPass({ timeout: 20_000, intervals: [500] });
  return uuid;
};

/** The class field is a datalist: typing a class name and committing it applies that class. */
const chooseClass = async (page: Page, name: string) => {
  await page.fill('input[name="class"]', name);
  // blur(), not a dispatched change: filling alone leaves the field focused, and the native change
  // then fires on the *next* action -- applying the class a second time.
  await page.locator('input[name="class"]').blur();
};

const stored = (page: Page, uuid: string, path: string): Promise<any> =>
  page.evaluate(
    async ({ u, p }: { u: string; p: string }) =>
      (window as any).foundry.utils.getProperty((await (window as any).fromUuid(u)).toObject(), p),
    { u: uuid, p: path },
  );

const items = (page: Page, uuid: string): Promise<{ name: string; type: string; quantity: number }[]> =>
  page.evaluate(async (u: string) => {
    const actor = await (window as any).fromUuid(u);
    return actor.items.map((i: any) => ({
      name: i.name,
      type: i.type,
      quantity: i.system.quantity ?? 1,
    }));
  }, uuid);

test.describe('character generator', () => {
  test.afterEach(async ({ gmPage }) => {
    await thawDice(gmPage);
    await closeEverything(gmPage);
    await gmPage.evaluate(async () => {
      const g = (window as any).game;
      const ids = g.actors.filter((a: any) => a.name.startsWith('__e2e_')).map((a: any) => a.id);
      if (ids.length) await g.actors.documentClass.deleteDocuments(ids);
    });
  });

  test('opens from the actor sheet header and lists the shipped classes', async ({ gmPage }) => {
    await openGenerator(gmPage);

    const options = await gmPage.$$eval('#class_options option', (nodes) =>
      nodes.map((n) => (n as HTMLOptionElement).value),
    );
    expect(options.sort()).toEqual(['Android', 'Marine', 'Scientist', 'Teamster']);
  });

  test('generates a Marine, and its three-item loadout row becomes three items', async ({ gmPage }) => {
    // Stress has drifted from where the book starts it, which is the case that shows whether the
    // generator writes it or leaves it to the schema's defaults.
    const uuid = await openGenerator(gmPage, { other: { stress: { value: 9, min: 4 } } });
    // Row 0 of the Marine loadouts is "Tank Top and Camo Pants, Combat Knife, Stimpak".
    await freezeDice(gmPage, LOWEST_FACE);

    await chooseClass(gmPage, 'Marine');

    // The Marine's bonus skills are a choice of two packages; take the two Trained skills, then
    // pick one in each dialog the choice opens.
    await gmPage.click('dialog[open] button[data-action="option-1"]');
    for (let i = 0; i < 2; i += 1) {
      await gmPage.waitForSelector('dialog[open] select#skill-Trained');
      await gmPage.selectOption('dialog[open] select#skill-Trained', { index: i + 1 });
      await gmPage.click('dialog[open] button[data-action="save"]');
    }

    await expect(gmPage.locator('ul[data-list="skills"] li')).toHaveCount(4);

    await gmPage.click('img[data-roll="everything"]');
    await expect(gmPage.locator('input[data-value="loadout"]')).toHaveValue('0');
    await expect(gmPage.locator('ul[data-list="loadout"] li')).toHaveCount(3);

    await gmPage.click('img[data-action="save"]');
    await gmPage.waitForSelector('form.actor-generator', { state: 'detached' });

    // Marine: +10 COMBAT, +10 BODY SAVE, +20 FEAR SAVE, +1 MAX WOUNDS.
    expect(await stored(gmPage, uuid, 'system.stats.strength.value')).toBe(27);
    expect(await stored(gmPage, uuid, 'system.stats.combat.value')).toBe(37);
    expect(await stored(gmPage, uuid, 'system.stats.sanity.value')).toBe(12);
    expect(await stored(gmPage, uuid, 'system.stats.body.value')).toBe(22);
    expect(await stored(gmPage, uuid, 'system.stats.fear.value')).toBe(32);
    expect(await stored(gmPage, uuid, 'system.health.max')).toBe(11);
    expect(await stored(gmPage, uuid, 'system.health.value')).toBe(11);
    expect(await stored(gmPage, uuid, 'system.hits.max')).toBe(3);
    expect(await stored(gmPage, uuid, 'system.credits.value')).toBe('20');
    expect(await stored(gmPage, uuid, 'system.class.value')).toBe('Marine');
    expect(await stored(gmPage, uuid, 'system.other.stressdesc.value')).toMatch(/\S/);

    // PSG step 5: current Stress and Minimum Stress both start at 2.
    expect(await stored(gmPage, uuid, 'system.other.stress.value')).toBe(2);
    expect(await stored(gmPage, uuid, 'system.other.stress.min')).toBe(2);

    const carried = await items(gmPage, uuid);
    expect(carried.filter((i) => i.type === 'skill')).toHaveLength(4);

    // The row links armour, a weapon and a piece of equipment, under the names the book prints
    // for them; all three must arrive, as the documents they resolve to.
    const gear = carried.filter((i) => i.type !== 'skill').map((i) => i.name).sort();
    expect(gear).toEqual(['Scalpel', 'Stimpak', 'Tank Top and Camo Pants']);
  });

  test('a class replaces the one before it rather than stacking on it', async ({ gmPage }) => {
    const uuid = await openGenerator(gmPage);
    await freezeDice(gmPage, LOWEST_FACE);

    // The Teamster grants its bonus skills outright: 1 Trained and 1 Expert, no choice dialog.
    // The Trained pick comes first, which is what makes an Expert available to pick at all.
    await chooseClass(gmPage, 'Teamster');
    for (const rank of ['Trained', 'Expert']) {
      await gmPage.waitForSelector(`dialog[open] select#skill-${rank}`);
      await gmPage.selectOption(`dialog[open] select#skill-${rank}`, { index: 1 });
      await gmPage.click('dialog[open] button[data-action="save"]');
    }
    // +5 to all stats and saves, so every bonus box reads 5.
    await expect(gmPage.locator('input[data-bonus="combat"]')).toHaveValue('5');

    await chooseClass(gmPage, 'Android');
    // The Android's "-10 to 1 stat" is a choice; spend it on Speed.
    await gmPage.click('dialog[open] button[data-action="speed"]');
    await gmPage.click('dialog[open] button[data-action="option-1"]');
    for (let i = 0; i < 2; i += 1) {
      await gmPage.waitForSelector('dialog[open] select#skill-Trained');
      await gmPage.selectOption('dialog[open] select#skill-Trained', { index: i + 1 });
      await gmPage.click('dialog[open] button[data-action="save"]');
    }

    // The Teamster's +5 is gone rather than added to: Android is +20 INTELLECT, +60 FEAR.
    await expect(gmPage.locator('input[data-bonus="intellect"]')).toHaveValue('20');
    await expect(gmPage.locator('input[data-bonus="fear"]')).toHaveValue('60');
    await expect(gmPage.locator('input[data-bonus="speed"]')).toHaveValue('-10');
    await expect(gmPage.locator('input[data-bonus="combat"]')).toHaveValue('0');
    // Three granted plus the two chosen, not the Teamster's on top.
    await expect(gmPage.locator('ul[data-list="skills"] li')).toHaveCount(5);

    await gmPage.click('img[data-roll="strength"]');
    await gmPage.click('img[data-action="save"]');
    await gmPage.waitForSelector('form.actor-generator', { state: 'detached' });

    expect(await stored(gmPage, uuid, 'system.stats.strength.value')).toBe(27);
    expect(await stored(gmPage, uuid, 'system.class.value')).toBe('Android');
    // Nothing else was rolled, so nothing else was written.
    expect(await stored(gmPage, uuid, 'system.stats.combat.value')).toBe(10);
  });

  test('rolling a patch no longer throws on a row that links nothing', async ({ gmPage }) => {
    await openGenerator(gmPage);
    await freezeDice(gmPage, LOWEST_FACE);

    await chooseClass(gmPage, 'Teamster');
    for (const rank of ['Trained', 'Expert']) {
      await gmPage.waitForSelector(`dialog[open] select#skill-${rank}`);
      await gmPage.selectOption(`dialog[open] select#skill-${rank}`, { index: 1 });
      await gmPage.click('dialog[open] button[data-action="save"]');
    }

    await gmPage.click('img[data-roll="patch"]');
    await expect(gmPage.locator('input[data-value="patch"]')).toHaveValue('0');
    await expect(gmPage.locator('input[data-text="patch"]')).not.toHaveValue('');
  });
});
