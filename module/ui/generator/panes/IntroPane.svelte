<script>
  import WizardProse from '../WizardProse.svelte';

  let { lines } = $props();
</script>

<div class="wizard-intro">
  <WizardProse lines={lines.slice(0, 2)} />
  <img
    class="wizard-intro-cover"
    src="/systems/mothershiprpg/images/mothership-cover.webp"
    alt=""
  />
</div>

<style>
  @layer system {
    .wizard-intro {
      position: relative;
      flex: 1;
      min-height: 28rem;
    }

    /* WizardProse owns the block; the front matter is the one place it is set over an image and
       has to leave the cover its corner. */
    .wizard-intro :global(.wizard-prose) {
      position: relative;
      z-index: 1;
      width: 72%;
      font-size: var(--font-size-lg);
      line-height: var(--body-md-line-height);
    }

    .wizard-intro-cover {
      position: absolute;
      right: 0;
      bottom: 0;
      z-index: 0;
      display: block;
      width: min(77%, 28rem);
      max-height: 28rem;
      border: 0;
      object-fit: contain;
    }
  }
</style>
