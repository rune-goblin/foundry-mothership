<script>
  // The chrome a railed dialog is drawn inside — DialogV2 builds the form, content wrapper and
  // footer; `svelte-dialog.ts` adds the mount point and rail class. None of it belongs to the body
  // component, but a specimen that left it out would be showing a layout the system never renders.
  let { children, buttons = [] } = $props();

  // Foundry stamps `autofocus` on the default button and the rail's filled state reads it back.
  // Spread rather than written out: it's a real a11y warning on a page that opens on load, and
  // this page is a gallery of eighty specimens.
  const attributes = (button) => ({
    class: button.class ?? '',
    ...(button.default === true ? { autofocus: true } : {}),
  });
</script>

<div class="mothership macro-popup-dialog macro-popup-rail">
  <form class="dialog-form standard-form">
    <div class="dialog-content standard-form">
      <div class="mothership-dialog-root">
        {@render children()}
      </div>
    </div>
    <footer class="form-footer">
      {#each buttons as button (button.action)}
        <button type="button" {...attributes(button)}>
          {#if button.icon}<i class={button.icon}></i>{/if}
          <span>{button.label}</span>
        </button>
      {/each}
    </footer>
  </form>
</div>
