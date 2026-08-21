<script module>
  export const meta = {
    group: 'Primitives',
    title: 'PipTrack',
    path: 'module/ui/parts/PipTrack.svelte',
    note: 'N pips, the first `value` of them filled — a solid glyph for a filled pip and an outline for an empty one. The track lays out its own row. Its one reader is a condition’s treatment.',
  };
</script>

<script>
  import PipTrack from '../../module/ui/parts/PipTrack.svelte';
</script>

<p class="ds-caption">Treatment — the condition sheet's, three pips</p>
<PipTrack count={3} value={1} />

<p class="ds-caption">Empty, and full</p>
<PipTrack count={5} value={0} />
<PipTrack count={5} value={5} />
