// The generator's pure halves, testable outside Foundry because the draft store took them out of
// the DOM. `test/e2e/actor-generator.spec.ts` drives the window itself.
import { describe, it, expect } from 'vitest';

import { parseResults, drawnRow } from '../module/ui/generator/table-result.js';
import { candidates } from '../module/ui/generator/skills.js';
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

describe('creation rules the generator applies', () => {
  // The generator imports these formulas rather than repeating them; this pins the sentence the
  // one prose rule comes from, so STARTING_STRESS in draft.svelte.js cannot drift from the book.
  it('states starting Stress in prose, and states it as 2', () => {
    const step = CHARACTER_CREATION.steps.find((s) => s.id === 'step-5-gain-stress')!;
    expect(step.roll).toBeNull();
    expect(step.text.join(' ')).toContain("Stress and Minimum Stress both start at 2");
  });
});
