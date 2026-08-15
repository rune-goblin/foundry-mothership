<script module>
  export const meta = {
    group: 'Dialog bodies',
    title: 'WoundTable',
    path: 'module/dialogs/WoundTable.svelte',
    width: 600,
    note: 'The radio group holds the table; the roll-type buttons are the dialog’s own footer.',
  };
</script>

<script>
  import WoundTable from '../../module/dialogs/WoundTable.svelte';
  import { asset } from '../../module/chat/cards.ts';
  import { localize } from '../../module/i18n.ts';
  import { say } from './fixtures.js';

  // `WOUND_ICONS` is private to prompts.ts; these are the five keys and files it names.
  const ICONS = {
    bleeding: 'wounds_bleeding.png',
    'blunt-force': 'wounds_blunt_force.png',
    'fire-explosives': 'wounds_fire_&_explosives.png',
    'gore-massive': 'wounds_gore_&_massive.png',
    gunshot: 'wounds_gunshot.png',
  };

  const tables = Object.entries(ICONS).map(([key, icon]) => ({
    key,
    label: localize(`Mothership.Table.${key}`),
    img: asset(`images/icons/ui/rolltables/${icon}`),
  }));
</script>

<div class="mothership macro-popup-dialog">
  <WoundTable
    image={asset('images/icons/ui/macros/wound_roll.png')}
    heading={localize('Mothership.WoundRoll')}
    body={localize('Mothership.WhatAWoundRollIs')}
    {tables}
    value="blunt-force"
    onchange={say('wound table')}
  />
</div>
