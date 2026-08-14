<script>
  import Field from '../../parts/Field.svelte';
  import { localize } from '../../../i18n.ts';

  const SIGN = { advantage: '[+]', disadvantage: '[-]' };

  let { system } = $props();

  // Read-only: the modifiers come from the book via the content build, and Foundry's form handling
  // has no shape for editing an array of objects. Editing is booked as S9 in docs/plans/psg-core.md.
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
