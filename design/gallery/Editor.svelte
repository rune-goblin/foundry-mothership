<script module>
  export const meta = {
    group: 'Primitives',
    title: 'Editor',
    path: 'module/ui/parts/Editor.svelte',
    standIn: 'Foundry’s `<prose-mirror>` element. The gallery renders the enriched HTML in its place — the editor itself needs a live document to save to.',
    note: 'The V1 `{{editor}}` helper emitted markup only AppV1’s `activateEditor` could wire up. The V2 equivalent is self-contained: it takes a `name`, and saving dispatches a bubbling change event the sheet’s form handler picks up.',
  };
</script>

<script>
  import Editor from '../../module/ui/parts/Editor.svelte';
</script>

<Editor
  name="system.description"
  value="<p>Hauled cargo on the Kestrel run for nine years.</p>"
  enriched="<p>Hauled cargo on the Kestrel run for nine years. Still counts the trips.</p>"
  uuid="Design.demo"
/>
