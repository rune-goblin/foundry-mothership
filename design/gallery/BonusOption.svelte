<script module>
  export const meta = {
    group: 'Dialog bodies',
    title: 'BonusOption',
    path: 'module/ui/generator/BonusOption.svelte',
    note: 'The choice itself is the dialog’s buttons — one per package — so this only shows what each one contains.',
  };
</script>

<script>
  import BonusOption from '../../module/ui/generator/BonusOption.svelte';

  const options = [
    { name: 'Package A', counts: ['2 Trained skills', '1 Expert skill'] },
    { name: 'Package B', counts: ['1 Master skill'], fromList: 'from the Science list' },
  ];
</script>

<BonusOption text="Your class grants one of these." {options} />
