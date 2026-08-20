<script>
  let { name, label, value } = $props();
</script>

<div class="textarea-field">
  <div class="resource-label">{label}</div>
  <textarea {name} rows="2" class="textarea-input" {value}></textarea>
</div>

<style>
  @layer system {
    .textarea-field {
      --textarea-field-margin-inline-start: var(--space-6);

      margin-left: var(--textarea-field-margin-inline-start);
      flex: 0;
      grid-column-start: 1;
      grid-column-end: 3;
    }

    /* Foundry only stretches a textarea to its container inside an AppV1 window; width: 100%
       below replaces that for this ApplicationV2 sheet. */
    .textarea-input {
      --textarea-field-input-font-family: var(--font-sans-mothership);
      --textarea-field-input-font-size: var(--font-size-md);
      --textarea-field-input-margin: calc(var(--space-2) * -1);
      --textarea-field-input-font-weight: var(--font-weight-medium);
      --textarea-field-input-text: var(--text-inverted);
      --textarea-field-input-surface: var(--surface-neutral-lowest);
      --textarea-field-input-border-width: var(--border-width-2);
      --textarea-field-input-border-color: var(--border-neutral-ink);
      --textarea-field-input-radius: var(--radius-lg);
      --textarea-field-input-height: 50px; /* measurement, not a spacing-scale step */

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
