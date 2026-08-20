// Foundry documents aren't reactive: refresh() re-reads a fresh snapshot on each render, so the
// document stays the source of truth and nothing is mirrored into local state. `extra` carries
// data the shell computed asynchronously, e.g. enriched HTML.
export function createDocumentStore(document, extra = {}) {
  const read = (more) => ({
    id: document.id,
    uuid: document.uuid,
    type: document.type,
    name: document.name,
    img: document.img,
    system: document.system,
    ...more,
  });

  let snapshot = $state.raw(read(extra));

  return {
    get current() {
      return snapshot;
    },
    get document() {
      return document;
    },
    refresh(more = {}) {
      snapshot = read(more);
    },
  };
}
