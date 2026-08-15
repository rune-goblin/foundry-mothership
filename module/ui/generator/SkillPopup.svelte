<script>
  // The body both generator popups share: a centred description over whatever the popup asks for.
  // BonusOption and SkillPicker each hand-wrote it, which is why its two class names sat in
  // css/mothership.css as a shared tier -- a scoped block in either file reached only its own half.
  let { description, children } = $props();
</script>

<div class="mothership">
  <div class="characterGeneratorSkillPopup">
    <p class="skillpopupDescription">{description}</p>
    {@render children?.()}
  </div>
</div>

<style>
  /* Svelte emits component CSS unlayered, which would outrank every layered rule in the
     application; @layer system puts these in the slot the rest of the system occupies. */
  @layer system {
    .characterGeneratorSkillPopup {
      --skillpopup-margin-block-end: var(--space-10);
      --skillpopup-description-padding-block-end: var(--space-4);
      --skillpopup-description-font-weight: var(--font-weight-bold);

      margin-bottom: var(--skillpopup-margin-block-end);
    }

    .skillpopupDescription {
      text-align: center;
      font-weight: var(--skillpopup-description-font-weight);
      padding-bottom: var(--skillpopup-description-padding-block-end);
    }
  }
</style>
