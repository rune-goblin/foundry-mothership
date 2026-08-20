/**
 * A dragged-in condition (Foundry's own drop handler, not this system's code) mints a fresh id, so
 * it never matches by id — only by exact name. Both `id` and `name` count as identity because
 * granting through `applyCondition` keeps the compendium id but dragging doesn't.
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
