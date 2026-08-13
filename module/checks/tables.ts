/**
 * Rolling on one of the system's tables, and doing what the roll costs. `tables/tables.ts` draws
 * the row and judges the roll without touching anything; the parts with consequences — spending
 * the Wound the table charges for, reading the Stress a Panic Check is measured against, asking
 * which way to roll — are here, where they can be seen.
 *
 * The prompt names the table it is about to roll and the die that table uses. Legacy titled it
 * "Panic Check" and rolled 1d20 for every table in the system, with the correct code sitting
 * unreachable underneath (audit F2).
 */

import { chooseAdvantage } from '../dialogs/prompts.ts';
import { mutationOutcome, postCard, tableCard, type Card } from '../chat/cards.ts';
import { notifyMiss } from '../lookup.ts';
import { mutate, type MutationResult } from '../mutation/mutate.ts';
import { CHECK_SEMANTICS, type Advantage } from '../rolls/spec.ts';
import {
  isRobotic,
  resolveTable,
  rollOnTable,
  tableCheckKind,
  tableSpec,
  TABLES,
  type TableDraw,
  type TableKey,
} from '../tables/tables.ts';
import { cardSource, speakerOf, stressOf, voiceOfActor, type CheckActor } from './actor.ts';
import { conditionModifier, conditionNote, conditionPreselect } from './conditions.ts';
import { panicTheme } from './settings.ts';

/** The schema's name for the Wound track; the book's word for it is on the label. */
const WOUNDS = 'system.hits.value';

export interface TableOptions {
  /** The modifier the caller already knows; `null` or absent opens the prompt. */
  readonly advantage?: Advantage | null;
}

export interface TableResult {
  readonly kind: 'table';
  readonly key: TableKey;
  readonly draw: TableDraw;
  /** The Wound this roll cost, on the tables that charge one (PSG 29.1). */
  readonly wound: MutationResult | null;
  readonly card: Card;
}

/** Only the Panic Check is judged against anything, and what it is judged against is Stress. */
function targetOf(actor: CheckActor, key: TableKey): number | null {
  return key === 'panic' ? stressOf(actor.system) : null;
}

export async function runTable(
  actor: CheckActor,
  key: TableKey,
  options: TableOptions = {},
): Promise<TableResult | null> {
  const found = await resolveTable(key);
  if (!found.found) {
    notifyMiss(found.request);
    return null;
  }
  const table = found.document;

  let advantage = options.advantage ?? null;
  if (advantage === null) {
    // Nothing modifies a Wound roll: `panicCheck` is the one table a condition can name.
    const modifier = conditionModifier(actor.items, key === 'panic' ? 'panicCheck' : null);
    advantage = await chooseAdvantage({
      title: table.name,
      die: TABLES[key].die,
      note: conditionNote(modifier),
      preselect: conditionPreselect(modifier),
    });
    if (advantage === null) return null;
  }

  const voice = voiceOfActor(actor);
  const source = cardSource(actor);

  const wound = TABLES[key].wound ? await mutate(actor, WOUNDS, { kind: 'amount', amount: 1 }) : null;
  const spec = tableSpec(key, advantage);
  const draw = await rollOnTable(table, {
    key,
    spec,
    target: targetOf(actor, key),
    robotic: isRobotic(actor),
    colorset: key === 'panic' ? panicTheme() : '',
  });

  const card = tableCard({
    source,
    draw,
    spec,
    comparison: CHECK_SEMANTICS[tableCheckKind(key)].comparison,
    voice,
    woundText: wound === null ? '' : mutationOutcome({ source, result: wound, voice }),
  });
  await postCard(card, { speaker: speakerOf(actor), roll: draw.roll });

  return { kind: 'table', key, draw, wound, card };
}
