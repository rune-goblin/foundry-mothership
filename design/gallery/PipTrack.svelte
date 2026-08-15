<script module>
  export const meta = {
    group: 'Primitives',
    title: 'PipTrack',
    path: 'module/ui/parts/PipTrack.svelte',
    note: 'N pips, the first `value` of them filled. One element per pip in one of four states — `filled` and `milestone`, each saying only what it changes: the fill and the stroke. The track lays out its own row, and a milestone caption is centred under its pip by transform, so a milestone is a label and nothing else.',
  };
</script>

<script>
  import PipTrack from '../../module/ui/parts/PipTrack.svelte';
  import { XP_PIPS, XP_MILESTONES } from '../../module/rules.ts';
  import { localize } from '../../module/i18n.ts';

  const milestones = Object.fromEntries(
    Object.entries(XP_MILESTONES).map(([pip, key]) => [pip, localize(key)]),
  );

  // One pip each, so the states sit beside their names rather than under them — a caption is
  // centred on its pip, and four captions on four adjacent pips would overlap.
  const STATES = [
    { label: 'empty', value: 0, milestone: false },
    { label: 'filled', value: 1, milestone: false },
    { label: 'milestone', value: 0, milestone: true },
    { label: 'milestone + filled', value: 1, milestone: true },
  ];
</script>

<p class="ds-caption">The four states</p>
<dl class="ds-states">
  {#each STATES as state (state.label)}
    <dt><PipTrack count={1} value={state.value} milestones={state.milestone ? { 1: '' } : {}} /></dt>
    <dd>{state.label}</dd>
  {/each}
</dl>

<p class="ds-caption">XP track — the character sheet's, in its frame</p>
<div class="skill_training_frame">
  <PipTrack count={XP_PIPS} value={7} {milestones} />
</div>

<p class="ds-caption">Treatment — the plain variant</p>
<PipTrack count={5} value={2} />

<p class="ds-caption">The icon variant</p>
<PipTrack count={5} value={3} variant="icon" />
