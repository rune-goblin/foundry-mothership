<script>
  import Field from '../../parts/Field.svelte';
  import { localize } from '../../../i18n.ts';

  const SIGN = { advantage: '[+]', disadvantage: '[-]' };

  let { system } = $props();

  // Read-only: the modifiers come from the book via the content build, and Foundry's form handling
  // has no shape for editing an array of objects. Editing is booked with the Svelte architecture
  // audit (docs/plans/design-system.md).
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
  /* Svelte emits component CSS unlayered, which would outrank every layered rule in the
     application; @layer system puts these in the slot the rest of the system occupies.
     One name is here, and nothing else in the system writes it. The rest of this file's markup
     wears vocabulary css/mothership.css keeps declaring: `circle-statwrapper-horizontal`, which
     all five item bodies hand-write, and `resource-label`, which eleven components do.
     The `resource` wrapper carries no rule that reaches this file: Field declares its own slots
     on that name, scoped to itself. */
  @layer system {
    .condition-modifiers {
      --condition-modifiers-margin-block-start: var(--space-2);
      --condition-modifiers-margin-block-end: var(--space-0);
      --condition-modifiers-margin-inline: var(--space-0);
      /* 18 is off the space scale -- 16 and 20 straddle it -- and it is the indent the markers
         hang in, so a snap moves every bullet. It waits for the reviewed literal sweep. */
      --condition-modifiers-padding-inline-start: 18px;

      margin: var(--condition-modifiers-margin-block-start) var(--condition-modifiers-margin-inline)
        var(--condition-modifiers-margin-block-end);
      padding-left: var(--condition-modifiers-padding-inline-start);
    }
  }
</style>
