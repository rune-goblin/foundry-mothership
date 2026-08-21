<script module>
  export const meta = {
    group: 'Windows',
    title: 'Wizard',
    path: 'module/ui/generator/Wizard.svelte',
    // The shell mounts one pane at a time, so this specimen is the whole family — none of these
    // panes is reachable on its own.
    covers: [
      'module/ui/generator/WizardRail.svelte',
      'module/ui/generator/WizardNav.svelte',
      'module/ui/generator/panes/IntroPane.svelte',
      'module/ui/generator/panes/RollsPane.svelte',
      'module/ui/generator/panes/ClassPane.svelte',
      'module/ui/generator/panes/AdjustmentsPane.svelte',
      'module/ui/generator/panes/HealthPane.svelte',
      'module/ui/generator/panes/SkillsPane.svelte',
      'module/ui/generator/panes/GearPane.svelte',
      'module/ui/generator/panes/FinishPane.svelte',
    ],
    wide: true,
    standIn: 'The class list, which comes from a compendium scan, and the loadout tables it draws from. The draft is the real `CharacterDraft` and the dice are real — click a d20 to roll.',
    note: 'The character generator as the book presents it: one numbered step at a time, the PSG’s own prose above the controls that answer it, and a rail showing what is left. `STEPS` in steps.js is the spine the window walks — the shell draws the frame around every step, and a pane draws only the answer it collects.',
  };
</script>

<script>
  import Wizard from '../../module/ui/generator/Wizard.svelte';
  import { CharacterDraft } from '../../module/ui/generator/draft.svelte.js';
  import { pickPhrases } from '../../module/ui/generator/picks.js';
  import { say } from './fixtures.js';

  const STATS = ['strength', 'speed', 'intellect', 'combat'];

  // `granted` arrives already named — the pane never sees the UUIDs a class stores.
  const skills = (granted, picks = {}, groups = []) => ({
    granted,
    picks: pickPhrases(picks),
    groups: groups.map((group) => group.map(([name, counts]) => ({ name, picks: pickPhrases(counts) }))),
  });

  const EITHER_OR = [['1 Expert Skill', { expert: 1 }], ['2 Trained Skills', { trained: 2 }]];

  const draft = new CharacterDraft({ name: 'Rook Vance', items: [] });

  // The class pane only draws once a scan has run, and the gallery has no compendium to scan —
  // these are the four PSG classes as `loadClasses` flattens them.
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
      skills: skills(['Linguistics', 'Computers', 'Mathematics'], {}, [EITHER_OR]),
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
      skills: skills(['Military Training', 'Athletics'], {}, [EITHER_OR]),
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
      skills: skills([], { master_full_set: 1, trained: 1 }),
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
      skills: skills(['Industrial Equipment', 'Zero-G'], { trained: 1, expert: 1 }),
    },
  ];

  // A half-answered Scientist: stats rolled but the choice left unspent — the state the rail gates on.
  draft.rolled = { ...draft.rolled, strength: 44, speed: 40, intellect: 31, combat: 35 };
  draft.className = 'Scientist';
  draft.classUuid = 'Design.scientist';
  draft.traumaResponse = 'Whenever you fail a Sanity Save, all Close friendly players gain 1 Stress.';
  draft.bonus = { ...draft.bonus, intellect: 10, sanity: 30 };
  draft.statChoices = [{ modification: 5, stats: STATS, chosen: null }];
</script>

<Wizard {draft} oncreated={say('close generator')} onstep={say('step')} />
