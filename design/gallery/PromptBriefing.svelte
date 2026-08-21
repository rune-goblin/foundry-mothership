<script module>
  export const meta = {
    group: 'Dialog bodies',
    title: 'Prompt — a briefing, and a message',
    path: 'module/dialogs/Prompt.svelte',
    width: 600,
    note: 'Two windows with nothing to choose. Gaining Stress puts the amount on the buttons, so the body is only the briefing that explains them — `intro` is our own lang string and carries the book’s emphasis as markup. The ammunition prompt has less to say than that: its heading is the whole window.',
  };
</script>

<script>
  import Prompt from '../../module/dialogs/Prompt.svelte';
  import { asset } from '../../module/chat/cards.ts';
  import { localize } from '../../module/i18n.ts';
</script>

<div class="mothership macro-popup-dialog">
  <Prompt
    image={asset('images/icons/ui/macros/gain_stress.png')}
    heading={localize('Mothership.GainStress')}
    intro={localize('Mothership.WhatGainingStressIs')}
  />
  <Prompt heading={localize('Mothership.OutOfAmmoNeedReload')} />
</div>
