<script module>
  export const meta = {
    group: 'Dialog bodies',
    title: 'Amount',
    path: 'module/dialogs/Amount.svelte',
    width: 600,
    note: 'The amount is the button, so this window is only the briefing that explains the choice. `body` is our own lang string and carries the book’s emphasis as markup.',
  };
</script>

<script>
  import Amount from '../../module/dialogs/Amount.svelte';
  import { asset } from '../../module/chat/cards.ts';
  import { localize } from '../../module/i18n.ts';
</script>

<div class="mothership macro-popup-dialog">
  <Amount
    image={asset('images/icons/ui/macros/gain_stress.png')}
    heading={localize('Mothership.GainStress')}
    body={localize('Mothership.WhatGainingStressIs')}
    prompt="{localize('Mothership.SelectYourModification')}:"
  />
</div>
