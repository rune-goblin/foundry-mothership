<script>
  import { localize } from '../i18n.ts';

  // No <style> block: `condition-modifier` is the dialog shell tier's, and ChooseSkill writes the
  // same line from its own markup — a scoped block here would style only half of it.
  let { note = '', die = '' } = $props();
</script>

{#if note}
  <div class="macro_prompt condition-modifier">{note}</div>
{/if}
<div class="macro_prompt">
  {localize('Mothership.SelectYourRollType')}{die ? ` — ${die}` : ''}:
</div>
