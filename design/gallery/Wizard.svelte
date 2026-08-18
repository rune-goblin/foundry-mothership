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
  // are the four PSG classes as `loadClasses` flattens them, so the chooser and selected detail
  // panel are the real markup over stand-in rows.
  draft.classOptions = [
    {
      uuid: 'Design.android',
      name: 'Android',
      img: '/systems/mothershiprpg/images/class_icons/android.png',
      source: 'mothershiprpg',
      description: 'Androids are a terrifying and exciting addition to any crew. They tend to unnerve other crewmembers with their cold inhumanity.',
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
      img: '/systems/mothershiprpg/images/class_icons/marine.png',
      source: 'mothershiprpg',
      description: 'Marines are handy in a fight, but whenever they Panic it may cause problems for the rest of the crew.',
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
      img: '/systems/mothershiprpg/images/class_icons/scientist.png',
      source: 'mothershiprpg',
      description: 'Scientists are doctors, researchers, or anyone who wants to slice open creatures (or infected crewmembers) with a scalpel.',
      adjustments: [
        { key: 'intellect', value: 10 },
        { key: 'sanity', value: 30 },
      ],
      choices: [{ modification: 5, stats: STATS }],
    },
    {
      uuid: 'Design.teamster',
      name: 'Teamster',
      img: '/systems/mothershiprpg/images/class_icons/teamster.png',
      source: 'mothershiprpg',
      description: 'Teamsters are rough and tumble blue-collar space workers, mechanics, engineers, miners, and pilots.',
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
