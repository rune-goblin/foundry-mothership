<script>
  // The fork in the road a new character reaches: walk the PSG's nine steps, or start on a blank
  // sheet. The buttons are the answer, so this component holds no state.
  import { localize } from '../i18n.ts';
</script>

<h3>{localize('Mothership.CharacterGenerator.NewCharacter.Title')}</h3>

<style>
  @layer system {
    :global(.mothership) {
      --new-character-heading-text: var(--text-primary);
    }

    h3 {
      color: var(--new-character-heading-text);
    }
  }
</style>
