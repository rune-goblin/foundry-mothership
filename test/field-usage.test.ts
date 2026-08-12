import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { installFoundryFieldStubs, type Stub } from './field-stubs.ts';

installFoundryFieldStubs();

const { ACTOR_MODELS } = (await import('../module/data/actor-models.js')) as {
  ACTOR_MODELS: Record<string, { defineSchema: () => Record<string, Stub> }>;
};
const { ITEM_MODELS } = (await import('../module/data/item-models.js')) as {
  ITEM_MODELS: Record<string, { defineSchema: () => Record<string, Stub> }>;
};

function leaves(schema: Record<string, Stub>, prefix = ''): string[] {
  return Object.entries(schema).flatMap(([key, field]) =>
    field.schema ? leaves(field.schema, `${prefix}${key}.`) : [`${prefix}${key}`],
  );
}

// Only the runtime tree. test/foundry-data is a whole Foundry install plus third-party systems, and
// scanning it matches almost any path by accident, which would make this assertion vacuous.
const ROOTS = ['module', 'templates'];
const EXTENSIONS = ['.js', '.svelte', '.html', '.hbs'];

function sources(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = `${dir}/${entry}`;
    if (statSync(path).isDirectory()) sources(path, out);
    else if (EXTENSIONS.some((e) => entry.endsWith(e))) out.push(path);
  }
  return out;
}

const repo = fileURLToPath(new URL('..', import.meta.url));
const corpus = ROOTS.flatMap((r) => sources(`${repo}${r}`))
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n');

type Entry = { pattern: RegExp; reason: string };

/** Reached without a literal `system.<path>` anywhere. Each entry names the code that reaches it. */
const DYNAMIC: Entry[] = [
  {
    pattern: /^stats\.[a-z]+\.(label|rollLabel)$/,
    reason: 'actor.js:1247,1256,1428,1517,1614,1616 read stats[attribute].label/.rollLabel',
  },
  {
    pattern: /^stats\.(thrusters|battle|systems|bankruptcy)\.mod$/,
    reason: 'actor.js:1373 reads stats[attribute].mod; the ship stats have no literal reader',
  },
  {
    pattern: /^netHP\.(min|label)$/,
    reason: 'actor.js:44,81 write netHP as an object literal, not through system.netHP.min',
  },
];

/**
 * Dead, and scheduled. architecture.md defers the ship half of the audited prune to phase 3 (C11)
 * so phases 1-2 touch no ship schema and the SBT megadamage e2e specs cannot be disturbed.
 * These come off this list and out of the schema together.
 */
const DEFERRED_TO_PHASE_3: Entry[] = [
  { pattern: /^images\.beauty$/, reason: 'C11' },
  { pattern: /^megadamage\.menu\.html$/, reason: 'C11' },
  { pattern: /^supplies\.hull\.(25|50|75)$/, reason: 'C11 -- the sheet computes hull.percentage' },
];

/**
 * No reader, and not part of the audited set P0.2 pruned. Grandfathered so this spec can be a
 * ratchet on *new* fields today rather than waiting on a second audit. This list should only ever
 * shrink: before adding to it, prune the field instead.
 */
const GRANDFATHERED: Entry[] = [
  {
    // .max is excluded deliberately: health.max, hits.max and netHP.max are read for real.
    pattern: /^(health|hits|bleeding|netHP)\.min$/,
    reason: 'resource-pool floors; nothing reads them, not even by computed key',
  },
  {
    pattern: /^(other\.resolve|stats\.[a-z]+)\.(min|max)$/,
    reason: 'stat and resolve bounds; nothing reads them, not even by computed key',
  },
  {
    pattern: /^(health|hits|bleeding|other\.resolve)\.label$/,
    reason: 'resource-pool scaffolding; the sheets hardcode these labels in markup',
  },
];

const ALLOWLIST = [...DYNAMIC, ...DEFERRED_TO_PHASE_3, ...GRANDFATHERED];
const allowed = (path: string) => ALLOWLIST.some((e) => e.pattern.test(path));

// Sheets bind `actor.system.<path>` and `item.system.<path>` as well as the bare form, so match the
// tail rather than anchoring.
const used = (path: string) => corpus.includes(`system.${path}`);

const allLeaves = () =>
  [...Object.values(ACTOR_MODELS), ...Object.values(ITEM_MODELS)].flatMap((m) =>
    leaves(m.defineSchema()),
  );

describe('every declared schema leaf has a reader', () => {
  for (const [kind, models] of [
    ['Actor', ACTOR_MODELS],
    ['Item', ITEM_MODELS],
  ] as const) {
    for (const [type, model] of Object.entries(models)) {
      it(`${kind} ${type}`, () => {
        const orphans = leaves(model.defineSchema()).filter((p) => !used(p) && !allowed(p));
        expect(orphans).toEqual([]);
      });
    }
  }
});

// Without these two the allowlist would rot into a rubber stamp: an entry could outlive the field
// it excused, or quietly excuse a field that is genuinely read.
describe('the allowlist stays honest', () => {
  it('every entry still matches a declared leaf', () => {
    const all = allLeaves();
    expect(ALLOWLIST.filter((e) => !all.some((p) => e.pattern.test(p))).map((e) => e.reason)).toEqual(
      [],
    );
  });

  it('no entry excuses a leaf that has a literal reader', () => {
    expect([...new Set(allLeaves().filter((p) => allowed(p) && used(p)))]).toEqual([]);
  });
});
