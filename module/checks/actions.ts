/**
 * The services behind the buttons enriched text renders. `chat/actions.ts` knows how a click
 * becomes a typed `ChatAction`; this is what each verb does, and *who to* is the caller's — R4's
 * `forTargetActors` passes the same resolver the rest of the API uses, so targeting is decided
 * once for macros, sheets and buttons alike (audit RC6).
 *
 * A bare `@Check[fear]` opens the roll prompt rather than rolling flat: the prompt is where a
 * condition preselects the modifier it argues for (§34), and content that states no modifier is
 * content leaving the choice open. `@Table[gunshot]` rolls straight away — no condition names a
 * Wound table, so there is nothing for a dialog to add.
 */

import { registerChatAction } from '../chat/actions.ts';
import { gainAddress, type ChatAction } from '../chat/enrichers.ts';
import { mutationCard, postCard } from '../chat/cards.ts';
import { isCondition } from '../conditions.ts';
import { mutate, type Change } from '../mutation/mutate.ts';
import { parseRollSpec } from '../rolls/parse.ts';
import { CHECK_SEMANTICS, type Advantage, type RollSpec } from '../rolls/spec.ts';
import { cardSource, speakerOf, voiceOfActor, type CheckActor } from './actor.ts';
import { checkOf, runCheck } from './checks.ts';
import { evaluateRoll, type Rolled } from './roll.ts';
import { runTable } from './tables.ts';

/** Who the click acts on. R4 supplies the one resolver; until then a caller passes its own. */
export type TargetActors = () => Promise<readonly CheckActor[]> | readonly CheckActor[];

/** An amount is rolled the way damage is: what it says on the dice, top face and all. */
const AMOUNT_KIND = 'weapon-damage';

/** A modifier a piece of content states is an instruction; stating none leaves the choice open. */
function stated(advantage: Advantage): Advantage | null {
  return advantage === 'none' ? null : advantage;
}

/**
 * How much of a condition this actor is carrying — `@Gain[health -bleeding]` asks for it. Matched
 * by `isCondition`, the same identity `@Apply` grants by: a compendium id when the condition was
 * granted through this system (`mutation/items.ts` passes `{keepId: true}`), or the exact
 * canonical name when it was not — a condition dragged straight onto the sheet from the
 * compendium never touches this system's write path at all, and keeps whatever fresh id Foundry's
 * own drop handler minted for it.
 */
function severityOf(actor: CheckActor, condition: string): number {
  let total = 0;
  for (const item of actor.items) {
    if (item.type !== 'condition' || !isCondition(item, condition)) continue;
    const system = (item.system ?? {}) as { severity?: unknown };
    total += Number(system.severity) || 0;
  }
  return total;
}

export async function gain(
  actor: CheckActor,
  action: Extract<ChatAction, { verb: 'gain' }>,
): Promise<void> {
  const { amount } = action;
  let spec: RollSpec | null = null;
  let rolled: Rolled | null = null;
  let change: Change;

  if (amount.kind === 'roll') {
    spec = parseRollSpec(amount.dice, CHECK_SEMANTICS[AMOUNT_KIND].aim);
    rolled = await evaluateRoll({ spec, kind: AMOUNT_KIND });
    change = { kind: 'roll', roll: rolled.roll };
  } else if (amount.kind === 'severity') {
    change = { kind: 'amount', amount: amount.sign * severityOf(actor, amount.condition) };
  } else {
    change = { kind: 'amount', amount: amount.amount };
  }

  const result = await mutate(actor, gainAddress(action), change);
  const card = mutationCard({
    source: cardSource(actor),
    result,
    voice: voiceOfActor(actor),
    spec,
    rollOutcome: rolled?.outcome ?? null,
  });
  await postCard(card, { speaker: speakerOf(actor) });
}

/** Run one action against every actor the click was aimed at. */
export async function runAction(action: ChatAction, actors: readonly CheckActor[]): Promise<void> {
  for (const actor of actors) {
    switch (action.verb) {
      case 'check':
        await runCheck(actor, checkOf(action.scope), { advantage: stated(action.advantage) });
        break;
      case 'table':
        await runTable(actor, action.table, { advantage: action.advantage });
        break;
      case 'gain':
        await gain(actor, action);
        break;
      case 'apply':
        // `api.ts`'s `registerActions` claims this verb directly, with `applyCondition` — the
        // branch stays only so the switch covers every `ChatAction['verb']`.
        break;
    }
  }
}

/** The verbs `checks/` can answer for. `init.ts` (R5) calls this once, with R4's resolver. */
export const REGISTERED_VERBS = ['check', 'table', 'gain'] as const;

export function registerCheckActions(target: TargetActors): void {
  for (const verb of REGISTERED_VERBS) {
    registerChatAction(verb, async (action) => {
      await runAction(action, await target());
    });
  }
}
