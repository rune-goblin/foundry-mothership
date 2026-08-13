<script>
  import MinMaxField from '../MinMaxField.svelte';
  import { localize } from '../../../i18n.ts';

  let { health, hits } = $props();
</script>

<MinMaxField
  label={localize('Mosh.Health')}
  name="system.health.value"
  value={health.value}
  rightName="system.health.max"
  rightValue={health.max}
  leftLabel={localize('Mosh.Current')}
  rightLabel={localize('Mosh.Maximum')}
/>

<MinMaxField
  label={localize('Mosh.Wounds')}
  name="system.hits.value"
  value={hits.value}
  rightName="system.hits.max"
  rightValue={hits.max}
  leftLabel={localize('Mosh.Current')}
  rightLabel={localize('Mosh.Maximum')}
/>
