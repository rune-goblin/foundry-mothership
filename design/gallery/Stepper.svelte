<script module>
  export const meta = {
    group: 'Primitives',
    title: 'Stepper',
    path: 'module/ui/parts/Stepper.svelte',
    note: 'A count with a minus and a plus on either side of it, 8px apart. It replaces the row cell that stepped on left-click and un-stepped on right-click — a control nothing on screen announced. `onstep` is handed the delta, and the buttons switch themselves off at `min`/`max`; the titles are built from the `label`, so the control names what it counts. Its reader is a weapon’s clips.',
  };
</script>

<script>
  import Stepper from '../../module/ui/parts/Stepper.svelte';
  import ItemList from '../../module/ui/parts/ItemList.svelte';
  import ItemRow from '../../module/ui/parts/ItemRow.svelte';
  import ItemCell from '../../module/ui/parts/ItemCell.svelte';
  import { say } from './fixtures.js';

  let clips = $state(7);
</script>

<p class="ds-caption">In the weapons row, where it counts clips</p>
<ItemList>
  <ItemRow itemId="demo">
    <ItemCell variant="name" die grow={2} roll onclick={say('rolled the weapon')}>SMG</ItemCell>
    <ItemCell grow={1}>2d10</ItemCell>
    <ItemCell grow={1}>
      <Stepper value={clips} label="Clips" min={0} onstep={(delta) => (clips += delta)} />
    </ItemCell>
    <ItemCell grow={1}>Close</ItemCell>
  </ItemRow>
</ItemList>

<p class="ds-caption">At its floor, and at its ceiling — the button that would pass the bound is off</p>
<Stepper value={0} label="Clips" min={0} onstep={say('stepped')} />
<Stepper value={6} label="Shots" min={0} max={6} onstep={say('stepped')} />
