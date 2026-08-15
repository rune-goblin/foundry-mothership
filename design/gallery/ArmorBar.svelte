<script module>
  export const meta = {
    group: 'Primitives',
    title: 'ArmorBar',
    path: 'module/ui/parts/ArmorBar.svelte',
    note: 'The black armour bar: two values either side of a white slant, each showing the cover bonus it gains in orange. ArmorBlock draws it on the character sheet and Cover draws it once per option; both hand-wrote it until it became one component.',
  };
</script>

<script>
  import ArmorBar from '../../module/ui/parts/ArmorBar.svelte';
  import { COVER_BONUS } from '../../module/rules.ts';
</script>

<div class="grid grid-4col">
  {#each Object.entries(COVER_BONUS) as [cover, bonus] (cover)}
    <div>
      <p class="ds-caption">{cover}</p>
      <ArmorBar left={7} right={0} leftBonus={bonus.armorPoints} rightBonus={bonus.damageReduction} />
    </div>
  {/each}
</div>

<p class="ds-caption">spread — the Cover dialog’s form</p>
<ArmorBar left={7} right={0} leftBonus={20} rightBonus={5} spread />
