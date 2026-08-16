// The generator's pure halves, testable outside Foundry because the draft store took them out of
// the DOM. `test/e2e/actor-generator.spec.ts` drives the window itself.
import { afterEach, beforeEach, describe, it, expect } from 'vitest';

import { parseResults, drawnRow } from '../module/ui/generator/table-result.js';
import { candidates } from '../module/ui/generator/skills.js';
import { NUMBERED, PANES, paneTitle } from '../module/ui/generator/steps.js';
import { CharacterDraft } from '../module/ui/generator/draft.svelte.js';
import { CHARACTER_CREATION } from '../content/books/psg/character-creation.ts';

const loadoutRow = {
  type: 'text',
  description:
    'Tank Top and Camo Pants (AP 1), Combat Knife (as Scalpel DMG [+]), Stimpak (x5)<br><br>' +
    '@UUID[Compendium.mothershiprpg.armor_1e.Item.FU5u4cDDPFoe1eCW]{Tank Top and Camo Pants (AP 1)}<br>' +
    '@UUID[Compendium.mothershiprpg.weapons_1e.Item.tjFU8Fbh2fcfnWGL]{Combat Knife (as Scalpel DMG [+])}<br>' +
    '@UUID[Compendium.mothershiprpg.equipment_1e.Item.E496Z3oUgdzAWxib]{Stimpak (x5)}',
  range: [0, 0],
};

describe('table results', () => {
  // The bug S3 found and S5 fixes: the AppV1 generator matched /(.*)(@UUID.*)/ and pushed one bare
  // id, so a three-item loadout row handed out one item.
  it('takes every linked document out of a loadout row', () => {
    const { entries } = parseResults([loadoutRow]);
    expect(entries.map((e) => e.uuid)).toEqual([
      'Compendium.mothershiprpg.armor_1e.Item.FU5u4cDDPFoe1eCW',
      'Compendium.mothershiprpg.weapons_1e.Item.tjFU8Fbh2fcfnWGL',
      'Compendium.mothershiprpg.equipment_1e.Item.E496Z3oUgdzAWxib',
    ]);
    expect(entries.map((e) => e.name)).toEqual([
      'Tank Top and Camo Pants (AP 1)',
      'Combat Knife (as Scalpel DMG [+])',
      'Stimpak (x5)',
    ]);
  });

  it('shows the printed list without the links or the breaks after it', () => {
    expect(parseResults([loadoutRow]).text).toBe(
      'Tank Top and Camo Pants (AP 1), Combat Knife (as Scalpel DMG [+]), Stimpak (x5)',
    );
  });

  // A trinket or patch row carries no @UUID at all. The AppV1 regex matched nothing and then
  // indexed the null, so rolling either one threw the moment the generated tables shipped.
  it('reads a row that links nothing', () => {
    const drawn = parseResults([
      { type: 'text', description: 'Manual: PANIC: Harbinger of Catastrophe', range: [0, 0] },
    ]);
    expect(drawn).toEqual({ text: 'Manual: PANIC: Harbinger of Catastrophe', entries: [] });
  });

  it('reads a document result', () => {
    expect(
      parseResults([{ type: 'document', name: 'Scalpel', documentUuid: 'Item.abc' }]),
    ).toEqual({ text: 'Scalpel', entries: [{ uuid: 'Item.abc', name: 'Scalpel' }] });
  });

  it('reports the printed row number', () => {
    expect(drawnRow({ results: [loadoutRow], roll: { total: 7 } })).toBe(0);
    expect(drawnRow({ results: [{}], roll: { total: 7 } })).toBe(7);
  });
});

describe('skill candidates', () => {
  type Skill = { uuid: string; name: string; rank: string; prerequisites: string[] };
  const named = (list: Skill[]) => list.map((skill) => skill.uuid);
  const catalog: Skill[] = [
    { uuid: 'a', name: 'Linguistics', rank: 'Trained', prerequisites: [] },
    { uuid: 'b', name: 'Mathematics', rank: 'Trained', prerequisites: [] },
    { uuid: 'c', name: 'Xenobiology', rank: 'Expert', prerequisites: ['a'] },
    { uuid: 'd', name: 'Cybernetics', rank: 'Expert', prerequisites: ['z'] },
  ];

  it('offers a whole rank when nothing gates it', () => {
    expect(named(candidates(catalog, 'Trained', []))).toEqual(['a', 'b']);
  });

  it('lists an owned skill disabled rather than dropping it', () => {
    expect(candidates(catalog, 'Trained', ['a'])).toEqual([
      { ...catalog[0], disabled: true },
      { ...catalog[1], disabled: false },
    ]);
  });

  // A bare Expert or Master pick needs a prerequisite already owned; the *_full_set picks hand out
  // the chain themselves and so gate nothing.
  it('gates a pick on an owned prerequisite when asked', () => {
    expect(named(candidates(catalog, 'Expert', ['a'], { requirePrerequisite: true }))).toEqual(['c']);
    expect(named(candidates(catalog, 'Expert', ['a']))).toEqual(['c', 'd']);
  });
});

describe('the wizard spine', () => {
  const walked = CHARACTER_CREATION.steps.filter((step) => ![5, 6].includes(step.number));

  // The panes are the book's own steps, so an edition that renumbers or renames one must not be
  // able to leave the wizard walking a list of its own.
  it('is the intro plus the book\'s steps, in the book\'s order', () => {
    const printed = PANES.filter((pane) => pane.step !== null);
    expect(printed.map((pane) => pane.step!.number)).toEqual([1, 2, 3, 4, 7, 8, 9]);
    expect(printed.map(paneTitle)).toEqual(walked.map((step) => step.title));
  });

  // The wizard may interpose a pane the book gives it no step for, and does so twice: the front
  // matter, and the pane that places what a class leaves to the player. Neither may print a book
  // title it did not earn, so both carry their own copy rather than borrowing a step's.
  it('interposes only panes that print their own copy', () => {
    const own = PANES.filter((pane) => pane.step === null);
    expect(own.map((pane) => pane.id)).toEqual(['intro', 'adjustments']);
    expect(own.every((pane) => pane.title !== undefined || pane.titleKey !== undefined)).toBe(true);
  });

  // The counter counts questions. The intro is the book's front matter and asks nothing, so it is
  // the one pane the rail stars instead of numbering.
  it('numbers every pane but the intro', () => {
    expect(NUMBERED.map((pane) => pane.id)).toEqual(PANES.slice(1).map((pane) => pane.id));
  });

  // A pane is a question. Steps 5 and 6 ask nothing — Stress starts at 2 for everyone and the
  // Trauma Response is whatever the class prints — so the wizard shows both where they land
  // rather than stopping on them. Nothing else may be dropped on that argument: every step it
  // skips must be one the book states rather than rolls for.
  it('stops on every step the book asks something in, and on no other', () => {
    const skipped = CHARACTER_CREATION.steps.filter((step) => !PANES.some((pane) => pane.step === step));
    expect(skipped.map((step) => step.number)).toEqual([5, 6]);
    expect(skipped.every((step) => step.roll === null)).toBe(true);
  });

  // Everything from step 4 on reads the class, so step 3 — both halves of it — is what the rail
  // gates on, and nothing else.
  it('gates on the class and its adjustments, and on nothing else', () => {
    expect(PANES.filter((pane) => pane.required === true).map((pane) => pane.id)).toEqual(['class', 'adjustments']);
  });

  const empty = {
    rolled: Object.fromEntries(
      ['strength', 'speed', 'intellect', 'combat', 'sanity', 'fear', 'body', 'health', 'credits'].map((key) => [key, null]),
    ),
    classUuid: '',
    skills: [],
    patch: null,
    trinket: null,
    loadout: null,
    name: '',
    statChoicesSpent: true,
    skillsPicked: false,
  };

  it('ticks nothing but the intro on an untouched draft', () => {
    expect(PANES.filter((pane) => pane.done(empty)).map((pane) => pane.id)).toEqual(['intro']);
  });

  // Step 3 is two questions on two panes: the class is chosen on one, and what it leaves the
  // player to place is placed on the next. An unspent -10 walked past would be dropped from every
  // pane that reads the stats, so the second gates as hard as the first.
  it('holds step 3 open until the class is chosen and then spent', () => {
    const klass = PANES.find((pane) => pane.id === 'class')!;
    const spend = PANES.find((pane) => pane.id === 'adjustments')!;
    const chosen = { ...empty, classUuid: 'Compendium.mothershiprpg.classes_1e.Item.android' };

    expect(klass.done(empty)).toBe(false);
    expect(klass.done({ ...chosen, statChoicesSpent: false })).toBe(true);
    expect(spend.done(empty)).toBe(false);
    expect(spend.done({ ...chosen, statChoicesSpent: false })).toBe(false);
    expect(spend.done(chosen)).toBe(true);
  });

  it('ticks a roll step only once every roll it covers is in', () => {
    const stats = PANES.find((pane) => pane.id === 'stats')!;
    const partly = { ...empty, rolled: { ...empty.rolled, strength: 30, speed: 30, intellect: 30 } };
    expect(stats.done(partly)).toBe(false);
    expect(stats.done({ ...partly, rolled: { ...partly.rolled, combat: 30 } })).toBe(true);
  });
});

describe('creation rules the generator applies', () => {
  // The generator imports these formulas rather than repeating them; this pins the sentence the
  // one prose rule comes from, so STARTING_STRESS in draft.svelte.js cannot drift from the book.
  it('states starting Stress in prose, and states it as 2', () => {
    const step = CHARACTER_CREATION.steps.find((s) => s.id === 'step-5-gain-stress')!;
    expect(step.roll).toBeNull();
    expect(step.text.join(' ')).toContain("Stress and Minimum Stress both start at 2");
  });
});

describe('the adjustments a class leaves to the player', () => {
  const drafted = () => {
    const draft = new CharacterDraft({ name: 'Rook Vance' });
    draft.statChoices = [{ modification: -10, stats: ['strength', 'speed'], chosen: null }];
    return draft;
  };

  it('moves the bonus with the pick rather than paying it twice', () => {
    const draft = drafted();

    draft.chooseStat(0, 'strength');
    expect(draft.bonus.strength).toBe(-10);

    draft.chooseStat(0, 'speed');
    expect(draft.bonus.strength).toBe(0);
    expect(draft.bonus.speed).toBe(-10);
    expect(draft.statChoicesSpent).toBe(true);
  });

  it('takes a pick back when it is named again', () => {
    const draft = drafted();

    draft.chooseStat(0, 'speed');
    draft.chooseStat(0, 'speed');

    expect(draft.bonus.speed).toBe(0);
    expect(draft.statChoicesSpent).toBe(false);
  });

  it('spends nothing on a stat the class did not offer', () => {
    const draft = drafted();

    draft.chooseStat(0, 'combat');

    expect(draft.bonus.combat).toBe(0);
    expect(draft.statChoicesSpent).toBe(false);
  });
});

describe('the skills a class hands out', () => {
  const skill = (uuid: string, name: string, rank: string, prerequisite_ids: string[] = []) => ({
    uuid,
    name,
    type: 'skill',
    system: {
      rank,
      prerequisite_ids,
      bonus: rank === 'Trained' ? 10 : 15,
      description: `<p>What ${name} is  for.</p>`,
    },
  });

  const CATALOG = [
    skill('sk-linguistics', 'Linguistics', 'Trained'),
    skill('sk-mathematics', 'Mathematics', 'Trained'),
    skill('sk-rimwise', 'Rimwise', 'Trained'),
    skill('sk-xenobiology', 'Xenobiology', 'Expert', ['sk-linguistics']),
    skill('sk-cybernetics', 'Cybernetics', 'Expert', ['sk-mathematics']),
  ];

  const picks = (over: Record<string, number> = {}) => ({
    trained: 0, expert: 0, master: 0, expert_full_set: 0, master_full_set: 0, ...over,
  });

  const ANDROID = {
    uuid: 'Item.android',
    name: 'Android',
    img: 'icons/svg/clockwork.svg',
    type: 'class',
    system: {
      trauma_response: 'Fear Save',
      roll_tables: { loadout: '', trinket: '', patch: '' },
      base_adjustment: {
        strength: 0, speed: 0, intellect: 20, combat: 0,
        sanity: 0, fear: 60, body: 0, max_wounds: 0,
        skills_granted: ['sk-linguistics'],
      },
      selected_adjustment: {
        choose_stat: [{ modification: -10, stats: ['strength', 'speed', 'intellect', 'combat'] }],
        choose_skill_and: picks({ expert: 1 }),
        choose_skill_or: [[
          { name: 'Two Trained', ...picks({ trained: 2 }), from_list: [] },
          { name: 'One Expert Set', ...picks({ expert_full_set: 1 }), from_list: ['sk-rimwise'] },
        ]],
      },
    },
  };

  beforeEach(() => {
    const globals = globalThis as Record<string, unknown>;
    globals.game = { items: [...CATALOG, ANDROID], packs: [] };
    globals.fromUuid = async (uuid: string) => [...CATALOG, ANDROID].find((doc) => doc.uuid === uuid) ?? null;
    globals.ui = { notifications: { warn: () => {}, error: () => {} } };
  });

  afterEach(() => {
    const globals = globalThis as Record<string, unknown>;
    delete globals.game;
    delete globals.fromUuid;
    delete globals.ui;
  });

  const drafted = async () => {
    const draft = new CharacterDraft({ name: 'Rook Vance' });
    await draft.load();
    await draft.chooseClass('Item.android');
    return draft;
  };

  const keys = (draft: CharacterDraft) => draft.skillSlots.map((slot: { key: string }) => slot.key);
  const named = (draft: CharacterDraft) => draft.skills.map((entry: { name: string }) => entry.name);

  it('offers the class\u2019s packages unanswered, and its own picks as slots', async () => {
    const draft = await drafted();

    expect(draft.skillGroups.map((group: { chosen: number | null }) => group.chosen)).toEqual([null]);
    expect(keys(draft)).toEqual(['class:expert:0:Expert']);
    expect(named(draft)).toEqual(['Linguistics']);
    expect(draft.skillsPicked).toBe(false);
  });

  it('replaces one package\u2019s slots with the next when the package changes', async () => {
    const draft = await drafted();

    draft.chooseSkillOption(0, 0);
    expect(keys(draft)).toEqual([
      'class:expert:0:Expert',
      'group-0:trained:0:Trained',
      'group-0:trained:1:Trained',
    ]);

    draft.chooseSkillOption(0, 1);
    expect(keys(draft)).toEqual([
      'class:expert:0:Expert',
      'group-0:expert_full_set:0:Expert',
      'group-0:expert_full_set:0:Trained',
    ]);
    // The package brings a skill of its own, and it arrives with the package.
    expect(named(draft)).toEqual(['Linguistics', 'Rimwise']);
  });

  // The book gates a bare Expert pick on already owning a prerequisite; a set hands out the chain
  // itself, so its Expert slot is not gated.
  it('offers a gated pick only what a skill already held unlocks', async () => {
    const draft = await drafted();
    draft.chooseSkillOption(0, 0);

    const offered = () =>
      draft.skillCandidates('class:expert:0:Expert').map((option: { name: string }) => option.name);
    expect(offered()).toEqual(['Xenobiology']);

    draft.chooseSkill('group-0:trained:0:Trained', 'sk-mathematics');
    expect(offered()).toEqual(['Xenobiology', 'Cybernetics']);
  });

  it('empties a gated pick when the pick it stood on changes', async () => {
    const draft = await drafted();
    draft.chooseSkillOption(0, 0);
    draft.chooseSkill('group-0:trained:0:Trained', 'sk-mathematics');
    draft.chooseSkill('class:expert:0:Expert', 'sk-cybernetics');
    draft.chooseSkill('group-0:trained:1:Trained', 'sk-rimwise');
    // Granted first, then the slots in the order the pane shows them: the class's own pick, then
    // the package's.
    expect(named(draft)).toEqual(['Linguistics', 'Cybernetics', 'Mathematics', 'Rimwise']);
    expect(draft.skillsPicked).toBe(true);

    draft.chooseSkill('group-0:trained:0:Trained', '');

    expect(named(draft)).toEqual(['Linguistics', 'Rimwise']);
    expect(draft.skillsPicked).toBe(false);
  });

  // The picker is a list to browse, not a list of names: the book prints a sentence under every
  // skill and the pick is made from it. Descriptions are stored as HTML and printed as text.
  it('carries the sentence and the bonus the book prints with each skill', async () => {
    const draft = await drafted();
    draft.chooseSkillOption(0, 0);

    expect(draft.skillCandidates('group-0:trained:0:Trained')[0]).toMatchObject({
      name: 'Linguistics',
      bonus: 10,
      summary: 'What Linguistics is for.',
    });
  });

  // The class pane is a choice between four cards, so each card says what its class does. A choice
  // carries the keys it may be spent on, not just its size: the card names "1 Stat" or "1 Save"
  // from that set, and promising a save the pane will not offer is the bug it exists to prevent.
  it('summarises what a class brings before it is chosen', async () => {
    const draft = new CharacterDraft({ name: 'Rook Vance' });
    await draft.load();

    expect(draft.classOptions).toEqual([
      {
        uuid: 'Item.android',
        name: 'Android',
        img: 'icons/svg/clockwork.svg',
        source: 'world.Item',
        adjustments: [{ key: 'intellect', value: 20 }, { key: 'fear', value: 60 }],
        choices: [{ modification: -10, stats: ['strength', 'speed', 'intellect', 'combat'] }],
      },
    ]);
  });

  it('cannot be given the same skill twice', async () => {
    const draft = await drafted();
    draft.chooseSkillOption(0, 0);

    const offered = draft.skillCandidates('group-0:trained:1:Trained');
    expect(offered.find((option: { uuid: string }) => option.uuid === 'sk-linguistics')?.disabled).toBe(true);
  });
});
