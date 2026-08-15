<script module>
  export const meta = {
    group: 'Dialog bodies',
    title: 'StatChoice',
    path: 'module/ui/generator/StatChoice.svelte',
    note: 'Which stat the class’s adjustment is spent on is the dialog’s buttons; this is the question.',
  };
</script>

<script>
  import StatChoice from '../../module/ui/generator/StatChoice.svelte';
</script>

<div class="mothership macro-popup-dialog">
  <StatChoice text="Spend +10 on which stat?" />
</div>
