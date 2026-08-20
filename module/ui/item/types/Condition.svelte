<script>
  import Field from '../../parts/Field.svelte';
  import { localize } from '../../../i18n.ts';

  const SIGN = { advantage: '[+]', disadvantage: '[-]' };

  let { system } = $props();

  // Read-only: modifiers come from the book via content build, and Foundry's form handling has no
  // shape for editing an array of objects.
  const modifiers = $derived(
    (system.modifiers ?? []).map((m) => `${localize(`Mothership.RollScope.${m.scope}`)} ${SIGN[m.modifier]}`),
  );
</script>

<div class="circle-statwrapper-horizontal">
  <Field name="system.severity" label={localize('Mothership.Severity')} value={system.severity} dtype="Number" />
</div>

{#if modifiers.length}
  <div class="resource">
    <span class="resource-label">{localize('Mothership.RollModifiers')}</span>
    <ul class="condition-modifiers">
      {#each modifiers as modifier (modifier)}
        <li>{modifier}</li>
      {/each}
    </ul>
  </div>
{/if}

<style>
  /* @layer system outranks Svelte's unlayered component CSS. Only `.condition-modifiers` is
     scoped here — `circle-statwrapper-horizontal`/`resource-label` stay in the shared tier. */
  @layer system {
    .condition-modifiers {
      --condition-modifiers-margin-block-start: var(--space-2);
      --condition-modifiers-margin-block-end: var(--space-0);
      --condition-modifiers-margin-inline: var(--space-0);
      --condition-modifiers-padding-inline-start: var(--space-20);

      margin: var(--condition-modifiers-margin-block-start) var(--condition-modifiers-margin-inline)
        var(--condition-modifiers-margin-block-end);
      padding-left: var(--condition-modifiers-padding-inline-start);
    }
  }
</style>
