<script>
  // The choice itself is the dialog's buttons -- one per package -- so this only shows what each
  // one contains.
  let { text, options } = $props();
</script>

<div class="mosh">
  <div class="characterGeneratorSkillPopup">
    <p class="skillpopupDescription">{text}</p>
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
  </div>
</div>
