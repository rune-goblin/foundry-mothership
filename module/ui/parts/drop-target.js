// AppV1 wired drops through `options.dragDrop` with a `.dropitem` selector, re-bound on every
// render. A Svelte component mounts once while ApplicationV2 re-renders many times, so
// re-binding by selector would stack duplicate listeners on the same node. An attachment binds
// to the node it is written on and tears itself down with it.
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
