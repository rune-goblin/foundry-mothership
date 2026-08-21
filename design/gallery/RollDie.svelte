<script module>
  export const meta = {
    group: 'Primitives',
    title: 'RollDie',
    path: 'module/ui/parts/RollDie.svelte',
    note: 'The cue that a label rolls. Sized in em and painted in currentColor, so it takes the size and the ink of whatever label it follows. Two tones: muted for a label on paper, solid where the ground is black and the grey would silt up. Its rise is solved, not chosen: glyph centre and cap-height centre both sit 0.35em up, so the die stays on the label’s centre at any scale. Decorative, since the control it sits in already carries the name of the roll.',
  };
</script>

<script>
  import RollDie from '../../module/ui/parts/RollDie.svelte';
</script>

<p class="ds-caption">Muted, on the labels that carry it</p>
<div class="flex-group-left">
  <span class="mainstattext">Combat<RollDie /></span>
  <span class="creaturestat">Fear<RollDie /></span>
  <!-- The pill takes its black ground from an .items-list ancestor, so the specimen supplies one. -->
  <ol class="items-list">
    <li class="skill-name">Piloting<RollDie /></li>
  </ol>
</div>

<p class="ds-caption">Solid — the stat pill, where the die also rides the right edge</p>
<div class="mainstatwrapper">
  <div class="resource mainstat">
    <div class="mainstatlabel">
      <span class="mainstattext stat-roll">Strength<RollDie tone="solid" /></span>
    </div>
    <input class="circle-input" type="text" readonly value="45" />
  </div>
</div>
