<script>
  // The Live Tokens editor's UIInfoPopover: a note that would swamp the thing it annotates, moved
  // behind an info button. The component notes here are long by design — each one argues for what
  // its style block owns and what it left in css/mothership.css — so they read as documentation on
  // demand rather than as a grey wall above every card.
  //
  // Positioned `fixed` and anchored by hand: the card it belongs to clips its own overflow, and an
  // absolutely positioned panel would be cut off by it.
  let { title, text } = $props();

  const MARGIN = 8;

  let open = $state(false);
  let button = $state(null);
  let panel = $state(null);

  function place() {
    if (!button || !panel) return;
    const anchor = button.getBoundingClientRect();
    const box = panel.getBoundingClientRect();

    let left = anchor.right + MARGIN;
    if (left + box.width > innerWidth - MARGIN) {
      left = Math.max(MARGIN, Math.min(anchor.left, innerWidth - MARGIN - box.width));
    }

    let top = anchor.bottom + MARGIN;
    if (top + box.height > innerHeight - MARGIN) {
      top = Math.max(MARGIN, anchor.top - MARGIN - box.height);
    }

    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  }

  $effect(() => {
    if (!open) return;
    place();

    const dismiss = (event) => {
      if (!event.target.closest?.('[data-info-root]')) open = false;
    };
    const escape = (event) => {
      if (event.key === 'Escape') open = false;
    };

    // Capture, so a click inside another card's popover closes this one first.
    document.addEventListener('mousedown', dismiss, true);
    addEventListener('keydown', escape);
    addEventListener('resize', place);
    addEventListener('scroll', place, true);

    return () => {
      document.removeEventListener('mousedown', dismiss, true);
      removeEventListener('keydown', escape);
      removeEventListener('resize', place);
      removeEventListener('scroll', place, true);
    };
  });
</script>

<span data-info-root>
  <button
    class="ds-info-btn"
    bind:this={button}
    type="button"
    aria-expanded={open}
    aria-label="About {title}"
    title="About {title}"
    onclick={() => (open = !open)}
  >
    <i class="fa-solid fa-circle-info"></i>
  </button>

  {#if open}
    <div class="ds-info-panel" bind:this={panel} role="dialog" aria-label="About {title}">
      <div class="ds-info-head">
        <span class="ds-info-title">{title}</span>
        <button class="ds-info-close" type="button" aria-label="Close" onclick={() => (open = false)}>
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <p class="ds-info-body">{text}</p>
    </div>
  {/if}
</span>
