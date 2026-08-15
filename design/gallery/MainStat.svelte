<script module>
  export const meta = {
    group: 'Primitives',
    title: 'MainStat',
    path: 'module/ui/parts/MainStat.svelte',
    note: 'A black label bar beside a circle. `onroll` makes the caption the roll; `control` replaces the input where the circle is something else, and `after` holds what sits beside it.',
  };
</script>

<script>
  import MainStat from '../../module/ui/parts/MainStat.svelte';
  import { say } from './fixtures.js';
</script>

<div class="grid grid-4col">
  <MainStat name="system.stats.strength.value" value={42} label="Strength" key="strength" />
  <MainStat
    name="system.stats.intellect.value"
    value={48}
    label="Intellect"
    key="intellect"
    onroll={say('roll intellect')}
  />
  <MainStat name="system.stats.combat.value" value={30} label="Combat" key="combat" wrapper={false} />
  <MainStat name="system.stats.body.value" value={40} label="Body" key="body">
    {#snippet after()}
      <input class="circle-input" type="text" value="+5" />
    {/snippet}
  </MainStat>
</div>
