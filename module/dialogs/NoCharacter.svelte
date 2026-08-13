<script>
  import { localize } from '../i18n.ts';

  // What to do about it depends on where macros are pointed, so the caller passes the setting's
  // current value rather than this window reading it.
  let { target } = $props();

  const EXPLANATION = {
    character: 'Mosh.Errors.NoCharacterSelected',
    token: 'Mosh.Errors.NoTokenSelected',
  };
</script>

<h3>{localize('Mosh.Errors.NoCharacterTitle')}</h3>
<div class="macro_prompt">{localize(EXPLANATION[target] ?? EXPLANATION.character)}</div>
