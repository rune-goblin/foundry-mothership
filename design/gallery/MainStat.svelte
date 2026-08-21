<script module>
  export const meta = {
    group: 'Primitives',
    title: 'MainStat',
    path: 'module/ui/parts/MainStat.svelte',
    note: 'A black label bar beside a circle. `onroll` makes the caption the roll; `control` replaces the input where the circle is something else; `adjusted` prints the number the roll actually uses over the circle, italic and in the modifier\'s tone, with the stored base still in the input beneath; `modifier` hangs a control on the circle\'s rim, which is where StatModifier goes. `size="lg"` is the same organism at 1.3x, for the two stats a creature is rolled on all night.',
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
  <MainStat
    name="system.stats.body.value"
    value={40}
    label="Body"
    key="body"
    adjusted={45}
    tone="up"
  />
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
