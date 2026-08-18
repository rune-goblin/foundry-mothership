import { type Page } from '@playwright/test';
import { test, expect } from './fixtures/foundry-clients.ts';

// S5's capstone, walked one step at a time. The character generator has never had data to work
// with: it scans compendia for class and skill documents, and until S3 no pack shipped either.
// This drives the wizard end to end against the real Foundry -- reach it from the create dialog,
// choose a Marine, answer inline everything the class leaves open, roll each step, finish -- and
// asserts what landed on the actor. The wizard opens no window over itself: a spec that has to
// click `dialog[open]` to get through a step is a spec catching a regression.
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

const openGenerator = async (
  page: Page,
  system: Record<string, unknown> = {},
  { fromCreation = false } = {},
) => {
  // Leave no other sheet open: the header button is found by selector, and a leftover one belongs
  // to another actor.
  await closeEverything(page);
  const uuid = await page.evaluate(async ({ s, renderSheet }) => {
    const actor = await (window as any).Actor.create(
      { name: '__e2e_recruit', type: 'character', system: s },
      { renderSheet },
    );
    return actor.uuid as string;
  }, { s: system, renderSheet: fromCreation });
  if (fromCreation) {
    await page.click('dialog[open] button[data-action="wizard"]');
  } else {
    // A render without the creation context is an ordinary sheet open. The entry is a header
    // control under the ellipsis rather than a title-bar button; calling the method skips that
    // menu, whose own wiring is covered by character-sheet.spec.ts.
    await page.evaluate(async (u: string) => {
      const actor = await (window as any).fromUuid(u);
      await actor.sheet.render(true);
      actor.sheet.generateCharacter();
    }, uuid);
  }
  await expect(page.locator('form.character-wizard')).toHaveCount(1);
  return uuid;
};

/** The rail is the navigation: completed panes and the first unfinished pane are reachable. */
const goTo = async (page: Page, pane: string) => {
  await page.click(`button.wizard-rail-step[data-pane="${pane}"]`);
  await expect(page.locator(`section.wizard-pane[data-pane="${pane}"]`)).toHaveCount(1);
};

const rollStatsAndSaves = async (page: Page) => {
  for (const pane of ['stats', 'saves']) {
    await goTo(page, pane);
    await page.click('button[data-roll="all"]');
  }
};

const chooseClass = async (page: Page, name: string) => {
  if (await page.locator('button.wizard-rail-step[data-pane="class"]').isDisabled()) {
    await rollStatsAndSaves(page);
  }
  await goTo(page, 'class');
  await page.click(`button.wizard-class[data-class="${name}"]`);
};

/**
 * Fill every skill slot the class left open, each with the first available node in its tree. A
 * selected skill stays in the graph but cannot be taken twice.
 */
const reachSkills = async (page: Page) => {
  if (await page.locator('button.wizard-rail-step[data-pane="skills"]').isDisabled()) {
    await goTo(page, 'health');
    await page.click('img[data-roll="health"]');
  }
  await goTo(page, 'skills');
};

const pickEverySkill = async (page: Page) => {
  await reachSkills(page);
  const keys = await page.$$eval('[data-pick]', (nodes) =>
    nodes.map((node) => (node as HTMLElement).dataset.pick as string),
  );
  for (const key of keys) {
    const slot = `[data-pick="${key}"]`;
    if (!(await page.$(`${slot} [data-skill]`))) await page.click(`${slot} button[data-slot="open"]`);
    await page.click(`${slot} [data-skill][data-state="available"] >> nth=0`);
  }
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

  // The wizard's front door: creating a character offers it before rendering any blank sheet.
  test('a new character is offered the wizard, and taking it opens the window', async ({ gmPage }) => {
    await closeEverything(gmPage);
    await gmPage.evaluate(() => {
      void (window as any).Actor.implementation.createDialog({ name: '__e2e_offered', type: 'character' });
    });
    await gmPage.click('dialog[open] button[data-action="ok"]');

    await expect(gmPage.locator('.application.character')).toHaveCount(0);
    await gmPage.click('dialog[open] button[data-action="wizard"]');
    await expect(gmPage.locator('form.character-wizard')).toHaveCount(1);
    await expect(gmPage.locator('.application.character:not(:has(form.character-wizard))')).toHaveCount(0);
    // The intro is the first pane: the first two pieces of the book's front matter beside its
    // cover, without the third paragraph of procedural instructions.
    const intro = gmPage.locator('section.wizard-pane[data-pane="intro"]');
    await expect(intro).toHaveCount(1);
    await expect(intro.locator('.wizard-intro .wizard-prose p')).toHaveCount(2);
    const cover = intro.locator('.wizard-intro-cover');
    await expect(cover).toHaveAttribute(
      'src',
      '/systems/mothershiprpg/images/mothership-cover.webp',
    );
    await expect.poll(() => cover.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    const composition = await intro.locator('.wizard-intro').evaluate((element) => {
      const text = element.querySelector('.wizard-prose')!.getBoundingClientRect();
      const image = element.querySelector('.wizard-intro-cover')!.getBoundingClientRect();
      const frame = element.getBoundingClientRect();
      const pane = element.closest('.wizard-pane')!.getBoundingClientRect();
      return {
        position: getComputedStyle(element.querySelector('.wizard-intro-cover')!).position,
        bottomGap: Math.abs(frame.bottom - image.bottom),
        paneBottomGap: Math.abs(pane.bottom - image.bottom),
        overlaps: text.right > image.left,
      };
    });
    expect(composition.position).toBe('absolute');
    expect(composition.bottomGap).toBeLessThan(1);
    expect(composition.paneBottomGap).toBeLessThan(1);
    expect(composition.overlaps).toBe(true);
  });

  test('blank characters render on request, while creatures bypass the choice', async ({ gmPage }) => {
    await closeEverything(gmPage);
    await gmPage.evaluate(() => {
      void (window as any).Actor.implementation.createDialog({ name: '__e2e_blank', type: 'character' });
    });
    await gmPage.click('dialog[open] button[data-action="ok"]');
    await expect(gmPage.locator('.application.character')).toHaveCount(0);
    await gmPage.click('dialog[open] button[data-action="blank"]');
    await expect(gmPage.locator('.application.character')).toHaveCount(1);

    await closeEverything(gmPage);
    await gmPage.evaluate(() => {
      void (window as any).Actor.implementation.createDialog({ name: '__e2e_creature', type: 'creature' });
    });
    await gmPage.click('dialog[open] button[data-action="ok"]');
    await expect(gmPage.locator('.application.creature')).toHaveCount(1);
    await expect(gmPage.locator('dialog[open] button[data-action="wizard"]')).toHaveCount(0);
  });

  test('the rail walks the book, and step 3 lists the shipped classes', async ({ gmPage }) => {
    await openGenerator(gmPage);

    const rail = await gmPage.$$eval('button.wizard-rail-step', (nodes) =>
      nodes.map((n) => (n as HTMLElement).dataset.pane),
    );
    // Steps 5 and 6 ask the player nothing -- Stress starts at 2 and the Trauma Response is the
    // class's -- so the wizard shows both where they land and stops on neither. Step 3 asks two
    // things, so it is two panes: which class, and where its free adjustment goes.
    expect(rail).toEqual([
      'intro', 'stats', 'saves', 'class', 'adjustments', 'health', 'skills', 'gear', 'finish',
    ]);

    await freezeDice(gmPage, LOWEST_FACE);
    await rollStatsAndSaves(gmPage);
    await goTo(gmPage, 'class');
    const options = await gmPage.$$eval('button.wizard-class .wizard-class-name', (nodes) =>
      nodes.map((n) => n.textContent),
    );
    expect(options.sort()).toEqual(['Android', 'Marine', 'Scientist', 'Teamster']);

    const icons = await gmPage.$$eval('button.wizard-class', (nodes) =>
      Object.fromEntries(nodes.map((node) => [
        (node as HTMLElement).dataset.class,
        node.querySelector('img')?.getAttribute('src'),
      ])),
    );
    expect(icons).toEqual({
      Android: '/systems/mothershiprpg/images/class_icons/android.png',
      Marine: '/systems/mothershiprpg/images/class_icons/marine.png',
      Scientist: '/systems/mothershiprpg/images/class_icons/scientist.png',
      Teamster: '/systems/mothershiprpg/images/class_icons/teamster.png',
    });
    const columns = await gmPage.locator('.wizard-classes').evaluate((element) =>
      getComputedStyle(element).gridTemplateColumns.split(' '),
    );
    expect(columns).toHaveLength(4);
    await expect(gmPage.locator('.wizard-class-brings, .wizard-class-source')).toHaveCount(0);
    await expect(gmPage.locator('section.wizard-pane[data-pane="class"] .wizard-instruction')).toHaveCount(0);
    await expect(gmPage.locator('section.wizard-pane[data-pane="class"] .wizard-prose')).toHaveCount(0);
    await expect(gmPage.locator('[data-class-detail]')).toHaveCount(0);

    await gmPage.click('button.wizard-class[data-class="Android"]');
    const androidDetail = gmPage.locator('[data-class-detail="Android"]');
    await expect(androidDetail.locator('[data-class-description]')).toHaveText(
      'Androids are a terrifying and exciting addition to any crew. They tend to unnerve other crewmembers with their cold inhumanity.',
    );
    const labelTypography = await androidDetail.locator('dt').first().evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        fontSize: Number.parseFloat(style.fontSize),
        textShadow: style.textShadow,
        textTransform: style.textTransform,
      };
    });
    expect(labelTypography.fontSize).toBeGreaterThan(12);
    expect(labelTypography.textShadow).toBe('none');
    expect(labelTypography.textTransform).toBe('none');
    await goTo(gmPage, 'adjustments');
    const adjustments = gmPage.locator('section.wizard-pane[data-pane="adjustments"]');
    await expect(adjustments.locator('h2')).toHaveText('Android Adjustments');
    await expect(adjustments.locator('.wizard-adjustments-class-art')).toHaveAttribute(
      'src',
      '/systems/mothershiprpg/images/class_icons/android.png',
    );

    await goTo(gmPage, 'class');
    await gmPage.click('button.wizard-class[data-class="Marine"]');
    const detail = gmPage.locator('[data-class-detail="Marine"]');
    await expect(detail).toHaveCount(1);
    await expect(detail.locator('[data-bonus="combat"]')).toHaveText('+10');
    await expect(detail.locator('[data-value="trauma"]')).not.toBeEmpty();
  });

  test('each pane gates forward navigation until its task is complete', async ({ gmPage }) => {
    await openGenerator(gmPage);

    await goTo(gmPage, 'stats');
    await expect(gmPage.locator('button[data-action="next"]')).toBeDisabled();
    await expect(gmPage.locator('button.wizard-rail-step[data-pane="saves"]')).toBeDisabled();

    await freezeDice(gmPage, LOWEST_FACE);
    await gmPage.click('button[data-roll="all"]');
    await expect(gmPage.locator('button[data-action="next"]')).toBeEnabled();
    await expect(gmPage.locator('button.wizard-rail-step[data-pane="saves"]')).toBeEnabled();

    await goTo(gmPage, 'saves');
    await expect(gmPage.locator('button[data-action="next"]')).toBeDisabled();
    await gmPage.click('button[data-roll="all"]');
    await expect(gmPage.locator('button[data-action="next"]')).toBeEnabled();

    await chooseClass(gmPage, 'Teamster');

    // The Teamster leaves no adjustment to place, so that pane is already complete and Health is
    // the next gate. The choice itself opens no dialog.
    await expect(gmPage.locator('dialog[open]')).toHaveCount(0);
    await expect(gmPage.locator('button.wizard-rail-step[data-pane="health"]')).toBeEnabled();
    await goTo(gmPage, 'health');
    await expect(gmPage.locator('button[data-action="next"]')).toBeDisabled();
    await gmPage.click('img[data-roll="health"]');
    await expect(gmPage.locator('button[data-action="next"]')).toBeEnabled();
  });

  test('generates a Marine, and its three-item loadout row becomes three items', async ({ gmPage }) => {
    // Stress has drifted from where the book starts it, which is the case that shows whether the
    // generator writes it or leaves it to the schema's defaults.
    const uuid = await openGenerator(
      gmPage,
      { other: { stress: { value: 9, min: 4 } } },
      { fromCreation: true },
    );
    // Row 0 of the Marine loadouts is "Tank Top and Camo Pants, Combat Knife, Stimpak".
    await freezeDice(gmPage, LOWEST_FACE);

    await chooseClass(gmPage, 'Marine');

    // The Marine's bonus skills are a choice of two packages, taken on the skills pane itself.
    await reachSkills(gmPage);
    await gmPage.click('button.wizard-package >> nth=1');

    const tree = gmPage.locator('[data-pick] .skill-tree').first();
    await expect(tree).toHaveAttribute('data-target-rank', 'Trained');
    await expect(tree.locator('[data-state="selected"]')).not.toHaveCount(0);
    await expect(tree.locator('[data-state="available"]')).not.toHaveCount(0);
    // A Trained choice is a starting point, so every unowned target is available. Locked targets
    // appear only in the higher-rank path view where prerequisites apply.
    await expect(tree.locator('[data-state="unavailable"]')).toHaveCount(0);
    await expect(tree.locator('svg')).toHaveCount(0);

    // Starting skills need no graph at all: they are a compact grid of choices. Higher-ranked
    // slots render one self-contained path card per target instead of sharing connector lines.
    const treeLayout = await tree.evaluate((element) => {
      const first = element.querySelector<HTMLElement>('[data-skill]')!;
      const node = first.getBoundingClientRect();
      return {
        nodeWidth: node.width,
        radius: Number.parseFloat(getComputedStyle(first).borderRadius),
        height: node.height,
      };
    });
    expect(treeLayout.nodeWidth).toBeGreaterThanOrEqual(160);
    expect(treeLayout.height).toBeLessThan(40);
    expect(treeLayout.radius).toBeGreaterThanOrEqual(treeLayout.height / 2);

    // Every state keeps normal-size text at WCAG AA contrast; shape, border style and symbols also
    // distinguish them, so color is not the only signal.
    const contrast = await tree.locator('[data-skill]').evaluateAll((nodes) => {
      const channel = (value: number) => {
        const normalized = value / 255;
        return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      };
      const luminance = (color: string) => {
        const [red, green, blue] = color.match(/[\d.]+/g)!.slice(0, 3).map(Number);
        return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
      };
      return nodes.map((node) => {
        const style = getComputedStyle(node);
        const light = Math.max(luminance(style.color), luminance(style.backgroundColor));
        const dark = Math.min(luminance(style.color), luminance(style.backgroundColor));
        return (light + 0.05) / (dark + 0.05);
      });
    });
    expect(Math.min(...contrast)).toBeGreaterThanOrEqual(4.5);

    await pickEverySkill(gmPage);
    await expect(gmPage.locator('ul[data-list="skills"] li')).toHaveCount(4);
    await expect(gmPage.locator('dialog[open]')).toHaveCount(0);

    await rollStatsAndSaves(gmPage);
    await goTo(gmPage, 'health');
    await expect(gmPage.locator('input[data-value="wounds"]')).toHaveValue('3');

    await goTo(gmPage, 'gear');
    await gmPage.click('button[data-roll="all"]');
    await expect(gmPage.locator('input[data-value="loadout"]')).toHaveValue('0');
    await expect(gmPage.locator('ul[data-list="loadout"] li')).toHaveCount(3);

    await goTo(gmPage, 'finish');
    await gmPage.fill('form.character-wizard input[name="name"]', '');
    await expect(gmPage.locator('button[data-action="save"]')).toBeDisabled();
    await gmPage.fill('form.character-wizard input[name="name"]', '__e2e_recruit');
    await expect(gmPage.locator('button[data-action="save"]')).toBeEnabled();
    await gmPage.fill('form.character-wizard input[name="pronouns"]', 'they/them');
    await gmPage.click('button[data-action="save"]');
    await gmPage.waitForSelector('form.character-wizard', { state: 'detached' });
    await expect(gmPage.locator('.application.character')).toHaveCount(1);

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

    // The Teamster grants its bonus skills outright: 1 Trained and 1 Expert, no package to take.
    // The Trained slot is filled first, which is what makes an Expert available to pick at all.
    await chooseClass(gmPage, 'Teamster');
    await pickEverySkill(gmPage);
    // +5 to all stats and saves, so every bonus box reads 5.
    await goTo(gmPage, 'stats');
    await expect(gmPage.locator('input[data-bonus="combat"]')).toHaveValue('5');

    await chooseClass(gmPage, 'Android');

    // The Android's "-10 to 1 stat" is a choice, and it is asked on the pane after the cards:
    // picking a class and spending what it hands you are two questions. Until it is spent the rail
    // will not walk on, and spending it twice moves it rather than paying it twice — park it on
    // Strength, then move it to Speed.
    await expect(gmPage.locator('button.wizard-rail-step[data-pane="health"]')).toBeDisabled();
    await goTo(gmPage, 'adjustments');
    await expect(gmPage.locator('.wizard-adjustment-table thead th')).toHaveText([
      '', 'Base', 'Adjustment', 'Total',
    ]);
    await gmPage.selectOption('[data-choice="0"] select', 'strength');
    await expect(gmPage.locator('[data-base="strength"]')).toHaveText('27');
    await expect(gmPage.locator('[data-modifier="strength"]')).toHaveText('-10');
    await expect(gmPage.locator('[data-value="strength"]')).toHaveText('17');
    await gmPage.selectOption('[data-choice="0"] select', 'speed');
    await expect(gmPage.locator('[data-modifier="strength"]')).toHaveText('0');
    await expect(gmPage.locator('[data-value="strength"]')).toHaveText('27');
    await expect(gmPage.locator('button.wizard-rail-step[data-pane="health"]')).toBeEnabled();

    await goTo(gmPage, 'skills');
    await gmPage.click('button.wizard-package >> nth=1');
    await pickEverySkill(gmPage);

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

    await goTo(gmPage, 'gear');
    await gmPage.click('button[data-roll="all"]');
    await goTo(gmPage, 'finish');
    await gmPage.click('button[data-action="save"]');
    await gmPage.waitForSelector('form.character-wizard', { state: 'detached' });

    expect(await stored(gmPage, uuid, 'system.stats.strength.value')).toBe(27);
    expect(await stored(gmPage, uuid, 'system.class.value')).toBe('Android');
    // The class item follows the class: one of them, and it is the one that was saved.
    const carried = await items(gmPage, uuid);
    expect(carried.filter((i) => i.type === 'class').map((i) => i.name)).toEqual(['Android']);
    // Completing every prior pane means the unmodified rolled Combat score is written too.
    expect(await stored(gmPage, uuid, 'system.stats.combat.value')).toBe(27);
  });

  test('rolling a patch no longer throws on a row that links nothing', async ({ gmPage }) => {
    await openGenerator(gmPage);
    await freezeDice(gmPage, LOWEST_FACE);

    await chooseClass(gmPage, 'Teamster');

    await pickEverySkill(gmPage);

    await goTo(gmPage, 'gear');
    await gmPage.click('img[data-roll="patch"]');
    await expect(gmPage.locator('input[data-value="patch"]')).toHaveValue('0');
    await expect(gmPage.locator('[data-text="patch"]')).not.toBeEmpty();
  });
});
