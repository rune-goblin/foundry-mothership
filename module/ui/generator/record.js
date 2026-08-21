const SYSTEM_ID = 'mothershiprpg';
const FLAG = 'creation';
const PATH = `flags.${SYSTEM_ID}.${FLAG}`;

export const RECORD_VERSION = 1;

/**
 * The creation run stored on an actor, or null where there is none to read. A record written by a
 * version this one does not know reads as absent rather than as a run to replay.
 */
export function creationRecord(actor) {
  const record = actor?.getFlag?.(SYSTEM_ID, FLAG) ?? null;
  return record?.version === RECORD_VERSION ? record : null;
}

/**
 * A record only ever says a run finished. Its absence is not an answer, so characters made before
 * the wizard kept one — or in a world that predates this — keep the control they have always had.
 */
export function creationFinished(actor) {
  return creationRecord(actor)?.done === true;
}

// ForcedReplacement, not a plain object: an update merges, and a merged record would keep answers
// the run has since taken back. render:false because the sheet sits open behind the wizard and
// shows nothing this writes.
function write(actor, record) {
  return actor.update(
    { [PATH]: foundry.data.operators.ForcedReplacement.create(record) },
    { render: false },
  );
}

export function saveRun(actor, draft, step) {
  return write(actor, { version: RECORD_VERSION, done: false, step, ...draft.answers() });
}

export function finishCreation(actor) {
  return write(actor, { version: RECORD_VERSION, done: true });
}
