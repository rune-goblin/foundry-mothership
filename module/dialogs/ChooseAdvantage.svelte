<script>
  import { localize } from '../i18n.ts';

  // The three roll-type buttons are the dialog's own footer, so all this window holds is what a
  // condition has to say about the roll and the line asking for a choice. `die` names what is
  // about to be rolled: legacy said "1d20" to every table it opened for (audit F2).
  //
  // No <style> block: `condition-modifier` is the dialog shell tier's, and ChooseSkill writes the
  // same line from its own markup — one writer of two, so a scoped block would style half of it.
  let { note = '', die = '' } = $props();
</script>

{#if note}
  <div class="macro_prompt condition-modifier">{note}</div>
{/if}
<div class="macro_prompt">
  {localize('Mothership.SelectYourRollType')}{die ? ` — ${die}` : ''}:
</div>
