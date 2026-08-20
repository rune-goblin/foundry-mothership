<script>
  // <prose-mirror> saving dispatches a bubbling change event; the sheet's form handler
  // picks it up, so there's no explicit save handler wired here.
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

<!-- display:contents keeps this out of layout so <prose-mirror>, which carries .editor
     itself, is the direct child the CSS sizes. -->
<div class="editor-host" {@attach proseMirror}></div>

<style>
  @layer system {
    .editor-host {
      display: contents;
    }
  }
</style>
