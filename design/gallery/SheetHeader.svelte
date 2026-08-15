<script module>
  export const meta = {
    group: 'Primitives',
    title: 'SheetHeader',
    path: 'module/ui/parts/SheetHeader.svelte',
    note: 'The portrait and name field every item sheet opens with. `data-action="editImage"` is what wires the file picker in V2; AppV1 needed only `data-edit`.',
  };
</script>

<script>
  import SheetHeader from '../../module/ui/parts/SheetHeader.svelte';
</script>

<SheetHeader documentName="Pulse Rifle" img="icons/svg/sword.svg" />
