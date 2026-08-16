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

  const STATS = ['strength', 'speed', 'intellect', 'combat'];

  const draft = new CharacterDraft({ name: 'Rook Vance', items: [] });

  // The class pane only draws once a scan has run, and the gallery has no compendium to scan. These
  // are the four PSG classes as `loadClasses` flattens them, so the cards and the choice beneath
  // them are the real markup over stand-in rows.
  draft.classOptions = [
    {
      uuid: 'Design.android',
      name: 'Android',
      img: 'icons/svg/clockwork.svg',
      source: 'mothershiprpg',
      adjustments: [
        { key: 'intellect', value: 20 },
        { key: 'fear', value: 60 },
        { key: 'max_wounds', value: 1 },
      ],
      choices: [{ modification: -10, stats: STATS }],
    },
    {
      uuid: 'Design.marine',
      name: 'Marine',
      img: 'icons/svg/sword.svg',
      source: 'mothershiprpg',
      adjustments: [
        { key: 'combat', value: 10 },
        { key: 'fear', value: 20 },
        { key: 'body', value: 10 },
        { key: 'max_wounds', value: 1 },
      ],
      choices: [],
    },
    {
      uuid: 'Design.scientist',
      name: 'Scientist',
      img: 'icons/svg/pill.svg',
      source: 'mothershiprpg',
      adjustments: [
        { key: 'intellect', value: 10 },
        { key: 'sanity', value: 30 },
      ],
      choices: [{ modification: 5, stats: STATS }],
    },
    {
      uuid: 'Design.teamster',
      name: 'Teamster',
      img: 'icons/svg/barrel.svg',
      source: 'mothershiprpg',
      adjustments: [
        { key: 'strength', value: 5 },
        { key: 'speed', value: 5 },
        { key: 'intellect', value: 5 },
        { key: 'combat', value: 5 },
        { key: 'sanity', value: 10 },
        { key: 'fear', value: 10 },
        { key: 'body', value: 10 },
      ],
      choices: [],
    },
  ];

  // A half-answered Scientist: the stats are rolled, so the dropdown can show the arithmetic each
  // pick would do, and the choice itself is left unspent — the state the rail gates on.
  draft.rolled = { ...draft.rolled, strength: 44, speed: 40, intellect: 31, combat: 35 };
  draft.className = 'Scientist';
  draft.classUuid = 'Design.scientist';
  draft.traumaResponse = 'Whenever you fail a Sanity Save, all Close friendly players gain 1 Stress.';
  draft.bonus = { ...draft.bonus, intellect: 10, sanity: 30 };
  draft.statChoices = [{ modification: 5, stats: STATS, chosen: null }];
</script>

<Wizard {draft} close={say('close generator')} />
