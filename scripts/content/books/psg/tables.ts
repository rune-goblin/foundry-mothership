// The twelve RollTables: five wound tables, panic, death, trinkets, patches, and one loadout table
// per class.
//
// Every table's die is zero-based except panic, because the book prints its d10 and d100 tables
// starting at 0 — hence the `-1` on the formula, matching the ranges the catalogs carry.
import { CLASSES } from '../../../../content/books/psg/classes.ts';
import { CONDITIONS } from '../../../../content/books/psg/conditions.ts';
import { DEATH } from '../../../../content/books/psg/death.ts';
import { LOADOUT_ITEMS, type GearRef, type LoadoutItemText } from '../../../../content/books/psg/gear.ts';
import { LOADOUTS } from '../../../../content/books/psg/loadouts.ts';
import { PANIC } from '../../../../content/books/psg/panic.ts';
import { PATCHES } from '../../../../content/books/psg/patches.ts';
import { TRINKETS } from '../../../../content/books/psg/trinkets.ts';
import { WOUNDS } from '../../../../content/books/psg/wounds.ts';
import type { RollRange } from '../../../../content/books/common.ts';
import type { ContentRecord, IdLookup, PackDefinition, TableResult } from '../../record.ts';
import { link, PACKS } from './uuid.ts';

const SOURCE = 'content/books/psg';
const IMG = 'systems/mothershiprpg/images/icons/ui/rolltables';

const WOUND_TABLE = {
  'blunt-force': { contentId: 'blunt-force-wound', name: 'Blunt Force Wound', img: `${IMG}/wounds_blunt_force.png` },
  bleeding: { contentId: 'bleeding-wound', name: 'Bleeding Wound', img: `${IMG}/wounds_bleeding.png` },
  gunshot: { contentId: 'gunshot-wound', name: 'Gunshot Wound', img: `${IMG}/wounds_gunshot.png` },
  'fire-explosives': {
    contentId: 'fire-explosives-wound',
    name: 'Fire & Explosives Wound',
    img: `${IMG}/wounds_fire_&_explosives.png`,
  },
  'gore-massive': {
    contentId: 'gore-massive-wound',
    name: 'Gore & Massive Wound',
    img: `${IMG}/wounds_gore_&_massive.png`,
  },
} as const;

const WOUND_DESCRIPTION =
  '<p>Whenever you gain this kind of Wound, roll on this table to determine the effect. ' +
  '<strong>Flesh Wounds</strong> are small inconveniences. <strong>Minor/Major Injuries</strong> cause ' +
  'lasting issues which require medical treatment. <strong>Lethal Injuries</strong> can kill you if not ' +
  'dealt with immediately. <strong>Fatal Injuries</strong> can kill outright. <strong>Bleeding</strong> ' +
  'wounds, if not treated can quickly overwhelm you.</p>';

/** `r01`, `r02`, … — the ids content/ids.json already holds for the tables that shipped. */
const resultId = (n: number, width = 2): string => `r${String(n).padStart(width, '0')}`;

/** The first severity band the roll reaches, per the book's `severityByRoll` ladder. */
function severity(roll: number): string {
  let name: string = WOUNDS.severityByRoll[0]!.name;
  for (const band of WOUNDS.severityByRoll) if (roll >= band.from) name = band.name;
  return name;
}

function rows(results: readonly { range: RollRange }[], describe: (i: number) => string, width = 2): TableResult[] {
  return results.map((r, i) => ({ contentId: resultId(i + 1, width), range: r.range, description: describe(i) }));
}

const wounds = (): ContentRecord[] =>
  WOUNDS.tables.map((table) => {
    const meta = WOUND_TABLE[table.id];
    return {
      contentId: meta.contentId,
      name: meta.name,
      img: meta.img,
      body: {
        kind: 'RollTable',
        formula: '1d10-1',
        description: WOUND_DESCRIPTION,
        results: rows(table.results, (i) => {
          const result = table.results[i]!;
          return `<strong>${severity(result.range[0])}:</strong> ${result.effect}`;
        }),
      },
      provenance: { source: `${SOURCE}/wounds.ts`, sourceId: table.id, page: WOUNDS.source.page },
    };
  });

const CONDITION_BY_PANIC = new Map(CONDITIONS.map((c) => [c.name.toLowerCase(), c] as const));

/**
 * A panic result that grants a Condition links the macro that raises it, so the Warden clicks
 * once. The other results link nothing — S8 is where the rest of the table starts doing work.
 */
function panicDescription(result: (typeof PANIC.results)[number], ids: IdLookup): string {
  const body = `<strong>${result.name.toUpperCase()}.</strong> ${result.effect}`;
  if (!result.grantsCondition) return body;
  const condition = CONDITION_BY_PANIC.get(result.name.toLowerCase());
  if (!condition) throw new Error(`panic ${result.range[0]}: no condition named "${result.name}"`);
  return `${body}<br><br>${link(ids, 'triggered', `plus-1-${condition.id}`, `+1 ${condition.name}`)}`;
}

// "Panic Check", not the old "Panic Check (Stress, Normal)": the Calm and android variants went
// with §25, and actor.js derives its flavour-text key from the table's name — `Mosh.table.panic_check`
// is the key that has always been there.
const panic = (ids: IdLookup): ContentRecord => ({
  contentId: 'panic-check-stress-normal',
  name: 'Panic Check',
  img: `${IMG}/panic_check.png`,
  body: {
    kind: 'RollTable',
    formula: PANIC.die,
    description: `<p>${PANIC.rule} Some results are severe enough to leave a lasting impression, called <strong>Conditions</strong>, which affect you until they are treated.</p>`,
    results: rows(PANIC.results, (i) => panicDescription(PANIC.results[i]!, ids)),
  },
  provenance: { source: `${SOURCE}/panic.ts`, sourceId: PANIC.id, page: PANIC.source.page },
});

const death = (): ContentRecord => ({
  contentId: 'death-save',
  name: 'Death Save',
  img: `${IMG}/death_save.png`,
  body: {
    kind: 'RollTable',
    formula: '1d10-1',
    description: '<p>Roll when your Health reaches zero, or when a Wound demands it.</p>',
    results: rows(DEATH.results, (i) => DEATH.results[i]!.effect),
  },
  provenance: { source: `${SOURCE}/death.ts`, sourceId: DEATH.id, page: DEATH.source.page },
});

interface FlavourTable {
  id: string;
  results: readonly { range: RollRange; text: string }[];
  source: { page: number };
}

const flavour = (
  contentId: string,
  name: string,
  img: string,
  description: string,
  table: FlavourTable,
  file: string,
): ContentRecord => ({
  contentId,
  name,
  img,
  body: {
    kind: 'RollTable',
    formula: '1d100-1',
    description,
    results: rows(table.results, (i) => table.results[i]!.text, 3),
  },
  provenance: { source: `${SOURCE}/${file}`, sourceId: table.id, page: table.source.page },
});

/**
 * The loadout row, with its items as links rather than the free text the book prints. This is what
 * the mapping in gear.ts exists for: the generator adds what the row grants, and until now that
 * path had no data at all.
 */
function loadoutDescription(text: string, items: readonly string[], ids: IdLookup): string {
  const links = items.flatMap((item) => {
    const refs: readonly GearRef[] = LOADOUT_ITEMS[item as LoadoutItemText];
    return refs.map((ref) => {
      const label = ref.quantity && ref.quantity > 1 ? `${item} (x${ref.quantity})` : item;
      return link(ids, ref.kind === 'item' ? 'equipment' : ref.kind === 'armor' ? 'armor' : 'weapons', ref.id, label);
    });
  });
  return `${text}<br><br>${links.join('<br>')}`;
}

const loadouts = (ids: IdLookup): ContentRecord[] =>
  LOADOUTS.map((table) => {
    const klass = CLASSES.find((c) => c.id === table.class)!;
    return {
      contentId: `loadout-${table.class}`,
      name: table.name,
      img: 'icons/svg/chest.svg',
      body: {
        kind: 'RollTable',
        formula: '1d10-1',
        description: `<p>The gear a ${klass.name} starts with.</p>`,
        results: rows(table.results, (i) =>
          loadoutDescription(table.results[i]!.text, table.results[i]!.items, ids),
        ),
      },
      provenance: { source: `${SOURCE}/loadouts.ts`, sourceId: table.id, page: table.source.page },
    };
  });

export const ROLLTABLES: PackDefinition = {
  ...PACKS.rolltables,
  documentType: 'RollTable',
  load: (ids: IdLookup): ContentRecord[] => [
    ...wounds(),
    panic(ids),
    death(),
    flavour('trinkets', 'Trinkets', 'icons/svg/coins.svg', '<p>What you carry that you cannot explain.</p>', TRINKETS, 'trinkets.ts'),
    flavour('patches', 'Patches', 'icons/svg/tower-flag.svg', '<p>What you wear on your shoulder.</p>', PATCHES, 'patches.ts'),
    ...loadouts(ids),
  ],
};
