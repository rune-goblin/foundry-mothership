import { type Page } from '@playwright/test';
import { test, expect } from './fixtures/foundry-clients.ts';

// S5's capstone, walked one step at a time. The character generator has never had data to work
// with: it scans compendia for class and skill documents, and until S3 no pack shipped either.
// This drives the wizard end to end against the real Foundry -- reach it from the create dialog,
// choose a Marine, answer its skill dialogs, roll each step, finish -- and asserts what landed on
// the actor.
//
// The loadout is the part that matters most. The emitted rows link several gear documents each
// and the AppV1 generator kept only the last link, so a three-item row
// handed out one item.

// Foundry rolls a face as ceil((1 - randomUniform()) * faces), so a value just under 1 pins every
// die to 1 -- stats 27, saves 12, health 11, credits 20, and row 0 of every table.
const LOWEST_FACE = 0.9999;

/**
 * Every roll in the window, fixed, so the assertions can name exact numbers and an exact row.
 * `randomUniform` is Foundry's own function on `CONFIG.Dice`, so thawing has to put that function
 * back: deleting the patch leaves the key undefined and every later die in the worker — `gmPage`
 * is worker-scoped — throws `randomUniform is not a function` instead of rolling.
 */
const freezeDice = (page: Page, value: number) =>
  page.evaluate((v: number) => {
    const dice = (window as any).CONFIG.Dice;
    (window as any).__randomUniform ??= dice.randomUniform;
    dice.randomUniform = () => v;
  }, value);

const thawDice = (page: Page) =>
  page.evaluate(() => {
    const w = window as any;
    if (w.__randomUniform) w.CONFIG.Dice.randomUniform = w.__randomUniform;
  });

const closeEverything = (page: Page) =>
  page.evaluate(async () => {
    const w = window as any;
    for (const app of w.foundry.applications.instances.values()) await app.close?.();
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
  // The entry is a header control under the ellipsis rather than a title-bar button. Calling the
  // sheet's own method skips the two-step menu, and the control itself is covered by
  // character-sheet.spec.ts.
  await page.evaluate(async (u: string) => {
    const actor = await (window as any).fromUuid(u);
    actor.sheet.generateCharacter();
  }, uuid);
  await expect(page.locator('form.character-wizard')).toHaveCount(1);
  return uuid;
};

/** The rail is the navigation: every pane is one click away, up to the class gate. */
const goTo = async (page: Page, pane: string) => {
  await page.click(`button.wizard-rail-step[data-pane="${pane}"]`);
  await expect(page.locator(`section.wizard-pane[data-pane="${pane}"]`)).toHaveCount(1);
};

const chooseClass = async (page: Page, name: string) => {
  await goTo(page, 'class');
  await page.click(`button.wizard-class[data-class="${name}"]`);
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

  // The wizard's front door: creating a character offers it, and taking the offer opens it over
  // the sheet the create dialog had already rendered.
  test('a new character is offered the wizard, and taking it opens the window', async ({ gmPage }) => {
    await closeEverything(gmPage);
    await gmPage.evaluate(() => {
      void (window as any).Actor.implementation.createDialog({ name: '__e2e_offered', type: 'character' });
    });
    await gmPage.click('dialog[open] button[data-action="ok"]');

    await gmPage.click('dialog[open] button[data-action="wizard"]');
    await expect(gmPage.locator('form.character-wizard')).toHaveCount(1);
    // The intro is the first pane, and it is the book's own.
    await expect(gmPage.locator('section.wizard-pane[data-pane="intro"]')).toHaveCount(1);
  });

  test('the rail walks the book, and step 3 lists the shipped classes', async ({ gmPage }) => {
    await openGenerator(gmPage);

    const rail = await gmPage.$$eval('button.wizard-rail-step', (nodes) =>
      nodes.map((n) => (n as HTMLElement).dataset.pane),
    );
    expect(rail).toEqual([
      'intro', 'stats', 'saves', 'class', 'health', 'stress', 'trauma', 'skills', 'gear', 'finish',
    ]);

    await goTo(gmPage, 'class');
    const options = await gmPage.$$eval('button.wizard-class .wizard-class-name', (nodes) =>
      nodes.map((n) => n.textContent),
    );
    expect(options.sort()).toEqual(['Android', 'Marine', 'Scientist', 'Teamster']);
  });

  // Everything from step 4 on reads the class, so the rail refuses to walk past step 3 without one.
  test('the rail gates every step after the class on having one', async ({ gmPage }) => {
    await openGenerator(gmPage);

    await expect(gmPage.locator('button.wizard-rail-step[data-pane="health"]')).toBeDisabled();
    await expect(gmPage.locator('button.wizard-rail-step[data-pane="saves"]')).toBeEnabled();

    await freezeDice(gmPage, LOWEST_FACE);
    await chooseClass(gmPage, 'Teamster');
    for (const rank of ['Trained', 'Expert']) {
      await gmPage.waitForSelector(`dialog[open] select#skill-${rank}`);
      await gmPage.selectOption(`dialog[open] select#skill-${rank}`, { index: 1 });
      await gmPage.click('dialog[open] button[data-action="save"]');
    }

    await expect(gmPage.locator('button.wizard-rail-step[data-pane="health"]')).toBeEnabled();
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

    await goTo(gmPage, 'skills');
    await expect(gmPage.locator('ul[data-list="skills"] li')).toHaveCount(4);

    for (const pane of ['stats', 'saves']) {
      await goTo(gmPage, pane);
      await gmPage.click('button[data-roll="all"]');
    }
    await goTo(gmPage, 'health');
    await gmPage.click('img[data-roll="health"]');
    await expect(gmPage.locator('input[data-value="wounds"]')).toHaveValue('3');

    await goTo(gmPage, 'gear');
    await gmPage.click('button[data-roll="all"]');
    await expect(gmPage.locator('input[data-value="loadout"]')).toHaveValue('0');
    await expect(gmPage.locator('ul[data-list="loadout"] li')).toHaveCount(3);

    await goTo(gmPage, 'finish');
    await gmPage.fill('input[name="pronouns"]', 'they/them');
    await gmPage.click('button[data-action="save"]');
    await gmPage.waitForSelector('form.character-wizard', { state: 'detached' });

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

    // PSG step 9 asks for the pronouns beside the name, so the last pane collects both.
    expect(await stored(gmPage, uuid, 'system.pronouns.value')).toBe('they/them');

    // PSG step 5: current Stress and Minimum Stress both start at 2.
    expect(await stored(gmPage, uuid, 'system.other.stress.value')).toBe(2);
    expect(await stored(gmPage, uuid, 'system.other.stress.min')).toBe(2);

    const carried = await items(gmPage, uuid);
    expect(carried.filter((i) => i.type === 'skill')).toHaveLength(4);

    // The class arrives as a document, not just as `system.class.value`: its `robotic` flag is
    // what tells the Panic table an android from a human (R7).
    expect(carried.filter((i) => i.type === 'class').map((i) => i.name)).toEqual(['Marine']);

    // The row links armour, a weapon and a piece of equipment, under the names the book prints
    // for them; all three must arrive, as the documents they resolve to.
    const gear = carried
      .filter((i) => i.type !== 'skill' && i.type !== 'class')
      .map((i) => i.name)
      .sort();
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
    await goTo(gmPage, 'stats');
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
    await goTo(gmPage, 'stats');
    await expect(gmPage.locator('input[data-bonus="intellect"]')).toHaveValue('20');
    await expect(gmPage.locator('input[data-bonus="speed"]')).toHaveValue('-10');
    await expect(gmPage.locator('input[data-bonus="combat"]')).toHaveValue('0');
    await goTo(gmPage, 'saves');
    await expect(gmPage.locator('input[data-bonus="fear"]')).toHaveValue('60');
    // Three granted plus the two chosen, not the Teamster's on top.
    await goTo(gmPage, 'skills');
    await expect(gmPage.locator('ul[data-list="skills"] li')).toHaveCount(5);

    await goTo(gmPage, 'stats');
    await gmPage.click('img[data-roll="strength"]');
    await goTo(gmPage, 'finish');
    await gmPage.click('button[data-action="save"]');
    await gmPage.waitForSelector('form.character-wizard', { state: 'detached' });

    expect(await stored(gmPage, uuid, 'system.stats.strength.value')).toBe(27);
    expect(await stored(gmPage, uuid, 'system.class.value')).toBe('Android');
    // The class item follows the class: one of them, and it is the one that was saved.
    const carried = await items(gmPage, uuid);
    expect(carried.filter((i) => i.type === 'class').map((i) => i.name)).toEqual(['Android']);
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

    await goTo(gmPage, 'gear');
    await gmPage.click('img[data-roll="patch"]');
    await expect(gmPage.locator('input[data-value="patch"]')).toHaveValue('0');
    await expect(gmPage.locator('[data-text="patch"]')).not.toBeEmpty();
  });
});
