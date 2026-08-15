<script module>
  export const meta = {
    group: 'Dialog bodies',
    title: 'Cover',
    path: 'module/dialogs/Cover.svelte',
    width: 600,
    note: 'The radio group holds the choice; `value` is the cover the actor is already behind. Each option shows what its bonus would do to the armour bar, in orange.',
  };
</script>

<script>
  import Cover from '../../module/dialogs/Cover.svelte';
  import { COVER_KEYS } from '../../module/rules.ts';
  import { localize } from '../../module/i18n.ts';
  import { say } from './fixtures.js';

  const LABELS = {
    none: ['Mothership.NoCover', 'Mothership.UnprotectedOutInTheOpen'],
    insignificant: ['Mothership.InsignificantCover', 'Mothership.WoodFurnitureDoorsShields'],
    light: ['Mothership.LightCover', 'Mothership.TreesBulkheadWallMetalFurniture'],
    heavy: ['Mothership.HeavyCover', 'Mothership.AirlockDoorsCementBeamsShips'],
  };

  const options = COVER_KEYS.map((key) => ({
    key,
    label: localize(LABELS[key][0]),
    examples: localize(LABELS[key][1]),
  }));
</script>

<div class="mothership macro-popup-dialog">
  <Cover {options} armorPoints={7} damageReduction={0} value="light" onchange={say('cover')} />
</div>
