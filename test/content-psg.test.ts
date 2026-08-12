// What the PSG build actually emits. The machinery is proven against the fixture in
// content-pipeline.test.ts; this file drives the real book, because the book is now the only
// source and a transcription error ships.
import { beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CONDITIONS } from '../content/books/psg/conditions.ts';
import { LOADOUTS } from '../content/books/psg/loadouts.ts';
import { PANIC } from '../content/books/psg/panic.ts';
import { BOOKS } from '../scripts/content/books.ts';
import { build, type BuildResult } from '../scripts/content/pipeline.ts';

const ROOT = join(import.meta.dirname, '..');

let built: BuildResult;
beforeAll(() => {
  built = build({
    root: ROOT,
    books: BOOKS,
    registryPath: join(ROOT, 'content/ids.json'),
    outDir: mkdtempSync(join(tmpdir(), 'mosh-psg-')),
  });
});

describe('what the PSG ships', () => {
  it('emits one pack per compendium, at the counts the book gives', () => {
    const counts: Record<string, number> = {};
    for (const doc of built.emitted) counts[doc.pack] = (counts[doc.pack] ?? 0) + 1;
    expect(counts).toEqual({
      skills: 42,
      classes: 4,
      weapons: 22,
      // 5 priced suits, plus the 10 outfits the loadout tables print with an AP the price list
      // never lists — two of them AP 2, which no priced armor provides.
      armor: 15,
      // 44 equipment records less the Crowbar, which the weapons list carries with damage, plus
      // the 22 loadout-only items the book prints without a price.
      equipment: 65,
      conditions: 9,
      rolltables: 13,
      triggered: 95,
      hotbar: 9,
    });
    expect(built.emitted.length).toBe(274);
  });

  it('declares every compendium it fills in system.json', () => {
    const manifest = JSON.parse(readFileSync(join(ROOT, 'system.json'), 'utf8')) as {
      packs: { name: string }[];
    };
    const declared = new Set(manifest.packs.map((p) => p.name));
    expect([...new Set(built.emitted.map((d) => d.compendium))].filter((c) => !declared.has(c))).toEqual([]);
  });

  it('stamps every document with the book it came from', () => {
    expect([...new Set(built.emitted.map((d) => d.book))]).toEqual(['psg']);
  });
});

// The character generator has never had data: it scans every compendium for `type: "skill"` and
// `type: "class"` and has always found none. These are the documents that change that.
describe('the generator finally has data', () => {
  const system = (pack: string, contentId: string): Record<string, unknown> =>
    built.emitted.find((d) => d.pack === pack && d.contentId === contentId)!.document.system as Record<
      string,
      unknown
    >;

  it('gives every class its three roll tables, as resolvable UUIDs', () => {
    for (const klass of ['marine', 'android', 'scientist', 'teamster']) {
      const tables = system('classes', klass).roll_tables as Record<string, string>;
      expect(tables.loadout).toMatch(/^Compendium\.mothershiprpg\.rolltables_1e\.RollTable\.[A-Za-z0-9]{16}$/);
      expect(tables.trinket).toMatch(/rolltables_1e\.RollTable\./);
      expect(tables.patch).toMatch(/rolltables_1e\.RollTable\./);
    }
  });

  // stats and saves share one flat key space, `all` fans out, and a target the book leaves open is
  // a choice the player makes — the three rules the plan measured, on the class that shows each.
  it('maps the book’s adjustments onto base_adjustment', () => {
    expect(system('classes', 'marine').base_adjustment).toMatchObject({
      combat: 10,
      body: 10,
      fear: 20,
      max_wounds: 1,
      strength: 0,
    });
    expect(system('classes', 'teamster').base_adjustment).toMatchObject({
      strength: 5, speed: 5, intellect: 5, combat: 5, sanity: 10, fear: 10, body: 10,
    });
    expect((system('classes', 'android').selected_adjustment as Record<string, unknown>).choose_stat).toEqual([
      { modification: -10, stats: ['strength', 'speed', 'intellect', 'combat'] },
    ]);
  });

  // "1 Master Skill, and an Expert and Trained Skill prerequisite" was the one class adjustment
  // the plan left open. The runtime already had the shape: master_full_set walks the whole chain.
  it('turns the Scientist’s qualified Master pick into a full set', () => {
    expect((system('classes', 'scientist').selected_adjustment as Record<string, unknown>).choose_skill_and)
      .toEqual({ trained: 1, expert: 0, expert_full_set: 0, master: 0, master_full_set: 1 });
  });

  it('turns an OR bonus into choose_skill_or and a plain one into choose_skill_and', () => {
    const marine = system('classes', 'marine').selected_adjustment as Record<string, unknown>;
    expect((marine.choose_skill_or as unknown[][])[0]!.map((o) => (o as { name: string }).name)).toEqual([
      '1 Expert Skill',
      '2 Trained Skills',
    ]);
    expect((system('classes', 'teamster').selected_adjustment as Record<string, unknown>).choose_skill_and)
      .toMatchObject({ trained: 1, expert: 1 });
  });

  it('grants skills by UUID, because that is what the generator compares against', () => {
    const granted = (system('classes', 'marine').base_adjustment as Record<string, string[]>).skills_granted;
    expect(granted).toHaveLength(2);
    for (const uuid of granted) expect(uuid).toMatch(/^Compendium\.mothershiprpg\.skills_1e\.Item\./);
  });

  it('ranks skills the way the generator filters them', () => {
    const ranks = built.emitted
      .filter((d) => d.pack === 'skills')
      .map((d) => (d.document.system as { rank: string }).rank);
    expect(new Set(ranks)).toEqual(new Set(['Trained', 'Expert', 'Master']));
  });
});

// The loadout step has never worked: the generator splits `system.class.loadout.uuid` on commas
// and adds what it finds, and the tables shipped free text. Every row now links documents.
describe('loadouts link real documents', () => {
  const rows = () => built.emitted.filter((d) => d.pack === 'rolltables' && d.contentId.startsWith('loadout-'));

  it('ships one table per class, ten rows each', () => {
    expect(rows().map((d) => d.contentId).sort()).toEqual([
      'loadout-android',
      'loadout-marine',
      'loadout-scientist',
      'loadout-teamster',
    ]);
    for (const table of rows()) expect(table.results).toHaveLength(10);
  });

  it('links at least one document for every item the book prints in a row', () => {
    for (const table of rows()) {
      const source = LOADOUTS.find((l) => `loadout-${l.class}` === table.contentId)!;
      const results = (table.document as { results: { description: string }[] }).results;
      results.forEach((result, i) => {
        const links = [...result.description.matchAll(/@UUID\[/g)].length;
        expect(links).toBeGreaterThanOrEqual(source.results[i]!.items.length);
      });
    }
  });

  it('points every link at a gear compendium, never at text', () => {
    for (const table of rows()) {
      const text = JSON.stringify(table.document);
      for (const [, compendium] of text.matchAll(/@UUID\[Compendium\.mothershiprpg\.([a-z_0-9]+)\./g)) {
        expect(['weapons_1e', 'armor_1e', 'equipment_1e']).toContain(compendium);
      }
    }
  });
});

describe('the conditions', () => {
  it('ships the eight the Panic table grants, plus Bleeding', () => {
    const granted = PANIC.results.filter((r) => r.grantsCondition);
    expect(granted).toHaveLength(8);
    expect(CONDITIONS).toHaveLength(9);
    expect(CONDITIONS.map((c) => c.id)).toContain('bleeding');
  });

  it('seeds a modifier only on the three the book vouches for', () => {
    expect(CONDITIONS.filter((c) => c.modifiers.length).map((c) => c.id)).toEqual([
      'frightened',
      'nightmares',
      'spiraling',
    ]);
  });

  // A condition macro cannot hold its condition's id — the build mints it — so the loader writes
  // the call. If that ever came apart, the macro would silently modify nothing.
  it('wires every +1 Condition macro to the condition it names', () => {
    const byId = new Map(
      built.emitted.filter((d) => d.pack === 'conditions').map((d) => [d.id, d.contentId] as const),
    );
    const macros = built.emitted.filter((d) => d.pack === 'triggered' && d.contentId.startsWith('plus-'));
    const wired = macros.filter((m) => (m.document as { command: string }).command.includes('initModifyItem'));
    expect(wired.length).toBeGreaterThan(0);
    for (const macro of wired) {
      const id = (macro.document as { command: string }).command.match(/'([A-Za-z0-9]{16})'/)![1]!;
      expect(macro.contentId).toContain(byId.get(id)!);
    }
  });
});

describe('the tables the rest of the system points at', () => {
  it('names the panic table what actor.js derives its flavour-text key from', () => {
    const panic = built.emitted.find((d) => d.contentId === 'panic-check-stress-normal')!;
    expect(panic.name).toBe('Panic Check');
    expect(panic.name.replaceAll('& ', '').replaceAll(' ', '_').toLowerCase()).toBe('panic_check');
  });

  it('keeps the zero-based formula the book’s d10 and d100 tables need', () => {
    for (const table of built.emitted.filter((d) => d.pack === 'rolltables')) {
      const { formula, results } = table.document as { formula: string; results: { range: number[] }[] };
      if (formula === '1d20') continue;
      expect(formula).toMatch(/^1d(10|100)-1$/);
      expect(results[0]!.range[0]).toBe(0);
    }
  });
});
