<script>
  import { onActivate } from './activate.js';

  // Rendered even with no handler: the box is the leading column of every row, so a header and a
  // row with nothing to disclose still have to start their cells at the same edge.
  let { open = false, label, onclick } = $props();
</script>

<div class="item-disclosure">
  {#if onclick}
    <a
      class="item-disclosure-toggle"
      class:is-open={open}
      href={null}
      role="button"
      tabindex="0"
      aria-expanded={open}
      title={label}
      aria-label={label}
      {onclick}
      onkeydown={onActivate(onclick)}
    >
      <i class="fas fa-chevron-right" aria-hidden="true"></i>
    </a>
  {/if}
</div>

<style>
  /* Sized to the art column it replaced -- 24px and a 6px gutter -- so swapping the thumbnail for
     the chevron moved no other measurement on the sheet. */
  @layer system {
    .item-disclosure {
      --itemdisclosure-basis: var(--space-24);
      --itemdisclosure-margin-inline-end: var(--space-6);

      display: flex;
      flex: 0 0 var(--itemdisclosure-basis);
      align-items: center;
      justify-content: center;
      margin-right: var(--itemdisclosure-margin-inline-end);
    }

    .item-disclosure-toggle {
      --itemdisclosure-text: var(--text-tertiary);
      --itemdisclosure-hover-text: var(--text-primary);
      --itemdisclosure-font-size: var(--font-size-sm);
      --itemdisclosure-turn-duration: 150ms;

      color: var(--itemdisclosure-text);
      font-size: var(--itemdisclosure-font-size);
      line-height: var(--line-height-none);
    }

    .item-disclosure-toggle:hover {
      color: var(--itemdisclosure-hover-text);
      text-shadow: none;
    }

    /* The glyph turns rather than being swapped for a second one: one icon, and the quarter turn
       is what reads as opening. */
    .item-disclosure-toggle i {
      display: block;
      transition: transform var(--itemdisclosure-turn-duration) ease-in-out;
    }

    .item-disclosure-toggle.is-open i {
      transform: rotate(90deg);
    }

    @media (prefers-reduced-motion: reduce) {
      .item-disclosure-toggle i {
        transition: none;
      }
    }
  }
</style>
