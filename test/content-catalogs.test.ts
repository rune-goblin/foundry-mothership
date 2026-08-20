import { describe, expect, it } from 'vitest';
import type { RollRange } from '../content/books/common.ts';
import { ARMOR } from '../content/books/psg/armor.ts';
import { CHARACTER_CREATION } from '../content/books/psg/character-creation.ts';
import { CLASSES } from '../content/books/psg/classes.ts';
import { DEATH } from '../content/books/psg/death.ts';
import { EQUIPMENT } from '../content/books/psg/equipment.ts';
import { LOADOUTS } from '../content/books/psg/loadouts.ts';
import { PANIC } from '../content/books/psg/panic.ts';
import { PATCHES } from '../content/books/psg/patches.ts';
import { SKILLS } from '../content/books/psg/skills.ts';
import { TRINKETS } from '../content/books/psg/trinkets.ts';
import { WEAPONS } from '../content/books/psg/weapons.ts';
import { WOUNDS } from '../content/books/psg/wounds.ts';
import { CONTENT_ID } from '../scripts/content/slug.ts';

const CATALOGS = {
  skills: SKILLS,
  classes: CLASSES,
  weapons: WEAPONS,
  armor: ARMOR,
  equipment: EQUIPMENT,
} as const;

describe('the catalogs hold what the book holds', () => {
  it('counts every dataset that becomes documents', () => {
    expect({
      skills: SKILLS.length,
      classes: CLASSES.length,
      weapons: WEAPONS.length,
      armor: ARMOR.length,
      equipment: EQUIPMENT.length,
      woundTables: WOUNDS.tables.length,
      panic: PANIC.results.length,
      death: DEATH.results.length,
      trinkets: TRINKETS.results.length,
      patches: PATCHES.results.length,
      loadouts: LOADOUTS.length,
      creationSteps: CHARACTER_CREATION.steps.length,
    }).toEqual({
      skills: 42,
      classes: 4,
      weapons: 22,
      armor: 5,
      equipment: 44,
      woundTables: 5,
      panic: 20,
      death: 4,
      trinkets: 100,
      patches: 100,
      loadouts: 4,
      creationSteps: 9,
    });
  });

  // An id is a document's identity in content/ids.json and the filename it packs to. A duplicate
  // hands two records one id; a non-slug is rejected by the build, but only once it runs.
  it.each(Object.entries(CATALOGS))('gives every %s record a unique slug id', (_name, records) => {
    const ids = records.map((r) => r.id);
    expect(ids.filter((id) => !CONTENT_ID.test(id))).toEqual([]);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// A table with a gap silently never rolls that result; one with an overlap rolls two. Neither is
// visible in the emitted pack, and neither would have been caught by a row count alone.
describe('every table covers its die exactly once', () => {
  const tables: [string, string, readonly { range: RollRange }[]][] = [
    ...WOUNDS.tables.map((t): [string, string, readonly { range: RollRange }[]] => [
      `wounds/${t.id}`,
      WOUNDS.die,
      t.results,
    ]),
    ['panic', PANIC.die, PANIC.results],
    ['death', DEATH.die, DEATH.results],
    ['trinkets', TRINKETS.die, TRINKETS.results],
    ['patches', PATCHES.die, PATCHES.results],
    ...LOADOUTS.map((l): [string, string, readonly { range: RollRange }[]] => [l.id, l.die, l.results]),
  ];

  it.each(tables)('%s', (_name, die, results) => {
    const faces = Number(die.split('d')[1]);
    // The book's d10 and d100 tables are zero-based; the panic d20 is not.
    const low = results[0]!.range[0];
    expect(low === 0 || low === 1).toBe(true);

    const covered: number[] = [];
    for (const { range } of results) {
      for (let n = range[0]; n <= range[1]; n += 1) covered.push(n);
    }
    expect(covered).toEqual([...Array(faces).keys()].map((n) => n + low));
  });
});

describe('the classes', () => {
  it('names the four the book has, each with a trauma response and a wound cap', () => {
    expect(CLASSES.map((c) => c.id)).toEqual(['marine', 'android', 'scientist', 'teamster']);
    for (const c of CLASSES) {
      expect(c.traumaResponse.length).toBeGreaterThan(0);
      expect(c.maxWounds).toBeGreaterThanOrEqual(2);
      expect(c.skills.bonus.options.length).toBeGreaterThan(0);
    }
  });

  // The Android's -10 and the Scientist's +5 are the only adjustments the player chooses;
  // every other one names its target.
  it('leaves a target unnamed only where the player picks one', () => {
    const open = CLASSES.flatMap((c) =>
      c.adjustments.filter((a) => a.target === null && a.kind !== 'max-wounds').map((a) => `${c.id}: ${a.raw}`),
    );
    expect(open).toEqual(['android: -10 TO 1 STAT', 'scientist: +5 TO 1 STAT']);
  });
});

describe('character creation', () => {
  it('numbers its steps 1 to 9', () => {
    expect(CHARACTER_CREATION.steps.map((s) => s.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  // The generator rolls these. They are the reason character-creation stays a catalog rather than
  // becoming documents — nobody browses a creation step, but the generator needs its dice.
  it('carries the dice the generator rolls, not just the prose', () => {
    const rolls = Object.fromEntries(
      CHARACTER_CREATION.steps.filter((s) => s.roll).map((s) => [s.id, s.roll!.formula]),
    );
    expect(rolls).toEqual({
      'step-1-roll-stats': '2d10+25',
      'step-2-roll-saves': '2d10+10',
      'step-4-roll-health': '1d10+10',
      'step-8-roll-loadout-trinket-and-patch': '2d10*10',
    });
  });
});
