/**
 * Foundry documents are not reactive. A sheet re-renders whenever its document updates, so the
 * shell calls `refresh()` on each render and the components re-read from a fresh snapshot.
 * The document stays the source of truth; nothing is mirrored into local state.
 *
 * `extra` carries anything the shell had to compute asynchronously, such as enriched HTML.
 */
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
