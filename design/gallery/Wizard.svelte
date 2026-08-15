<script module>
  export const meta = {
    group: 'Windows',
    title: 'Wizard',
    path: 'module/ui/generator/Wizard.svelte',
    wide: true,
    standIn: 'The class list, which comes from a compendium scan, and the loadout tables it draws from. The draft is the real `CharacterDraft` and the dice are real — click a d20 to roll.',
    note: 'The character generator as the book presents it: one numbered step at a time, the PSG’s own prose above the controls that answer it, and a rail showing what is left. `PANES` in steps.js is the spine the window walks.',
  };
</script>

<script>
  import Wizard from '../../module/ui/generator/Wizard.svelte';
  import { CharacterDraft } from '../../module/ui/generator/draft.svelte.js';
  import { say } from './fixtures.js';

  const draft = new CharacterDraft({ name: 'Rook Vance', items: [] });
</script>

<Wizard {draft} close={say('close generator')} />
