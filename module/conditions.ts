/**
 * The nine conditions the system can apply, and what counts as "this actor already has it" — the
 * one leaf both `api.ts` (targeting `@Apply`) and `checks/actions.ts` (reading `@Gain[health
 * -bleeding]`'s severity) import, so a two-file cycle between them never has to exist.
 *
 * Granting a condition writes through `createEmbeddedDocuments({keepId: true})` now
 * (`mutation/items.ts`), so the compendium id survives that one path. It does not survive a
 * condition dragged straight from the compendium onto a sheet — Foundry's own drop handler mints
 * a fresh id and never touches this system's code at all. An id match and an exact name match are
 * both real identity, and only their union covers both paths; the loose, case-folded name
 * comparison this replaced covered neither reliably (a rename or a translation could still slip
 * past it, silently).
 */

/** The canonical name and document id `content/ids.json` minted for each condition slug. */
export const CONDITION_IDS: Readonly<Record<string, { readonly id: string; readonly name: string }>> = {
  bleeding: { id: 'pxtF1NfletmoFFGV', name: 'Bleeding' },
  coward: { id: 'YIF9QkUlexxauSCE', name: 'Coward' },
  deflated: { id: 'waimTU6LXaADcJrT', name: 'Deflated' },
  doomed: { id: 'x41AwiI03h7wNjaM', name: 'Doomed' },
  frightened: { id: 'z0avrplKe6M0RcXk', name: 'Frightened' },
  haunted: { id: 'olC4JytslvUrQN8g', name: 'Haunted' },
  'loss-of-confidence': { id: 'kbbVOYgjwzoODs7N', name: 'Loss of Confidence' },
  nightmares: { id: 'MLPSYfWrwY6R7JDy', name: 'Nightmares' },
  spiraling: { id: 'Bt2rl2c5jGyt3QAr', name: 'Spiraling' },
};

export interface ConditionItem {
  readonly id?: string | null;
  readonly name: string;
}

/** Whether `item` is the condition `slug` names — by its compendium id, or its exact book name. */
export function isCondition(item: ConditionItem, slug: string): boolean {
  const identity = CONDITION_IDS[slug];
  return identity !== undefined && (item.id === identity.id || item.name === identity.name);
}
