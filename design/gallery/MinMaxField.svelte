<script module>
  export const meta = {
    group: 'Primitives',
    title: 'MinMaxField',
    path: 'module/ui/parts/MinMaxField.svelte',
    note: 'Two numbers either side of a slant. The right-hand field is a maximum on Health and Wounds and a minimum on Stress, so it is named rather than derived.',
  };
</script>

<script>
  import MinMaxField from '../../module/ui/parts/MinMaxField.svelte';
  import { say } from './fixtures.js';
</script>

<div class="grid grid-3col">
  <MinMaxField
    label="Health"
    name="system.health.value"
    value={14}
    rightName="system.health.max"
    rightValue={20}
    leftLabel="Current"
    rightLabel="Maximum"
  />
  <MinMaxField
    label="Wounds"
    name="system.hits.value"
    value={1}
    rightName="system.hits.max"
    rightValue={3}
    leftLabel="Current"
    rightLabel="Maximum"
  />
  <MinMaxField
    label="Stress"
    labelClass="rollable"
    onroll={say('roll stress')}
    name="system.other.stress.value"
    value={5}
    rightName="system.other.stress.min"
    rightValue={2}
    leftLabel="Current"
    rightLabel="Minimum"
  />
</div>
