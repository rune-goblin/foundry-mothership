<script module>
  export const meta = {
    group: 'Windows',
    title: 'Generator',
    path: 'module/ui/generator/Generator.svelte',
    width: 800,
    standIn: 'The class list, which comes from a compendium scan, and the loadout tables it draws from. The draft is the real `CharacterDraft` and the dice are real — click a d20 to roll.',
    note: 'The character generator on one page: every roll, every choice and the save, with the draft store holding the answer until FINISH.',
  };
</script>

<script>
  import Generator from '../../module/ui/generator/Generator.svelte';
  import { CharacterDraft } from '../../module/ui/generator/draft.svelte.js';
  import { say } from './fixtures.js';

  const draft = new CharacterDraft({ name: 'Rook Vance', items: [] });
</script>

<Generator {draft} close={say('close generator')} />
