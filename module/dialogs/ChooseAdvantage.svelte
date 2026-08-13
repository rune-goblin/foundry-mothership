<script>
  import { localize } from '../i18n.ts';

  // The three roll-type buttons are the dialog's own footer, so all this window holds is what a
  // condition has to say about the roll and the line asking for a choice. `die` names what is
  // about to be rolled: legacy said "1d20" to every table it opened for (audit F2).
  let { note = '', die = '' } = $props();
</script>

{#if note}
  <div class="macro_prompt condition-modifier">{note}</div>
{/if}
<div class="macro_prompt">
  {localize('Mosh.SelectYourRollType')}{die ? ` — ${die}` : ''}:
</div>
