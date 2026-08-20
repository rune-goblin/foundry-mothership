// A Svelte component mounts once but ApplicationV2 re-renders many times; binding by selector
// on each render would stack duplicate listeners. This attachment binds once to its node and
// tears down with it.
export function dropTarget(onDrop) {
  return (node) => {
    const dragover = (event) => event.preventDefault();

    const drop = (event) => {
      event.preventDefault();
      onDrop(foundry.applications.ux.TextEditor.implementation.getDragEventData(event), event);
    };

    node.addEventListener('dragover', dragover);
    node.addEventListener('drop', drop);

    return () => {
      node.removeEventListener('dragover', dragover);
      node.removeEventListener('drop', drop);
    };
  };
}
