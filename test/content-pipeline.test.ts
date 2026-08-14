// The standing content tests, and the proof that each fails when it should.
//
// These run against test/fixtures/content/books/fixture — three packs, one per document type,
// cross-linked by @UUID the way the shipped content is — because a negative case has to be staged,
// and staging one by damaging the real book would mean editing the book. What the same machinery
// produces from the PSG is asserted in content-psg.test.ts.
import { beforeAll, describe, expect, it } from 'vitest';
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Book } from '../scripts/content/book.ts';
import { canonical, emit } from '../scripts/content/emit.ts';
import { IdRegistry, loadRegistry } from '../scripts/content/ids.ts';
import { checkIdPreservation, checkReferences } from '../scripts/content/integrity.ts';
import { build, readStamp, type BuildResult } from '../scripts/content/pipeline.ts';
import type { ContentRecord, PackDefinition } from '../scripts/content/record.ts';
import { FIXTURE_BOOK, FIXTURE_IDS_BEFORE, FIXTURE_ROOT } from './fixtures/content/book.ts';

const ROOT = join(import.meta.dirname, '..');
const FIXTURE_REGISTRY = join(FIXTURE_ROOT, 'ids.json');
const COMPENDIA = new Set(FIXTURE_BOOK.packs.map((p) => p.compendium));

function temp(prefix: string): string {
  return mkdtempSync(join(tmpdir(), `mosh-${prefix}-`));
}

function scratchRegistry(): string {
  const path = join(temp('registry'), 'ids.json');
  copyFileSync(FIXTURE_REGISTRY, path);
  return path;
}

function run(
  books: Book[] = [FIXTURE_BOOK],
  options: { allocate?: boolean; registryPath?: string } = {},
): BuildResult {
  return build({
    root: ROOT,
    books,
    registryPath: options.registryPath ?? FIXTURE_REGISTRY,
    outDir: temp('out'),
    manifestPath: join(temp('manifest'), 'content-manifest.json'),
    allocate: options.allocate,
  });
}

/** The same fixture, with one record rewritten — how each negative case is staged. */
function mutated(pack: string, edit: (record: ContentRecord) => ContentRecord | null): Book[] {
  return [
    {
      ...FIXTURE_BOOK,
      packs: FIXTURE_BOOK.packs.map((def) =>
        def.pack === pack
          ? { ...def, load: (ids) => def.load(ids).map(edit).filter((r): r is ContentRecord => r !== null) }
          : def,
      ),
    },
  ];
}

/** The same fixture with one gadget's `system` replaced outright. */
function systemOf(contentId: string, system: Record<string, unknown>): Book[] {
  return mutated('gadgets', (r) =>
    r.contentId === contentId ? { ...r, body: { kind: 'Item', type: 'condition', system } } : r,
  );
}

/** The same staging as `systemOf`, against the one type carrying an enumerated field. */
function weaponWith(system: Record<string, unknown>): Book[] {
  return mutated('gadgets', (r) =>
    r.contentId === 'flux-capacitor' ? { ...r, body: { kind: 'Item', type: 'weapon', system } } : r,
  );
}

let built: BuildResult;
beforeAll(() => {
  built = run();
});

describe('the fixture is worth testing against', () => {
  it('emits all three document types and a nested result set', () => {
    expect(built.emitted.map((d) => d.contentId).sort()).toEqual([
      'flux-capacitor',
      'minus-1-stress',
      'mishap-table',
      'plus-1-stress',
      'reactor-shim',
    ]);
    expect(built.emitted.reduce((n, d) => n + d.results.length, 0)).toBe(3);
  });

  it('cross-links its documents by @UUID, as the shipped content does', () => {
    const links = [...JSON.stringify([...built.files.values()]).matchAll(/@UUID\[/g)];
    expect(links.length).toBe(5);
  });

  it('stamps every document with the book it came from', () => {
    expect([...new Set(built.emitted.map((d) => d.book))]).toEqual(['fixture']);
  });
});

// Adding the Warden's book must be a directory and a BOOKS entry, never a rework. It stops being
// additive the moment two books claim the same id, pack name or compendium.
describe('a second book is additive', () => {
  it('refuses two books with the same id', () => {
    expect(() => run([FIXTURE_BOOK, { ...FIXTURE_BOOK, packs: [] }])).toThrow('two books claim "fixture"');
  });

  it('refuses two books that fill the same compendium', () => {
    const second = { ...FIXTURE_BOOK, id: 'second', packs: [FIXTURE_BOOK.packs[0]!] };
    expect(() => run([FIXTURE_BOOK, second])).toThrow('two books claim "gadgets"');
  });

  it('emits both books when they claim nothing in common', () => {
    const second: Book = {
      ...FIXTURE_BOOK,
      id: 'second',
      packs: [{ ...FIXTURE_BOOK.packs[1]!, pack: 'asides', compendium: 'fixture_asides_1e' }],
    };
    const result = run([FIXTURE_BOOK, second], {
      allocate: true,
      registryPath: scratchRegistry(),
    });
    expect(result.emitted.filter((d) => d.book === 'second').map((d) => d.pack)).toEqual([
      'asides',
      'asides',
    ]);
    expect(result.registry.packs.asides!.compendium).toBe('fixture_asides_1e');
  });

  it('refuses a new pack without --allocate, rather than minting ids nobody committed', () => {
    const second: Book = {
      ...FIXTURE_BOOK,
      id: 'second',
      packs: [{ ...FIXTURE_BOOK.packs[1]!, pack: 'asides', compendium: 'fixture_asides_1e' }],
    };
    expect(() => run([FIXTURE_BOOK, second])).toThrow(
      /content\/ids\.json declares no pack "asides".*--allocate/s,
    );
  });

  it('refuses a pack whose compendium has moved out from under its ids', () => {
    const moved = [
      {
        ...FIXTURE_BOOK,
        packs: FIXTURE_BOOK.packs.map((p) =>
          p.pack === 'gadgets' ? { ...p, compendium: 'fixture_widgets_1e' } : p,
        ),
      },
    ];
    expect(() => run(moved)).toThrow(
      'content/ids.json has "gadgets" as Item in fixture_gadgets_1e, the build has it as Item in fixture_widgets_1e',
    );
  });
});

// Catches: a timestamp, a random id, or object iteration order leaking into the packs — any of
// which turns every rebuild into a whole-tree diff and hides the change that mattered.
describe('determinism', () => {
  it('produces byte-identical output on a second build', () => {
    const again = run();
    expect([...again.files.keys()].sort()).toEqual([...built.files.keys()].sort());
    for (const [name, text] of built.files) expect(again.files.get(name)).toBe(text);
  });

  it('writes the same bytes to disk that it reports', () => {
    const outDir = temp('out');
    const result = build({
      root: ROOT,
      books: [FIXTURE_BOOK],
      registryPath: FIXTURE_REGISTRY,
      outDir,
    });
    expect(readdirSync(outDir).sort()).toEqual(['gadgets', 'mishaps', 'quips']);
    for (const [rel, text] of result.files) {
      expect(readFileSync(join(outDir, rel), 'utf8')).toBe(text);
    }
  });

  it('would catch a single perturbed byte', () => {
    const a = new Map(built.files);
    const b = new Map(built.files);
    const [first] = [...b.keys()];
    b.set(first!, `${b.get(first!)} `);
    const differing = [...a.keys()].filter((k) => a.get(k) !== b.get(k));
    expect(differing).toEqual([first]);
  });

  it('sorts object keys rather than trusting insertion order', () => {
    expect(canonical({ b: 1, a: { d: 2, c: 3 } })).toBe(canonical({ a: { c: 3, d: 2 }, b: 1 }));
  });

  it('emits no timestamp for a rebuild to churn', () => {
    const text = [...built.files.values()].join('');
    for (const key of ['createdTime', 'modifiedTime', 'coreVersion', 'exportSource']) {
      expect(text).not.toContain(key);
    }
  });
});

// Catches: a document silently disappearing from the build. Its _id is what an installed world
// tracks the document by, so a vanished id orphans every copy already in play.
describe('id preservation', () => {
  it('accounts for every id the registry has handed out', () => {
    expect(checkIdPreservation(FIXTURE_IDS_BEFORE, built.emitted, built.registry)).toEqual([]);
  });

  it('accepts an id that is retired with a reason', () => {
    const retired = built.registry.retired.map((r) => r.id);
    expect(retired).toContain('FiXaaaaaaaaaaa03');
    expect(FIXTURE_IDS_BEFORE.has('FiXaaaaaaaaaaa03')).toBe(true);
  });

  it('fails the build when a document stops being emitted', () => {
    expect(() => run(mutated('gadgets', (r) => (r.contentId === 'flux-capacitor' ? null : r)))).toThrow(
      'ids went missing:\n' +
        '  FiXaaaaaaaaaaa01 vanished — emit it, or retire it in content/ids.json with a reason',
    );
  });

  // Dropping a document something links to is caught earlier still, by the reference check.
  it('never gets the chance to fail when the dropped document is linked', () => {
    expect(() => run(mutated('gadgets', (r) => (r.contentId === 'reactor-shim' ? null : r)))).toThrow(
      /@UUID target fixture_gadgets_1e\.FiXaaaaaaaaaaa02 was not emitted/,
    );
  });

  it('fails the build when a rolltable result stops being emitted', () => {
    expect(() =>
      run(
        mutated('mishaps', (r) =>
          r.body.kind === 'RollTable'
            ? { ...r, body: { ...r.body, results: r.body.results.filter((x) => x.contentId !== 'r03') } }
            : r,
        ),
      ),
    ).toThrow('FiXddddddddddd03 vanished — emit it, or retire it in content/ids.json with a reason');
  });

  it('fails when a retirement carries no reason', () => {
    const registry = { ...built.registry, retired: [{ ...built.registry.retired[0]!, reason: '  ' }] };
    expect(checkIdPreservation(FIXTURE_IDS_BEFORE, built.emitted, registry)).toEqual([
      'FiXaaaaaaaaaaa03 is retired with no reason',
    ]);
  });

  it('refuses to retire without a reason at all', () => {
    const ids = new IdRegistry(loadRegistry(FIXTURE_REGISTRY));
    expect(() => ids.retire('gadgets', 'reactor-shim', '', '2026-08-12')).toThrow(/needs a reason/);
  });

  it('carries a retired table’s result ids into the retirement record', () => {
    const ids = new IdRegistry(loadRegistry(FIXTURE_REGISTRY));
    ids.retire('mishaps', 'mishap-table', 'fixture', '2026-08-12');
    expect(ids.registry.retired.map((r) => r.id).sort()).toEqual([
      'FiXaaaaaaaaaaa03',
      'FiXccccccccccc01',
      'FiXddddddddddd01',
      'FiXddddddddddd02',
      'FiXddddddddddd03',
    ]);
  });
});

// Catches: a `system` key no DataModel declares. Foundry's SchemaField cleans such a key off on
// load, so the build succeeds, the pack ships, and the data is gone the first time anyone opens
// the document. This is the repo's signature bug — armour `equipped`, creature `swarm`, and the
// twelve like them that `test/sheet-bindings.test.ts` now pins across all 13 types.
describe('the DataModel guard', () => {
  it('passes the fixture, whose system keys MothershipConditionModel declares', () => {
    const item = built.emitted.find((d) => d.contentId === 'flux-capacitor')!;
    expect(Object.keys(item.document.system as object).sort()).toEqual([
      'description',
      'severity',
      'treatment',
    ]);
  });

  it('fails the build on an undeclared key', () => {
    expect(() =>
      run(
        systemOf('flux-capacitor', {
          description: '<p>Bends time.</p>',
          duration: '1d10 rounds',
        }),
      ),
    ).toThrow(
      'emitted content does not fit its DataModel:\n' +
        '  fixture_gadgets_1e/flux-capacitor: condition declares no system.duration — Foundry would discard it on load',
    );
  });

  it('fails on an undeclared key nested inside a SchemaField', () => {
    expect(() =>
      run(
        systemOf('flux-capacitor', {
          description: '<p>Bends time.</p>',
          treatment: { value: 2, salve: 'bacta' },
        }),
      ),
    ).toThrow(/condition declares no system\.treatment\.salve/);
  });

  // A condition's modifiers are an array of SchemaFields, so both checks have to descend into the
  // list. Until they did, a mistyped scope was emitted, cleaned off on load, and the condition
  // silently modified nothing.
  it('reaches inside an array of SchemaFields', () => {
    const modifiers = (entry: Record<string, unknown>) =>
      systemOf('flux-capacitor', { description: '<p>Bends time.</p>', modifiers: [entry] });

    expect(() => run(modifiers({ modifier: 'disadvantage', scope: 'restSave' }))).not.toThrow();
    expect(() => run(modifiers({ modifier: 'disadvantage', scope: 'restSave', unless: 'sedated' }))).toThrow(
      /condition declares no system\.modifiers\[0\]\.unless/,
    );
    expect(() => run(modifiers({ modifier: 'disadvantage', scope: 'chariotRace' }))).toThrow(
      /system\.modifiers\[0\]\.scope = "chariotRace" is not one of the choices condition declares/,
    );
  });

  it('accepts a record that sets only some of the declared fields', () => {
    expect(() => run(systemOf('flux-capacitor', { description: '<p>Bends time.</p>' }))).not.toThrow();
  });

  // A StringField that declares `choices` validates on load as well. An off-list value falls back
  // to the initial, which loses the data exactly as quietly as an undeclared key -- and the
  // title-cased band below is precisely what the emitter used to write.
  it('fails on a value outside the choices its field declares', () => {
    expect(() => run(weaponWith({ range: 'Long' }))).toThrow(
      'emitted content does not fit its DataModel:\n' +
        '  fixture_gadgets_1e/flux-capacitor: system.range = "Long" is not one of the choices weapon declares',
    );
  });

  it('accepts a declared choice, and rejects the blank the field does not offer', () => {
    expect(() => run(weaponWith({ range: 'long' }))).not.toThrow();
    // "No range" is the value `none`, not an absent one -- setting choices turns blank off.
    expect(() => run(weaponWith({ range: '' }))).toThrow(/system\.range = "" is not one of/);
    expect(() => run(weaponWith({ range: 'none' }))).not.toThrow();
  });

  it('fails on an Item type no DataModel is registered for', () => {
    expect(() =>
      run(
        mutated('gadgets', (r) =>
          r.contentId === 'flux-capacitor'
            ? { ...r, body: { kind: 'Item', type: 'starship', system: {} } }
            : r,
        ),
      ),
    ).toThrow(/no DataModel is registered for Item type "starship"/);
  });
});

// Catches: an @UUID that resolves to nothing. A broken content link is invisible until a player
// clicks it, and the build that produced it is the only place it can be caught cheaply.
describe('referential integrity', () => {
  it('resolves every @UUID the fixture emits', () => {
    expect(checkReferences({ systemId: 'mothershiprpg', emitted: built.emitted, compendia: COMPENDIA })).toEqual([]);
  });

  it('fails on a link to a document nothing emitted', () => {
    expect(() =>
      run(
        systemOf('flux-capacitor', {
          description:
            '<p>@UUID[Compendium.mothershiprpg.fixture_macros_1e.Macro.DeAdDeAdDeAdDe01]{Gone}</p>',
        }),
      ),
    ).toThrow(/@UUID target fixture_macros_1e\.DeAdDeAdDeAdDe01 was not emitted/);
  });

  it('fails on a link into a compendium this build does not produce', () => {
    expect(() =>
      run(
        systemOf('flux-capacitor', {
          description:
            '<p>@UUID[Compendium.mothershiprpg.conditions_1e.Item.FiXbbbbbbbbbbb01]{Elsewhere}</p>',
        }),
      ),
    ).toThrow(/unknown compendium "conditions_1e"/);
  });

  it('fails on a link that still names the pre-rename package', () => {
    expect(() =>
      run(
        systemOf('flux-capacitor', {
          description: '<p>@UUID[Compendium.mosh.fixture_macros_1e.Macro.FiXbbbbbbbbbbb01]{Old}</p>',
        }),
      ),
    ).toThrow(/targets package "mosh"/);
  });

  it('resolves a link that points at a rolltable result', () => {
    const emitted = built.emitted.map((d) =>
      d.contentId === 'flux-capacitor'
        ? {
            ...d,
            document: {
              ...d.document,
              system: {
                description:
                  '<p>@UUID[Compendium.mothershiprpg.fixture_tables_1e.RollTable.FiXddddddddddd02]{A result}</p>',
              },
            },
          }
        : d,
    );
    expect(checkReferences({ systemId: 'mothershiprpg', emitted, compendia: COMPENDIA })).toEqual([]);
  });
});

// Catches: a macro command reading `game.settings.get` directly (audit C1's shipped bug), naming
// a bare document id (audit C2), or calling a retired `init*` verb — decision 4 retires all three
// in favour of `game.mothershiprpg`'s own entry points, which resolve targeting and identity
// themselves.
describe('the macro command guard', () => {
  it('passes the fixture, whose macros call the new API', () => {
    // `beforeAll` already built the fixture; a violation here would have thrown before this runs.
    expect(built.emitted.filter((d) => d.pack === 'quips')).toHaveLength(2);
  });

  it('fails on a macro that reads game.settings.get directly', () => {
    expect(() =>
      run(
        mutated('quips', (r) =>
          r.body.kind === 'Macro'
            ? { ...r, body: { ...r.body, command: "game.settings.get('mothershiprpg', 'macroTarget');" } }
            : r,
        ),
      ),
    ).toThrow(/macro command reads game\.settings\.get directly/);
  });

  it('fails on a macro that embeds a bare document id', () => {
    expect(() =>
      run(
        mutated('quips', (r) =>
          r.body.kind === 'Macro'
            ? { ...r, body: { ...r.body, command: "game.mothershiprpg.rollTable('31YibfjueXuZdNLb');" } }
            : r,
        ),
      ),
    ).toThrow(/macro command embeds a bare document id/);
  });

  it('fails on a macro that calls a retired init* verb', () => {
    expect(() =>
      run(
        mutated('quips', (r) =>
          r.body.kind === 'Macro'
            ? { ...r, body: { ...r.body, command: "game.mothershiprpg.initModifyActor('stress', 1, null, true);" } }
            : r,
        ),
      ),
    ).toThrow(/macro command calls a retired init\* verb/);
  });
});

describe('the emitted document', () => {
  const stamp = readStamp(ROOT);

  it('carries only what fvtt package pack reads', () => {
    const item = built.emitted.find((d) => d.contentId === 'flux-capacitor')!;
    expect(Object.keys(item.document).sort()).toEqual([
      '_id',
      '_key',
      '_stats',
      'img',
      'name',
      'ownership',
      'system',
      'type',
    ]);

    const macro = built.emitted.find((d) => d.contentId === 'plus-1-stress')!;
    expect(Object.keys(macro.document).sort()).toEqual([
      '_id',
      '_key',
      '_stats',
      'command',
      'img',
      'name',
      'ownership',
      'scope',
      'type',
    ]);

    const table = built.emitted.find((d) => d.contentId === 'mishap-table')!;
    expect(Object.keys(table.document).sort()).toEqual([
      '_id',
      '_key',
      '_stats',
      'description',
      'displayRoll',
      'formula',
      'img',
      'name',
      'ownership',
      'replacement',
      'results',
    ]);
  });

  it('drops the exported-world debris the inherited packs carry', () => {
    for (const doc of built.emitted) {
      for (const key of ['folder', 'sort', 'flags', 'effects', 'lastModifiedBy']) {
        expect(doc.document).not.toHaveProperty(key);
      }
    }
  });

  it('stamps _stats from system.json and nothing more', () => {
    for (const doc of built.emitted) {
      expect(doc.document._stats).toEqual({
        systemId: stamp.systemId,
        systemVersion: stamp.systemVersion,
      });
    }
    expect(stamp.systemId).toBe('mothershiprpg');
  });

  it('builds _key from the id, per document type', () => {
    const byId = Object.fromEntries(built.emitted.map((d) => [d.contentId, d.document]));
    expect(byId['flux-capacitor']!._key).toBe('!items!FiXaaaaaaaaaaa01');
    expect(byId['plus-1-stress']!._key).toBe('!macros!FiXbbbbbbbbbbb01');
    expect(byId['mishap-table']!._key).toBe('!tables!FiXccccccccccc01');
    const results = (byId['mishap-table'] as { results: { _key: string }[] }).results;
    expect(results.map((r) => r._key)).toEqual([
      '!tables.results!FiXccccccccccc01.FiXddddddddddd01',
      '!tables.results!FiXccccccccccc01.FiXddddddddddd02',
      '!tables.results!FiXccccccccccc01.FiXddddddddddd03',
    ]);
  });

  it('keeps the +/- sign in the filename, so the pair does not collapse', () => {
    const names = built.emitted.filter((d) => d.pack === 'quips').map((d) => d.filename).sort();
    expect(names).toEqual(['minus_1_Stress.json', 'plus_1_Stress.json']);
  });

  it('refuses a record whose shape does not match its pack', () => {
    const ids = new IdRegistry(loadRegistry(FIXTURE_REGISTRY));
    const def = FIXTURE_BOOK.packs.find((p) => p.pack === 'gadgets')!;
    const record = def.load(ids)[0]!;
    expect(() =>
      emit(
        def,
        { ...record, body: { kind: 'Macro', type: 'script', scope: 'global', command: '' } },
        ids,
        stamp,
        'fixture',
      ),
    ).toThrow(/pack holds Item but the record is Macro/);
  });
});

describe('the registry gate', () => {
  const newcomer = (contentId: string): ContentRecord => ({
    contentId,
    name: 'Newcomer',
    img: 'systems/mothershiprpg/images/icons/ui/conditions/exhausted.png',
    body: { kind: 'Item', type: 'condition', system: { description: '<p>New.</p>' } },
    provenance: { source: 'fixture' },
  });

  const extra = (contentId: string): Book[] => [
    {
      ...FIXTURE_BOOK,
      packs: FIXTURE_BOOK.packs.map((def) =>
        def.pack === 'gadgets'
          ? { ...def, load: (ids) => [...def.load(ids), newcomer(contentId)] }
          : def,
      ),
    },
  ];

  it('fails the build on an unregistered record', () => {
    expect(() => run(extra('newcomer'))).toThrow(
      /gadgets\/newcomer is not in content\/ids\.json.*--allocate/s,
    );
  });

  it('mints a fresh 16-character id under --allocate and rewrites the registry', () => {
    const registryPath = scratchRegistry();
    const result = run(extra('newcomer'), { allocate: true, registryPath });
    const minted = result.registry.packs.gadgets!.documents.newcomer!.id;
    expect(minted).toMatch(/^[A-Za-z0-9]{16}$/);
    expect(loadRegistry(registryPath).packs.gadgets!.documents.newcomer!.id).toBe(minted);
  });

  it('never derives the id from the record, so two allocations differ', () => {
    const a = run(extra('newcomer'), { allocate: true, registryPath: scratchRegistry() });
    const b = run(extra('newcomer'), { allocate: true, registryPath: scratchRegistry() });
    expect(a.registry.packs.gadgets!.documents.newcomer!.id).not.toBe(
      b.registry.packs.gadgets!.documents.newcomer!.id,
    );
  });

  it('leaves a registered id alone when the record is renamed', () => {
    const renamed = run(
      mutated('gadgets', (r) => (r.contentId === 'reactor-shim' ? { ...r, name: 'Reactor Wedge' } : r)),
    );
    const doc = renamed.emitted.find((d) => d.contentId === 'reactor-shim')!;
    expect(doc.id).toBe('FiXaaaaaaaaaaa02');
    expect(doc.name).toBe('Reactor Wedge');
  });

  it('rejects a content id that is not a slug', () => {
    expect(() => run(extra('Newcomer!'))).toThrow(/content ids must match/);
  });

  it('does not touch the registry when nothing is allocated', () => {
    const registryPath = scratchRegistry();
    const before = readFileSync(registryPath, 'utf8');
    run([FIXTURE_BOOK], { allocate: true, registryPath });
    expect(readFileSync(registryPath, 'utf8')).toBe(before);
  });
});

describe('the build manifest', () => {
  it('records provenance outside the packs, never inside one', () => {
    const path = join(temp('manifest'), 'content-manifest.json');
    const result = build({
      root: ROOT,
      books: [FIXTURE_BOOK],
      registryPath: FIXTURE_REGISTRY,
      outDir: temp('out'),
      manifestPath: path,
    });
    const manifest = JSON.parse(readFileSync(path, 'utf8')) as {
      books: { id: string; title: string; documents: number }[];
      documents: { id: string; provenance: { book: string; source: string } }[];
    };
    expect(manifest.documents.length).toBe(result.emitted.length);
    expect(manifest.documents.every((d) => d.provenance.book === 'fixture')).toBe(true);
    expect(manifest.books).toEqual([
      {
        id: 'fixture',
        title: 'Fixture book',
        dir: 'test/fixtures/content/books/fixture',
        documents: result.emitted.length,
      },
    ]);

    const packed = [...result.files.values()].join('');
    expect(packed).not.toContain('provenance');
    expect(packed).not.toContain('fixtures/content/books');
  });
});

// A book's records now arrive as imports, so a `dir` typo can no longer empty one silently. What
// `dir` still decides is what the manifest cites as every document's provenance, and where BOOK.md
// records the printing and the licence — so both have to be there.
describe('the book directory', () => {
  it('rejects a book whose directory is not there', () => {
    expect(() =>
      run([{ ...FIXTURE_BOOK, dir: 'content/books/nonesuch' }]),
    ).toThrow(/content\/books\/nonesuch: no such directory/);
  });

  it('rejects a book that records nothing about itself', () => {
    const root = temp('bookless');
    mkdirSync(join(root, FIXTURE_BOOK.dir), { recursive: true });
    copyFileSync(join(ROOT, 'system.json'), join(root, 'system.json'));

    expect(() =>
      build({ root, books: [FIXTURE_BOOK], registryPath: FIXTURE_REGISTRY, outDir: temp('out') }),
    ).toThrow(/books\/fixture: no BOOK\.md/);
  });
});
