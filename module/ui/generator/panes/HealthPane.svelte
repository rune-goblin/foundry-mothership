<script>
  import MainStat from '../../parts/MainStat.svelte';
  import RollBox from '../RollBox.svelte';
  import { localize } from '../../../i18n.ts';

  let { draft } = $props();
</script>

<div class="wizard-prose">
  <p>{localize('Mothership.CharacterGenerator.Wizard.Health.Wounds')}</p>
</div>

<div class="wizard-rolls">
  <RollBox
    key="health"
    label={localize('Mothership.Health')}
    value={draft.rolled.health}
    onroll={() => draft.roll('health')}
  />
  <MainStat key="wounds" label={localize('Mothership.Wounds')}>
    {#snippet control()}
      <input class="circle-input" type="text" readonly data-value="wounds" value={draft.wounds} />
    {/snippet}
  </MainStat>
</div>
