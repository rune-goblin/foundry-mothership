<script>
  import RollBox from '../RollBox.svelte';
  import { localize } from '../../../i18n.ts';

  let { draft, rolls } = $props();

  const rollAll = async () => {
    for (const [key] of rolls) await draft.roll(key);
  };
</script>

<div class="wizard-rolls">
  {#each rolls as [key, label] (key)}
    <RollBox
      {key}
      label={localize(label)}
      value={draft.rolled[key]}
      onroll={() => draft.roll(key)}
    />
  {/each}
</div>
<!-- "Roll the rest" has nothing left to roll once the last die is in, and a control that does
     nothing is worse than no control. -->
{#if rolls.some(([key]) => draft.rolled[key] === null)}
  <button type="button" class="wizard-bulk" data-roll="all" onclick={rollAll}>
    {localize('Mothership.CharacterGenerator.Wizard.RollRemaining')}
  </button>
{/if}
