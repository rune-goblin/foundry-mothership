<script module>
  export const meta = {
    group: 'Dialog bodies',
    title: 'StatOption',
    path: 'module/ui/class/StatOption.svelte',
    note: 'The value and the stats it may be spent on are one answer, so both are gathered here and reported whole on every change. The order the answer lists them in is this list’s, not the order they were ticked.',
  };
</script>

<script>
  import StatOption from '../../module/ui/class/StatOption.svelte';
  import { CHOOSABLE_STATS } from '../../module/ui/class/choosable-stats.js';
  import { localize } from '../../module/i18n.ts';
  import { say } from './fixtures.js';

  const stats = CHOOSABLE_STATS.map((stat) => ({ key: stat.key, label: localize(stat.label) }));
</script>

<div class="mothership macro-popup-dialog">
  <StatOption
    heading="Choose a stat adjustment"
    valueLabel="Value"
    {stats}
    value={{ modification: 10 }}
    onchange={say('stat option')}
  />
</div>
