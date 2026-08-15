<script module>
  export const meta = {
    group: 'Primitives',
    title: 'Field',
    path: 'module/ui/parts/Field.svelte',
    note: 'The label/input pair every item sheet repeats. `choices` turns it into a select so a schema enum is picked rather than typed.',
  };
</script>

<script>
  import Field from '../../module/ui/parts/Field.svelte';

  const ranks = ['Trained', 'Expert', 'Master'].map((rank) => ({ value: rank, label: rank }));
</script>

<div class="grid grid-3col">
  <Field name="system.cost" label="Cost" value="3000" dtype="Number" />
  <Field name="system.rank" label="Rank" value="Expert" choices={ranks} />
  <Field name="system.range" label="Range" value="Long" wrapper="text" />
</div>

<div class="grid grid-2col">
  <Field name="system.weight" label="Weight" value="2" dtype="Number" slim />
  <Field name="system.bonus" label="Bonus" value="+5" width="80px" />
</div>
