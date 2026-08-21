<script module>
  export const meta = {
    group: 'Dialog bodies',
    title: 'Prompt — which roll type',
    path: 'module/dialogs/Prompt.svelte',
    width: 600,
    note: 'The window every roll opens on when nothing else is left to ask. The three roll-type buttons are the dialog’s own footer, stood up as the rail, so all this holds is the head: what a roll type buys, what a condition has to say about the roll, and the die about to be thrown — legacy said “1d20” to every table it opened for.',
  };
</script>

<script>
  import Prompt from '../../module/dialogs/Prompt.svelte';
  import { localize } from '../../module/i18n.ts';
  import RailFrame from './RailFrame.svelte';

  const buttons = [
    { action: 'none', label: localize('Mothership.Normal'), icon: 'roll-mark' },
    { action: 'advantage', label: localize('Mothership.Advantage'), icon: 'roll-mark roll-mark-advantage' },
    {
      action: 'disadvantage',
      label: localize('Mothership.Disadvantage'),
      icon: 'roll-mark roll-mark-disadvantage',
      class: 'condition-preselect',
      default: true,
    },
  ];
</script>

<RailFrame {buttons}>
  <Prompt
    heading={localize('Mothership.SelectYourRollType')}
    intro={localize('Mothership.WhatARollTypeBuys')}
    note="Phobia: Fear Save [-]"
    readout={{ label: localize('Mothership.Rolling'), value: '1d100' }}
  />
</RailFrame>
