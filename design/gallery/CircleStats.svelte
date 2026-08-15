<script module>
  export const meta = {
    group: 'Primitives',
    title: 'CircleStats',
    path: 'module/ui/parts/CircleStats.svelte',
    note: 'The wrapper the item bodies lay their stats out in. `variant` picks the direction; the classes are the shared stat tier in css/mothership.css.',
  };
</script>

<script>
  import CircleStats from '../../module/ui/parts/CircleStats.svelte';
  import Field from '../../module/ui/parts/Field.svelte';
</script>

<CircleStats variant="horizontal">
  <Field name="system.armorPoints" label="Armor Points" value="7" dtype="Number" />
  <Field name="system.damageReduction" label="DMG Reduction" value="0" dtype="Number" />
  <Field name="system.oxygenMax" label="Oxygen" value="12" dtype="Number" />
</CircleStats>
