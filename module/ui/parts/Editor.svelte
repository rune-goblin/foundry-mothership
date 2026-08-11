<script>
  // The V1 `{{editor}}` helper emitted markup that only AppV1's activateEditor could wire up.
  // The V2 equivalent is the <prose-mirror> form element, which is self-contained: it takes a
  // `name`, and saving dispatches a bubbling change event that the sheet's form handler picks up.
  let { name, value, enriched, uuid } = $props();

  function proseMirror(node) {
    const editor = foundry.applications.elements.HTMLProseMirrorElement.create({
      name,
      value,
      enriched,
      toggled: true,
      collaborate: false,
      documentUUID: uuid,
    });
    node.replaceChildren(editor);
    return () => editor.remove();
  }
</script>

<!-- The host exists only as a mount point; display:contents keeps it out of the layout so the
     <prose-mirror> element, which carries .editor itself, is the direct child the CSS sizes. -->
<div class="editor-host" {@attach proseMirror}></div>

<style>
  .editor-host {
    display: contents;
  }
</style>
