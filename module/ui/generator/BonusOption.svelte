<script>
  // The choice itself is the dialog's buttons -- one per package -- so this only shows what each
  // one contains.
  import SkillPopup from './SkillPopup.svelte';

  let { text, options } = $props();
</script>

<SkillPopup description={text}>
  <div class="grid grid-2col packages">
    {#each options as option (option.name)}
      <div class="package">
        <p class="package-name">{option.name}:</p>
        <ul>
          {#each option.counts as count (count)}
            <li>{count}</li>
          {/each}
          {#if option.fromList}
            <li>{option.fromList}</li>
          {/if}
        </ul>
      </div>
    {/each}
  </div>
</SkillPopup>

<style>
  /* Svelte emits component CSS unlayered, which would outrank every layered rule in the
     application; @layer system puts these in the slot the rest of the system occupies.

     This row used to wear `widegap` and never got it: the dialog shell carried its own copy of
     `.grid-2col` at (0,3,0), which outweighed `.mothership .widegap` at (0,2,0), so the one
     element in the system wearing both rendered at 2px while its markup asked for 16. The copy
     is gone -- it declared exactly what `.mothership .grid-2col` declares, and settling that tie
     was the only thing keeping it alive -- and the gap is this component's own slot now, at
     (0,3,0) on weight rather than on which file the bundler wrote last. */
  @layer system {
    .grid-2col.packages {
      --bonusoption-packages-gap: var(--space-16);

      gap: var(--bonusoption-packages-gap);
    }

    .package {
      --bonusoption-package-border-width: var(--border-width-3);
      --bonusoption-package-border-color: var(--border-neutral-ink);
      --bonusoption-package-radius: var(--radius-lg);
      --bonusoption-package-padding: var(--space-8);

      border: var(--bonusoption-package-border-width) solid var(--bonusoption-package-border-color);
      border-radius: var(--bonusoption-package-radius);
      padding: var(--bonusoption-package-padding);
    }

    .package-name {
      text-decoration: underline;
    }
  }
</style>
