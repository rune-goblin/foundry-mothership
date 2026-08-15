<script>
  // The choice itself is the dialog's buttons -- one per package -- so this only shows what each
  // one contains.
  //
  // No <style> block: the package card's border, radius and padding are inline below and duplicate
  // nothing -- they join the S9 call-site list with the rest of the generator's hand-written markup.
  import SkillPopup from './SkillPopup.svelte';

  let { text, options } = $props();
</script>

<SkillPopup description={text}>
  <div class="grid grid-2col widegap">
    {#each options as option (option.name)}
      <div style="border:3px solid #111;border-radius: 1em;padding: 0.5em;">
        <p style="text-decoration: underline;">{option.name}:</p>
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
