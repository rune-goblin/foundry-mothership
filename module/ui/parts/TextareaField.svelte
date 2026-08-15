<script>
  // A captioned textarea spanning both columns of the sheet it sits in. The character sheet's
  // trauma response and the class sheet's are the same box; each hand-wrote it, differing only by
  // a `margin-right: 0px` that no rule in the bundle or in foundry2.css was ever overriding.
  let { name, label, value } = $props();
</script>

<div class="textarea-field">
  <div class="resource-label">{label}</div>
  <textarea {name} rows="2" class="textarea-input" {value}></textarea>
</div>

<style>
  /* Svelte emits component CSS unlayered, which would outrank every layered rule in the
     application; @layer system puts these in the slot the rest of the system occupies.
     `resource-label` stays shared vocabulary -- twenty sites write it. `textarea-input` had
     exactly two writers, the two boxes this component replaces, so it comes along. */
  @layer system {
    .textarea-field {
      /* 6 is off the space scale -- 4 and 8 straddle it -- so it waits for the reviewed sweep. */
      --textarea-field-margin-inline-start: 6px;

      margin-left: var(--textarea-field-margin-inline-start);
      flex: 0;
      grid-column-start: 1;
      grid-column-end: 3;
    }

    /* Foundry stretches a textarea to its container only inside an AppV1 window, so a converted
       sheet's trauma-response box collapsed to the 20-column intrinsic default. Same class of bug
       as the item thumbnails' border: the rule was never ours, and an .application window never
       saw it. */
    .textarea-input {
      --textarea-field-input-font-family: var(--font-sans-mothership);
      /* 11pt is 14.67px, between --font-size-md (14.4) and --font-size-lg (16) and on neither;
         the -0.15em bleed is an em against a px scale. Both wait for the sweep. */
      --textarea-field-input-font-size: 11pt;
      --textarea-field-input-margin: -0.15em;
      --textarea-field-input-font-weight: var(--font-weight-medium);
      --textarea-field-input-text: var(--text-inverted);
      --textarea-field-input-surface: var(--surface-neutral-lowest);
      --textarea-field-input-border-width: var(--border-width-2);
      --textarea-field-input-border-color: var(--border-neutral-ink);
      --textarea-field-input-radius: var(--radius-lg);
      /* 50 sits between --space-48 and -56: the sweep's, not this unit's. */
      --textarea-field-input-height: 50px;

      width: 100%;
      height: var(--textarea-field-input-height);
      font-family: var(--textarea-field-input-font-family);
      font-size: var(--textarea-field-input-font-size);
      font-weight: var(--textarea-field-input-font-weight);
      margin: var(--textarea-field-input-margin);
      border: var(--textarea-field-input-border-width) solid var(--textarea-field-input-border-color);
      border-radius: var(--textarea-field-input-radius);
      color: var(--textarea-field-input-text);
      background: var(--textarea-field-input-surface);
      resize: none;
      min-height: 0;
      overflow: hidden;
    }
  }
</style>
