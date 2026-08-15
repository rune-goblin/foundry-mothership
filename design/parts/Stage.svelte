<script>
  // The DOM shape an ApplicationV2 window gives a mounted component: the shell's own classes, the
  // frame's `.window-content`, and the `.mothership-sheet-root` div ItemSheetApp creates. A
  // specimen rendered outside this wrapper would be a different cascade wearing the same names.
  //
  // `width` is the window's own — `DEFAULT_OPTIONS.position.width` for a sheet, the dialog width
  // for a dialog — so a specimen is as wide as the thing it stands for, not as wide as the page.
  let { children, width = 660 } = $props();
</script>

<div class="ds-stage">
  <div class="application mothership sheet themed theme-light" style="max-width: {width}px;">
    <div class="window-content">
      <div class="mothership-sheet-root">
        {@render children()}
      </div>
    </div>
  </div>
</div>
