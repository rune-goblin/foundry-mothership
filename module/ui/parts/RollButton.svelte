<script>
  import { onActivate } from './activate.js';

  // The die IS the control here, unlike RollDie's cue riding a label, so it turns on its own
  // hover. `circle-input` is shared tier: the button fills a stat's number circle until the
  // roll lands and a readonly input takes its place.
  let { key, title, onroll } = $props();
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
<img
  class="roll-button circle-input"
  src="icons/svg/d20-black.svg"
  alt="roll"
  {title}
  data-roll={key}
  role="button"
  tabindex="0"
  onclick={onroll}
  onkeydown={onActivate(onroll)}
/>

<style>
  @layer system {
    .roll-button {
      --rollbutton-spin-duration: 500ms;

      cursor: pointer;
      transition: transform var(--rollbutton-spin-duration) ease-in-out;
    }

    .roll-button:hover {
      transform: rotate(360deg);
    }

    @media (prefers-reduced-motion: reduce) {
      .roll-button {
        transition: none;
      }

      .roll-button:hover {
        transform: none;
      }
    }
  }
</style>
