<script>
  import RollDie from './RollDie.svelte';
  import { onActivate } from './activate.js';

  // The look comes from css/mothership.css (`rollable` hover group) and the class the caller passes
  // in (`mainstattext`, `creaturestat`); the only rule below is the one holding `trailing` beside
  // the word, which no shared class can express.
  let { label, key, class: extra = '', dieTone = 'muted', dieScale, trailing, onroll } = $props();
</script>

<span
  class="ability-mod stat-roll rollable {extra}"
  data-key={key}
  data-label={label}
  role="button"
  tabindex="0"
  onclick={onroll}
  onkeydown={onActivate(onroll)}
>
  <!-- One child, not two, so `.stat-roll`'s space-between still puts the die on the far edge
       however much `trailing` carries. -->
  <span class="stat-caption">{label}{#if trailing}{@render trailing()}{/if}</span>
  <RollDie tone={dieTone} scale={dieScale} />
</span>

<style>
  @layer system {
    .stat-caption {
      display: inline-flex;
      align-items: baseline;
      gap: var(--space-8);
      min-width: 0;
    }
  }
</style>
