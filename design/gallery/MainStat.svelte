<script module>
  export const meta = {
    group: 'Primitives',
    title: 'MainStat',
    path: 'module/ui/parts/MainStat.svelte',
    note: 'A black label bar beside a circle. `onroll` makes the caption the roll; `control` replaces the input where the circle is something else; `modifier` rides the right end of the pill, where the character sheet puts a stat\'s bonus. `size="lg"` is the same organism at 1.3x, for the two stats a creature is rolled on all night.',
  };
</script>

<script>
  import MainStat from '../../module/ui/parts/MainStat.svelte';
  import { say } from './fixtures.js';
</script>

<div class="grid grid-2col" style="max-width: 496px;">
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
    {#snippet modifier()}
      <span class="stat-mod-sign">+</span>
      <input class="stat-mod" type="text" value={5} />
    {/snippet}
  </MainStat>
</div>

<p class="ds-caption">The modifier, at zero and negative — the sign is the caller's, not the field's</p>
<div class="grid grid-2col" style="max-width: 496px;">
  <MainStat name="system.stats.speed.value" value={35} label="Speed" key="speed">
    {#snippet modifier()}
      <span class="stat-mod-sign">+</span>
      <input class="stat-mod is-zero" type="text" value={0} />
    {/snippet}
  </MainStat>
  <MainStat name="system.stats.sanity.value" value={25} label="Sanity" key="sanity">
    {#snippet modifier()}
      <input class="stat-mod" type="text" value={-10} />
    {/snippet}
  </MainStat>
</div>

<p class="ds-caption">size="lg" — the creature sheet's Combat and Instinct</p>
<div class="grid grid-2col" style="max-width: 496px;">
  <MainStat
    size="lg"
    name="system.stats.combat.value"
    value={65}
    label="Combat"
    key="combat"
    onroll={say('roll combat')}
  />
  <MainStat
    size="lg"
    name="system.stats.instinct.value"
    value={55}
    label="Instinct"
    key="instinct"
    onroll={say('roll instinct')}
  />
</div>
