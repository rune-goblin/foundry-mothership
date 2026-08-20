<script>
  import { localize } from '../i18n.ts';

  // No <style> block: `macro_prompt` carries no CSS rule — test/dialogs.test.ts locates the
  // window by it.
  let { target } = $props();

  const EXPLANATION = {
    character: 'Mothership.Errors.NoCharacterSelected',
    token: 'Mothership.Errors.NoTokenSelected',
  };
</script>

<h3>{localize('Mothership.Errors.NoCharacterTitle')}</h3>
<div class="macro_prompt">{localize(EXPLANATION[target] ?? EXPLANATION.character)}</div>
