<script>
  // The fork in the road a new character reaches: walk the PSG's nine steps, or start on a blank
  // sheet. The buttons are the answer, so this component holds no state — it explains the two.
  //
  // No <style> block: `macro_prompt` carries no rule at all — it is structure the shell tier
  // leaves alone and test/dialogs.test.ts locates by.
  import { localize } from '../i18n.ts';
</script>

<h3>{localize('Mothership.CharacterGenerator.NewCharacter.Title')}</h3>
<div class="macro_prompt">{localize('Mothership.CharacterGenerator.NewCharacter.Text')}</div>
