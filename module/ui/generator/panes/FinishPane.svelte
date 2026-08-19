<script>
  import { localize } from '../../../i18n.ts';

  let { draft } = $props();
</script>

<div class="wizard-identity">
  <label>
    <span>{localize('Mothership.Name')}</span>
    <input type="text" name="name" bind:value={draft.name} />
  </label>
  <label>
    <span>{localize('Mothership.Pronouns')}</span>
    <input type="text" name="pronouns" bind:value={draft.pronouns} />
  </label>
</div>

<style>
  @layer system {
    .wizard-identity {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-12);
    }

    .wizard-identity label {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .wizard-identity span {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-semibold);
      color: var(--wizard-ink-muted);
    }
  }
</style>
